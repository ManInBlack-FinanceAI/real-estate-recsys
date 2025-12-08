"""
cpu.py

SRE_final.csv를 이용해 아파트 거래금액을 예측하는 CPU 전용 머신러닝 파이프라인.

- 시계열 8:2 train/valid 분할 (거래일자 기준)
- 층을 저층(1~10), 중층(11~20), 고층(21층 이상)으로 그룹화하여 사용
- CPU로 학습하는 두 개의 모델만 사용:
    - RandomForestRegressor (RF)
    - HistGradientBoostingRegressor (HGB)
- 로그 타깃 변환(log1p)을 사용하여 안정적인 학습 후 다시 원래 스케일로 평가
- 각 모델 성능(MAE, RMSE, R2)을 출력 및 CSV 저장
- 학습된 모델은 joblib으로 개별 저장
"""

import os
import json
from typing import Dict, List, Tuple, Optional

import numpy as np
import pandas as pd

from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder
from sklearn.impute import SimpleImputer
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

from sklearn.ensemble import RandomForestRegressor, HistGradientBoostingRegressor

import joblib

# ==========================
# 0. 설정값
# ==========================

INPUT_CSV = "SRE_final.csv"

# 타깃 / 날짜 / 층 후보 컬럼명 (데이터에 맞게 자동 탐색)
TARGET_CANDIDATES = ["거래금액(만원)", "거래금액", "price", "target"]
DATE_CANDIDATES = ["거래일자", "계약일자", "계약일", "date", "transaction_date"]
FLOOR_CANDIDATES = ["층", "floor", "층수"]

# 시계열 기준 train/valid 비율
TRAIN_RATIO = 0.8

# 로그 변환 사용 여부
USE_LOG_TARGET = True

RESULTS_CSV = "cpu_results.csv"
MODEL_DIR = "models_cpu"

# 실행할 모델 목록 (CPU 전용)
MODELS_TO_RUN = ["RF", "HGB"]


# ==========================
# 1. 유틸 함수들
# ==========================

def find_first_existing_column(df: pd.DataFrame, candidates: List[str]) -> Optional[str]:
    """DataFrame에서 후보 컬럼명 중 첫 번째로 존재하는 컬럼을 반환."""
    for col in candidates:
        if col in df.columns:
            return col
    return None


def make_floor_group(df: pd.DataFrame, floor_col: str) -> pd.Series:
    """
    층(floor) 컬럼으로부터 저층/중층/고층 그룹을 만든다.
    - 1~10: low
    - 11~20: mid
    - 21 이상: high
    그 외(결측/0/음수)는 'unknown'
    """
    floor = pd.to_numeric(df[floor_col], errors="coerce")

    def _group(x: float) -> str:
        if pd.isna(x) or x <= 0:
            return "unknown"
        if 1 <= x <= 10:
            return "low"
        if 11 <= x <= 20:
            return "mid"
        if x >= 21:
            return "high"
        return "unknown"

    return floor.map(_group).astype("category")


def add_basic_features(df: pd.DataFrame, date_col: Optional[str]) -> pd.DataFrame:
    """
    부동산 데이터에서 자주 쓰는 기본 파생변수 생성.

    - 거래일자로부터 연도, 월, 분기, 계절
    - 건축연차(거래연도 - 건축년도)
    """
    df = df.copy()

    # 날짜 파생변수
    if date_col is not None and date_col in df.columns:
        df[date_col] = pd.to_datetime(df[date_col], errors="coerce")

        df["year"] = df[date_col].dt.year
        df["month"] = df[date_col].dt.month
        df["quarter"] = df[date_col].dt.quarter

        # 계절: 3~5:봄, 6~8:여름, 9~11:가을, 나머지:겨울 (숫자 코드로)
        def _season(m: float) -> int:
            if pd.isna(m):
                return -1
            m = int(m)
            if 3 <= m <= 5:
                return 0  # 봄
            if 6 <= m <= 8:
                return 1  # 여름
            if 9 <= m <= 11:
                return 2  # 가을
            return 3  # 겨울 (12, 1, 2)

        df["season"] = df["month"].map(_season)

        # 건축연차: 거래연도 - 건축년도
        if "건축년도" in df.columns:
            df["건축년도"] = pd.to_numeric(df["건축년도"], errors="coerce")
            df["건축연차"] = df["year"] - df["건축년도"]
        else:
            df["건축연차"] = np.nan
    else:
        df["year"] = np.nan
        df["month"] = np.nan
        df["quarter"] = np.nan
        df["season"] = np.nan
        df["건축연차"] = np.nan

    return df


