# -*- coding: utf-8 -*-
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import os

from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor
from xgboost import XGBRegressor   # ✅ XGBoost 추가

# =======================================
# 1) 데이터 로드
# =======================================
# ✅ 자동 파일 탐색
csv_name = "SRE_2_2.csv"

# ✅ 인코딩 자동 탐색
try:
    df = pd.read_csv(csv_name, encoding="utf-8")
except UnicodeDecodeError:
    df = pd.read_csv(csv_name, encoding="cp949")

print(f"[INFO] Loaded {csv_name}, shape={df.shape}")

# =======================================
# 2) 타깃 설정 및 숫자형 변환
# =======================================
target_col = "거래금액(만원)"
if target_col not in df.columns:
    raise ValueError(f"'{target_col}' 컬럼이 존재하지 않습니다.")

def numify(series):
    """문자열 안의 쉼표, 공백, 단위(㎡ 등) 제거 후 float 변환"""
    return pd.to_numeric(
        series.astype(str)
              .str.replace(r"[,\s]", "", regex=True)
              .str.replace(r"[^\d\.\-\+eE]", "", regex=True),
        errors="coerce"
    )

# ✅ 거래금액 및 주요 숫자형 컬럼 변환
df[target_col] = numify(df[target_col])
for col in df.columns:
    if df[col].dtype == object and any(ch in str(df[col].iloc[0]) for ch in ["㎡", ",", "%"]):
        df[col] = numify(df[col])

# 결측치 제거
df = df.dropna(subset=[target_col])
print(f"[INFO] 유효 행 개수: {len(df)}")

# =======================================
# 3) X, y 분리 및 결측/범주형 처리
# =======================================
y = df[target_col].astype(float)
X = df.drop(columns=[target_col])

# 무한대/결측 처리
X = X.replace([np.inf, -np.inf], np.nan)

# 컬럼 분리
num_cols = X.select_dtypes(include=[np.number]).columns
cat_cols = X.select_dtypes(exclude=[np.number]).columns

# 숫자형 → 중앙값 대치
for col in num_cols:
    X[col] = X[col].fillna(X[col].median())

# 범주형 → 상위 N개 유지 후 나머지는 "기타"
TOPN_CAT = 60
for col in cat_cols:
    top_vals = X[col].value_counts().index[:TOPN_CAT]
    X[col] = np.where(X[col].isin(top_vals), X[col], "기타")
    X[col] = X[col].fillna("Unknown")

# ✅ get_dummies (희소 + dtype 최적화)
X = pd.get_dummies(X, drop_first=True, sparse=True).astype("float32")

# =======================================
# 4) 학습/테스트 분리 (8:2)
# =======================================
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)
print(f"[Train] {X_train.shape}, [Test] {X_test.shape}")

# =======================================
# 5) 모델 정의 (LR, RF, XGB)
# =======================================
models = {
    "LinearRegression": LinearRegression(),
    "RandomForest": RandomForestRegressor(
        n_estimators=300, max_depth=None, random_state=42, n_jobs=-1
    ),
    "XGBoost": XGBRegressor(
        n_estimators=300,
        learning_rate=0.05,
        max_depth=8,
        subsample=0.8,
        colsample_bytree=0.8,
        reg_lambda=1.0,
        random_state=42,
        n_jobs=-1,
        tree_method="hist"
    ),
}

# =======================================
# 6) 평가 함수
# =======================================
def evaluate(y_true, y_pred):
    mse = mean_squared_error(y_true, y_pred)
    rmse = np.sqrt(mse)
    mae = mean_absolute_error(y_true, y_pred)
    r2  = r2_score(y_true, y_pred)
    return rmse, mae, r2

# =======================================
# 7) 학습 & 평가
# =======================================
results = {}
for name, model in models.items():
    print(f"▶ {name} 학습 시작...")
    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)

    rmse, mae, r2 = evaluate(y_test, y_pred)
    results[name] = {"RMSE": rmse, "MAE": mae, "R2": r2}
    print(f"  RMSE={rmse:.3f}, MAE={mae:.3f}, R2={r2:.3f}")

# 결과 요약 저장
results_df = pd.DataFrame(results).T.sort_values("RMSE")
results_df.to_csv("model_performance.csv")
print("\n[모델 성능 요약]")
print(results_df.round(4))

# =======================================
# 8) 시각화
# =======================================
fig, ax = plt.subplots(1, 3, figsize=(18, 5))
results_df["RMSE"].plot(kind="bar", ax=ax[0], title="RMSE")
results_df["MAE"].plot(kind="bar", ax=ax[1], title="MAE")
results_df["R2"].plot(kind="bar", ax=ax[2], title="R²")

plt.tight_layout()
plt.savefig("model_performance.png", dpi=300)
plt.show()

print("\n저장 완료 ✅: model_performance.csv, model_performance.png")