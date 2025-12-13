import time
from pathlib import Path

import numpy as np
import pandas as pd

from sklearn.model_selection import train_test_split
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder
from sklearn.pipeline import Pipeline
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

from sklearn.ensemble import RandomForestRegressor

from joblib import dump


# =====================================
# 0. 경로 세팅
# =====================================
BASE_DIR = Path(__file__).resolve().parent
SRE_PATH = BASE_DIR / "SRE_final.csv"
APTLIST_PATH = BASE_DIR / "aptlist_final.csv"


def load_data():
    print(f"[INFO] Loading SRE from: {SRE_PATH}")
    print(f"[INFO] Loading aptlist from: {APTLIST_PATH}")

    sre = pd.read_csv(SRE_PATH, encoding="utf-8-sig")
    aptlist = pd.read_csv(APTLIST_PATH, encoding="utf-8-sig")

    print("[INFO] SRE shape    :", sre.shape)
    print("[INFO] aptlist shape:", aptlist.shape)

    return sre, aptlist


def prepare_features(sre: pd.DataFrame, aptlist: pd.DataFrame):
    """타깃/피처 분리 및 공통 컬럼 정리"""
    target_col = "거래금액(만원)"

    if target_col not in sre.columns:
        raise ValueError(f"[ERROR] '{target_col}' 컬럼이 SRE_final.csv에 없습니다.")

    y = sre[target_col]

    # 모델에 사용하지 않을 컬럼들 (날짜/주소 등)
    cols_to_drop = [
        target_col,
        "조회연월",
        "거래일자",
        "거래년",
        "거래월",
        "거래일",
        "도로명주소",
        "지번주소",
        "도로명주소_원본",
        "주소변환메모",
    ]
    cols_to_drop = [c for c in cols_to_drop if c in sre.columns]

    X = sre.drop(columns=cols_to_drop)

    # aptlist와 공통으로 있는 컬럼만 사용
    common_cols = [c for c in X.columns if c in aptlist.columns]
    print("[INFO] 사용 Feature 수:", len(common_cols))

    X = X[common_cols].copy()
    aptlist_X = aptlist[common_cols].copy()

    return X, y, aptlist_X, common_cols


def split_data_random(X, y, test_size=0.2, random_state=42):
    """랜덤 80/20 분할"""
    X_train, X_valid, y_train, y_valid = train_test_split(
        X,
        y,
        test_size=test_size,
        random_state=random_state,
        shuffle=True,
    )

    print(f"[INFO] Train size: {X_train.shape}, Valid size: {X_valid.shape}")
    return X_train, X_valid, y_train, y_valid


def build_preprocessor(X_train: pd.DataFrame):
    """범주형 OneHot + 나머지 수치형 패스. NaN도 여기서 처리."""
    # 범주형/수치형 컬럼 구분
    cat_cols = X_train.select_dtypes(include=["object"]).columns.tolist()
    num_cols = [c for c in X_train.columns if c not in cat_cols]

    print("[INFO] 범주형 피처:", cat_cols)
    print("[INFO] 수치형 피처:", num_cols)

    # 전처리: 범주형 → 원-핫 (dense 출력), 나머지는 그대로 통과
    try:
        # scikit-learn 1.2 이상
        ohe = OneHotEncoder(
            handle_unknown="ignore",
            sparse_output=False,
        )
    except TypeError:
        # scikit-le련 1.1 이하 호환
        ohe = OneHotEncoder(
            handle_unknown="ignore",
            sparse=False,
        )

    preprocessor = ColumnTransformer(
        transformers=[
            ("cat", ohe, cat_cols),
        ],
        remainder="passthrough",
        sparse_threshold=0.0,  # 항상 dense 형식 유지
    )

    return preprocessor, cat_cols, num_cols


def fill_na_inplace(df: pd.DataFrame, cat_cols, num_cols, num_medians=None):
    """결측치 간단 처리 (범주형: 'missing', 수치형: 중앙값)."""
    # 범주형
    for c in cat_cols:
        if c in df.columns:
            df[c] = df[c].fillna("missing")

    # 수치형: 중앙값 사용 (num_medians가 주어지면 그걸 사용)
    if num_medians is None:
        num_medians = {}
        for c in num_cols:
            if c in df.columns:
                num_medians[c] = df[c].median()

    for c in num_cols:
        if c in df.columns:
            df[c] = df[c].fillna(num_medians.get(c, df[c].median()))

    return num_medians


def get_shallow_models():
    """1차: RandomForest만 돌리는 모델 세트."""
    models = {
        "RandomForest": RandomForestRegressor(
            n_estimators=200,
            max_depth=None,
            min_samples_leaf=2,
            n_jobs=-1,
            random_state=42,
        ),
    }
    return models


