import pandas as pd
import numpy as np

from sklearn.model_selection import train_test_split
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.impute import SimpleImputer

import joblib

# =========================
# 1. 데이터 로드
# =========================
data_path = "SRE_final.csv"   # <- 네가 말한 머신러닝 학습용 파일
df = pd.read_csv(data_path)

apt_path = "aptlist_final.csv"
apt_df = pd.read_csv(apt_path)

# '층'을 구간으로 나눠 저층/중층/고층 범주형으로 변경
if "층" in df.columns:
    def floor_to_group(v):
        if pd.isna(v):
            return np.nan
        try:
            f = float(v)
        except (TypeError, ValueError):
            # 이미 문자열(저층/중층/고층 등)이면 그대로 둔다
            return v
        if f <= 10:
            return "저층"
        elif f <= 20:
            return "중층"
        else:
            return "고층"

    df["층"] = df["층"].apply(floor_to_group).astype("object")

target_col = "거래금액(만원)"   # 타깃 컬럼 이름 (다르면 여기만 바꿔)

# 타깃 결측 제거
df = df.dropna(subset=[target_col])

# =========================
# 2. 타깃 / 피처 정의
# =========================
# 로그 변환 타깃
df["log_price"] = np.log1p(df[target_col])
y = df["log_price"]

drop_cols = [
    target_col,
    "log_price",
    "도로명주소",
    "지번주소",
    "도로상세주소",
    "전화번호",
    "road_key",
]

# aptlist_final과 공통으로 가지는 컬럼만 사용
apt_cols = set(apt_df.columns)

# 실제 존재하는 컬럼만 제거
drop_cols = [c for c in drop_cols if c in df.columns]

# 학습에 사용할 피처: SRE_final과 aptlist_final 양쪽에 모두 존재하고,
# 타깃/드롭 컬럼이 아닌 것만 사용
feature_cols = [
    c for c in df.columns
    if (c in apt_cols) and (c not in drop_cols) and (c != target_col)
]

print("학습/예측 공통 피처 개수:", len(feature_cols))

X = df[feature_cols]

# 숫자형 / 범주형 컬럼 자동 분리
num_cols = X.select_dtypes(include=["int64", "float64"]).columns.tolist()
cat_cols = [c for c in feature_cols if c not in num_cols]

print("사용 숫자형 피처 개수:", len(num_cols))
print("사용 범주형 피처 개수:", len(cat_cols))

# =========================
# 3. 전처리 정의 (NaN 처리 포함)
# =========================
numeric_transformer = Pipeline(steps=[
    ("imputer", SimpleImputer(strategy="median")),
    ("scaler", StandardScaler()),
])

categorical_transformer = Pipeline(steps=[
    ("imputer", SimpleImputer(strategy="most_frequent")),
    ("encoder", OneHotEncoder(handle_unknown="ignore", min_frequency=50)),
])

preprocess = ColumnTransformer(
    transformers=[
        ("num", numeric_transformer, num_cols),
        ("cat", categorical_transformer, cat_cols),
        # min_frequency=50 : 너무 희귀한 카테고리 묶어서 차원 줄이기 (메모리/속도 방지용)
    ]
)

# =========================
# 4. 랜덤 8:2 분할
# =========================
X_train, X_valid, y_train, y_valid = train_test_split(
    X,
    y,
    test_size=0.2,      # 8:2
    shuffle=True,
    random_state=42
)

print("Train shape:", X_train.shape)
print("Valid shape:", X_valid.shape)

# =========================
# 5. RF 모델 하나만
# =========================
rf = RandomForestRegressor(
    n_estimators=1200,      # 적당히 강하게, 너무 과하게는 아님
    max_depth=None,
    min_samples_leaf=4,    # 완전 리프 하나까지는 말고 조금 제어
    max_features="sqrt",
    n_jobs=-1,
    random_state=42,
)

rf_pipe = Pipeline(steps=[
    ("preprocess", preprocess),
    ("model", rf),
])

print("\n===== RandomForest 학습 시작 =====")
rf_pipe.fit(X_train, y_train)

# =========================
# 6. 검증 성능 출력 (log 기준 + 원단위 기준 둘 다)
# =========================
y_pred_valid_log = rf_pipe.predict(X_valid)

# MSE 계산 후 수동으로 sqrt -> RMSE
mse_log = mean_squared_error(y_valid, y_pred_valid_log)
rmse_log = np.sqrt(mse_log)
mae_log = mean_absolute_error(y_valid, y_pred_valid_log)
r2_log = r2_score(y_valid, y_pred_valid_log)

# 원 단위로 복원
y_valid_real = np.expm1(y_valid)
y_pred_real = np.expm1(y_pred_valid_log)

mse_real = mean_squared_error(y_valid_real, y_pred_real)
rmse_real = np.sqrt(mse_real)
mae_real = mean_absolute_error(y_valid_real, y_pred_real)
r2_real = r2_score(y_valid_real, y_pred_real)

print("\n=== 검증 성능 (log 타깃 기준) ===")
print(f"RMSE_log : {rmse_log:.4f}")
print(f"MAE_log  : {mae_log:.4f}")
print(f"R^2_log  : {r2_log:.4f}")

print("\n=== 검증 성능 (원래 거래금액 기준) ===")
print(f"RMSE 원단위 : {rmse_real:,.0f}")
print(f"MAE  원단위 : {mae_real:,.0f}")
print(f"R^2_real    : {r2_real:.4f}")

# =========================
# 7. 전체 데이터로 다시 학습 후 모델 저장
# =========================
print("\n===== 최종 RF 모델 전체 데이터로 재학습 =====")
rf_pipe.fit(X, y)

model_path = "rf_model_SRE_final.pkl"
joblib.dump(rf_pipe, model_path)
print(f"✅ RF 모델을 '{model_path}' 로 저장 완료")

# =========================
# 8. 피처 중요도 저장 (RF “식” 대신)
# =========================
# 전처리 후 피처 이름 뽑기
preprocess_fitted = rf_pipe.named_steps["preprocess"]
feature_names = preprocess_fitted.get_feature_names_out()

rf_model = rf_pipe.named_steps["model"]
importances = rf_model.feature_importances_

feat_imp = (
    pd.DataFrame({"feature": feature_names, "importance": importances})
    .sort_values("importance", ascending=False)
)

feat_imp.to_csv("rf_feature_importances_SRE_final.csv", index=False, encoding="utf-8-sig")
print("📄 피처 중요도를 'rf_feature_importances_SRE_final.csv'로 저장했습니다.")