def build_preprocessor(
    df: pd.DataFrame,
) -> Tuple[ColumnTransformer, List[str], List[str]]:
    """
    자동으로 수치형/범주형 컬럼을 나눠서 ColumnTransformer 생성.

    - 명백한 id성/주소성 컬럼은 제거.
    """
    drop_like = [
        "Unnamed: 0",
        "index",
        "도로명",
        "지번",
        "도로명주소",
        "지번주소",
        "도로명주소_원본",
        "주소변환메모",
        "주소변환성공",
    ]

    feature_cols = [c for c in df.columns if c not in drop_like]

    numeric_cols: List[str] = []
    categorical_cols: List[str] = []

    for col in feature_cols:
        if pd.api.types.is_numeric_dtype(df[col]):
            numeric_cols.append(col)
        else:
            categorical_cols.append(col)

    # 수치형: 결측치 median
    numeric_transformer = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="median")),
        ]
    )

    # 범주형: 결측치 most_frequent + 원-핫인코딩
    categorical_transformer = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="most_frequent")),
            ("onehot", OneHotEncoder(handle_unknown="ignore")),
        ]
    )

    preprocessor = ColumnTransformer(
        transformers=[
            ("num", numeric_transformer, numeric_cols),
            ("cat", categorical_transformer, categorical_cols),
        ],
        remainder="drop",
    )

    return preprocessor, numeric_cols, categorical_cols


def get_models() -> Dict[str, object]:
    """
    CPU 전용 모델 세트 (RF / HGB).

    - RF: 속도와 성능을 절충한 설정
    - HGB: 비교적 깊고 충분한 반복 수로 세팅
    """
    models: Dict[str, object] = {}

    # RandomForest: 속도와 안정성을 절충한 기본 설정
    # - max_features / max_samples 같은 버전별 이슈 가능성이 있는 옵션은 제거
    # - 트리 개수와 깊이만 조정해서 과도한 계산량만 줄여줌
    models["RF"] = RandomForestRegressor(
        n_estimators=400,          # 트리 개수: 속도/성능 절충
        max_depth=20,              # 너무 깊어지지 않게 제한
        min_samples_split=2,
        min_samples_leaf=1,
        n_jobs=-1,                 # CPU 전체 사용 (발열 신경 쓰이면 4 정도로 줄여도 됨)
        random_state=42,
    )

    # HistGradientBoosting: 반복 횟수와 깊이를 적당히 크게
    models["HGB"] = HistGradientBoostingRegressor(
        max_iter=600,
        learning_rate=0.05,
        max_depth=10,
        l2_regularization=0.1,
        random_state=42,
    )

    return models


def evaluate_predictions(
    y_true: np.ndarray,
    y_pred: np.ndarray,
) -> Dict[str, float]:
    """MAE / RMSE / R2 계산."""
    mae = mean_absolute_error(y_true, y_pred)
    rmse = mean_squared_error(y_true, y_pred, squared=False)
    r2 = r2_score(y_true, y_pred)

    return {"MAE": mae, "RMSE": rmse, "R2": r2}


# ==========================
# 2. 메인 파이프라인
# ==========================