def evaluate_models(X_train, X_valid, y_train, y_valid, preprocessor):
    models = get_shallow_models()

    results = []
    best_rmse = np.inf
    best_name = None
    best_pipeline = None

    for name, model in models.items():
        print(f"\n====================\n[TRAIN] {name}\n====================")
        start = time.time()

        pipe = Pipeline(
            steps=[
                ("preprocess", preprocessor),
                ("model", model),
            ]
        )

        pipe.fit(X_train, y_train)
        preds = pipe.predict(X_valid)

        mae = mean_absolute_error(y_valid, preds)
        rmse = np.sqrt(mean_squared_error(y_valid, preds))
        r2 = r2_score(y_valid, preds)
        elapsed = time.time() - start

        print(f"{name} MAE : {mae:,.2f}")
        print(f"{name} RMSE: {rmse:,.2f}")
        print(f"{name} R^2 : {r2:,.4f}")
        print(f"{name} Time: {elapsed:,.1f} sec")

        results.append({
            "model": name,
            "MAE": mae,
            "RMSE": rmse,
            "R2": r2,
            "time_sec": elapsed,
        })

        if rmse < best_rmse:
            best_rmse = rmse
            best_name = name
            best_pipeline = pipe

    results_df = pd.DataFrame(results).sort_values("RMSE").reset_index(drop=True)
    print("\n=== Model Comparison (sorted by RMSE) ===")
    print(results_df)

    results_df.to_csv(BASE_DIR / "model_comparison_results.csv", index=False, encoding="utf-8-sig")
    print("[INFO] Saved model_comparison_results.csv")

    return best_name, best_pipeline, results_df


def get_deep_model(name: str):
    """선택된 모델을 더 깊게(느리게) 돌릴 설정."""
    if name == "RandomForest":
        # 처음 4개 모델 비교 때 사용했던 RF와 동일한 세팅
        return RandomForestRegressor(
            n_estimators=200,
            max_depth=None,
            min_samples_leaf=2,
            n_jobs=-1,
            random_state=42,
        )
    elif name == "XGB":
        return xgb.XGBRegressor(
            n_estimators=800,
            max_depth=10,
            learning_rate=0.03,
            subsample=0.8,
            colsample_bytree=0.8,
            objective="reg:squarederror",
            tree_method="hist",
            n_jobs=-1,
            random_state=42,
        )
    elif name == "HGB":
        return HistGradientBoostingRegressor(
            max_depth=10,
            max_leaf_nodes=128,
            learning_rate=0.03,
            min_samples_leaf=10,
            l2_regularization=0.5,
            random_state=42,
        )
    elif name == "LGBM":
        return lgb.LGBMRegressor(
            n_estimators=1000,
            num_leaves=128,
            max_depth=-1,
            learning_rate=0.03,
            subsample=0.8,
            colsample_bytree=0.8,
            objective="regression",
            n_jobs=-1,
            random_state=42,
        )
    else:
        raise ValueError(f"[ERROR] Unknown model name for deep training: {name}")


def train_deep_and_predict(best_name, preprocessor, X_full, y_full, aptlist_X, aptlist_raw):
    """베스트 모델을 전체 데이터로 깊게 학습 → aptlist 가격 예측 + 모델 저장."""
    print(f"\n[INFO] Deep training best model on FULL data: {best_name}")

    # 결측치 처리: full 기준으로 중앙값 계산해서 aptlist에도 동일 적용
    cat_cols = X_full.select_dtypes(include=["object"]).columns.tolist()
    num_cols = [c for c in X_full.columns if c not in cat_cols]

    num_medians = fill_na_inplace(X_full, cat_cols, num_cols, num_medians=None)
    fill_na_inplace(aptlist_X, cat_cols, num_cols, num_medians=num_medians)

    model_deep = get_deep_model(best_name)

    pipe_deep = Pipeline(
        steps=[
            ("preprocess", preprocessor),
            ("model", model_deep),
        ]
    )

    start = time.time()
    pipe_deep.fit(X_full, y_full)
    elapsed = time.time() - start
    print(f"[INFO] Deep training done in {elapsed:,.1f} sec")

    # 모델 저장
    model_path = BASE_DIR / f"best_model_{best_name}_deep.joblib"
    dump(pipe_deep, model_path)
    print(f"[INFO] Saved deep model to: {model_path}")

    # aptlist 예측
    preds = pipe_deep.predict(aptlist_X)
    aptlist_raw = aptlist_raw.copy()
    aptlist_raw["예측_거래금액(만원)"] = preds

    out_path = BASE_DIR / "aptlist_with_pred_price.csv"
    aptlist_raw.to_csv(out_path, index=False, encoding="utf-8-sig")
    print(f"[INFO] Saved aptlist predictions to: {out_path}")


def main():
    sre, aptlist = load_data()

    X, y, aptlist_X, common_cols = prepare_features(sre, aptlist)

    # 1차 분할 (랜덤 80/20)
    X_train, X_valid, y_train, y_valid = split_data_random(X, y)

    # 결측치 처리 (train/valid 기준) + 전처리기 구성
    cat_cols = X_train.select_dtypes(include=["object"]).columns.tolist()
    num_cols = [c for c in X_train.columns if c not in cat_cols]

    num_medians = fill_na_inplace(X_train, cat_cols, num_cols, num_medians=None)
    fill_na_inplace(X_valid, cat_cols, num_cols, num_medians=num_medians)

    preprocessor, _, _ = build_preprocessor(X_train)

    # 1차: 같은 세팅의 RandomForest만 비교 (지표 확인용)
    best_name, best_pipe, results_df = evaluate_models(
        X_train, X_valid, y_train, y_valid, preprocessor
    )

    print(f"\n[INFO] Best model from shallow comparison: {best_name}")

    # 2차: 선택된 모델로 전체 데이터 깊게 학습 + aptlist 예측 및 저장
    train_deep_and_predict(best_name, preprocessor, X, y, aptlist_X, aptlist)


if __name__ == "__main__":
    main()