def main():
    # --------------------------
    # 2-1. 데이터 로드
    # --------------------------
    if not os.path.exists(INPUT_CSV):
        raise FileNotFoundError(f"{INPUT_CSV} 파일을 찾을 수 없습니다.")

    print(f"[INFO] 데이터 로드: {INPUT_CSV}")
    df = pd.read_csv(INPUT_CSV)
    print(f"[INFO] 원본 데이터 크기: {df.shape}")

    # --------------------------
    # 2-2. 타깃 / 날짜 / 층 컬럼 확인
    # --------------------------
    target_col = find_first_existing_column(df, TARGET_CANDIDATES)
    if target_col is None:
        raise ValueError(f"타깃 컬럼을 찾지 못했습니다. 후보: {TARGET_CANDIDATES}")

    date_col = find_first_existing_column(df, DATE_CANDIDATES)
    floor_col = find_first_existing_column(df, FLOOR_CANDIDATES)

    print(f"[INFO] 사용 타깃 컬럼: {target_col}")
    print(f"[INFO] 사용 날짜 컬럼: {date_col}")
    print(f"[INFO] 사용 층 컬럼: {floor_col}")

    # --------------------------
    # 2-3. 기본 파생변수 및 층 그룹 생성
    # --------------------------
    df = add_basic_features(df, date_col=date_col)

    # 층 그룹(저층/중층/고층)
    if floor_col is not None:
        df["층_그룹"] = make_floor_group(df, floor_col=floor_col)
        print("[INFO] '층_그룹' 컬럼 생성 완료 (low/mid/high/unknown)")
    else:
        print("[WARN] 층 관련 컬럼을 찾지 못했습니다. 층 그룹 파생변수는 생성하지 않습니다.")

    # --------------------------
    # 2-4. 타깃 전처리 (로그 변환)
    # --------------------------
    df[target_col] = pd.to_numeric(df[target_col], errors="coerce")

    before = len(df)
    df = df.dropna(subset=[target_col]).reset_index(drop=True)
    after = len(df)
    print(f"[INFO] 타깃 결측 제거: {before} -> {after} 행")

    # 날짜 기준 정렬 (시계열 분할을 위해)
    if date_col is not None and date_col in df.columns:
        df = df.sort_values(by=date_col).reset_index(drop=True)
        print("[INFO] 날짜 기준으로 정렬 완료")
    else:
        df = df.sort_values(by=df.index).reset_index(drop=True)
        print("[WARN] 날짜 컬럼이 없어 index 기준으로 정렬합니다.")

    y_raw = df[target_col].values.astype(float)

    if USE_LOG_TARGET:
        y = np.log1p(np.maximum(y_raw, 0))
        print("[INFO] 타깃에 log1p 변환 적용")
    else:
        y = y_raw

    # --------------------------
    # 2-5. 시계열 train/valid 분할 (8:2)
    # --------------------------
    n_total = len(df)
    n_train = int(n_total * TRAIN_RATIO)

    train_df = df.iloc[:n_train].reset_index(drop=True)
    valid_df = df.iloc[n_train:].reset_index(drop=True)

    print(f"[INFO] Train size: {len(train_df)}, Valid size: {len(valid_df)}")

    if date_col is not None and date_col in df.columns:
        train_start = train_df[date_col].min()
        train_end = train_df[date_col].max()
        valid_start = valid_df[date_col].min()
        valid_end = valid_df[date_col].max()
        print(f"[INFO] Train 기간: {train_start} ~ {train_end}")
        print(f"[INFO] Valid 기간: {valid_start} ~ {valid_end}")

    y_train = y[:n_train]
    y_valid = y[n_train:]

    # --------------------------
    # 2-6. 피처 구성
    # --------------------------
    X = df.drop(columns=[target_col])

    # 날짜 원시 컬럼은 파생변수로 대체했으므로 제거
    if date_col is not None and date_col in X.columns:
        X = X.drop(columns=[date_col])

    # 주소/원본 주소/메모/주소변환 여부 및 원시 층 컬럼 제거
    for col in [
        "도로명",
        "지번",
        "도로명주소",
        "지번주소",
        "도로명주소_원본",
        "주소변환메모",
        "주소변환성공",
        "층",
        "floor",
        "층수",
    ]:
        if col in X.columns:
            X = X.drop(columns=[col])

    X_train = X.iloc[:n_train].reset_index(drop=True)
    X_valid = X.iloc[n_train:].reset_index(drop=True)

    # --------------------------
    # 2-7. 전처리기/모델 정의
    # --------------------------
    preprocessor, num_cols, cat_cols = build_preprocessor(X_train)

    print(f"[INFO] 수치형 컬럼 수: {len(num_cols)}, 범주형 컬럼 수: {len(cat_cols)}")
    print(f"[DEBUG] 수치형 컬럼 예시: {num_cols[:10]}")
    print(f"[DEBUG] 범주형 컬럼 예시: {cat_cols[:10]}")

    models = get_models()

    results: List[Dict[str, float]] = []

    os.makedirs(MODEL_DIR, exist_ok=True)

    # --------------------------
    # 2-8. 모델 학습 및 평가
    # --------------------------
    for name, model in models.items():
        if name not in MODELS_TO_RUN:
            print(f"[SKIP] {name} 모델은 MODELS_TO_RUN 설정으로 인해 건너뜁니다.")
            continue

        print("=" * 60)
        print(f"[INFO] 모델 학습 시작: {name}")

        pipe = Pipeline(
            steps=[
                ("preprocess", preprocessor),
                ("model", model),
            ]
        )

        pipe.fit(X_train, y_train)

        y_train_pred_log = pipe.predict(X_train)
        y_valid_pred_log = pipe.predict(X_valid)

        if USE_LOG_TARGET:
            y_train_pred = np.expm1(y_train_pred_log)
            y_valid_pred = np.expm1(y_valid_pred_log)
            y_train_true = np.expm1(y_train)
            y_valid_true = np.expm1(y_valid)
        else:
            y_train_pred = y_train_pred_log
            y_valid_pred = y_valid_pred_log
            y_train_true = y_train
            y_valid_true = y_valid

        train_metrics = evaluate_predictions(y_train_true, y_train_pred)
        valid_metrics = evaluate_predictions(y_valid_true, y_valid_pred)

        print(
            f"[RESULT] {name} - Train  MAE: {train_metrics['MAE']:.4f}, "
            f"RMSE: {train_metrics['RMSE']:.4f}, R2: {train_metrics['R2']:.4f}"
        )
        print(
            f"[RESULT] {name} - Valid  MAE: {valid_metrics['MAE']:.4f}, "
            f"RMSE: {valid_metrics['RMSE']:.4f}, R2: {valid_metrics['R2']:.4f}"
        )

        row = {
            "model": name,
            "train_MAE": train_metrics["MAE"],
            "train_RMSE": train_metrics["RMSE"],
            "train_R2": train_metrics["R2"],
            "valid_MAE": valid_metrics["MAE"],
            "valid_RMSE": valid_metrics["RMSE"],
            "valid_R2": valid_metrics["R2"],
        }
        results.append(row)

        model_path = os.path.join(MODEL_DIR, f"{name}_cpu.pkl")
        joblib.dump(pipe, model_path)
        print(f"[INFO] 모델 저장 완료: {model_path}")

    # --------------------------
    # 2-9. 간단 앙상블 (단순 평균)
    # --------------------------
    if len(results) > 1:
        print("=" * 60)
        print("[INFO] 앙상블(단순 평균) 예측 계산")

        train_preds_list: List[np.ndarray] = []
        valid_preds_list: List[np.ndarray] = []

        for name in models.keys():
            if name not in MODELS_TO_RUN:
                continue

            model_path = os.path.join(MODEL_DIR, f"{name}_cpu.pkl")
            if not os.path.exists(model_path):
                continue

            pipe = joblib.load(model_path)

            y_train_pred_log = pipe.predict(X_train)
            y_valid_pred_log = pipe.predict(X_valid)

            if USE_LOG_TARGET:
                y_train_pred = np.expm1(y_train_pred_log)
                y_valid_pred = np.expm1(y_valid_pred_log)
            else:
                y_train_pred = y_train_pred_log
                y_valid_pred = y_valid_pred_log

            train_preds_list.append(y_train_pred)
            valid_preds_list.append(y_valid_pred)

        if train_preds_list and valid_preds_list:
            y_train_pred_ens = np.mean(np.column_stack(train_preds_list), axis=1)
            y_valid_pred_ens = np.mean(np.column_stack(valid_preds_list), axis=1)

            if USE_LOG_TARGET:
                y_train_true = np.expm1(y_train)
                y_valid_true = np.expm1(y_valid)
            else:
                y_train_true = y_train
                y_valid_true = y_valid

            ens_train_metrics = evaluate_predictions(y_train_true, y_train_pred_ens)
            ens_valid_metrics = evaluate_predictions(y_valid_true, y_valid_pred_ens)

            print(
                f"[RESULT] ENS  - Train MAE: {ens_train_metrics['MAE']:.4f}, "
                f"RMSE: {ens_train_metrics['RMSE']:.4f}, R2: {ens_train_metrics['R2']:.4f}"
            )
            print(
                f"[RESULT] ENS  - Valid MAE: {ens_valid_metrics['MAE']:.4f}, "
                f"RMSE: {ens_valid_metrics['RMSE']:.4f}, R2: {ens_valid_metrics['R2']:.4f}"
            )

            results.append(
                {
                    "model": "ENSEMBLE_MEAN",
                    "train_MAE": ens_train_metrics["MAE"],
                    "train_RMSE": ens_train_metrics["RMSE"],
                    "train_R2": ens_train_metrics["R2"],
                    "valid_MAE": ens_valid_metrics["MAE"],
                    "valid_RMSE": ens_valid_metrics["RMSE"],
                    "valid_R2": ens_valid_metrics["R2"],
                }
            )

    # --------------------------
    # 2-10. 결과 / 메타 저장
    # --------------------------
    results_df = pd.DataFrame(results)
    results_df.to_csv(RESULTS_CSV, index=False, encoding="utf-8-sig")
    print(f"[INFO] 결과 CSV 저장 완료: {RESULTS_CSV}")

    meta = {
        "input_csv": INPUT_CSV,
        "target_candidates": TARGET_CANDIDATES,
        "date_candidates": DATE_CANDIDATES,
        "floor_candidates": FLOOR_CANDIDATES,
        "train_ratio": TRAIN_RATIO,
        "use_log_target": USE_LOG_TARGET,
        "numeric_columns": num_cols,
        "categorical_columns": cat_cols,
        "models_to_run": MODELS_TO_RUN,
    }

    with open("cpu_meta.json", "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)

    print("[INFO] 메타 정보 저장 완료: cpu_meta.json")
    print("[DONE] cpu.py 파이프라인 실행 완료")


if __name__ == "__main__":
    main()
