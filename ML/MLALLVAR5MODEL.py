# -*- coding: utf-8 -*-
import os, glob, re, unicodedata, warnings
warnings.filterwarnings("ignore")

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

from sklearn.linear_model import Ridge
from sklearn.ensemble import RandomForestRegressor
from xgboost import XGBRegressor
from lightgbm import LGBMRegressor
from catboost import CatBoostRegressor

from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.preprocessing import LabelEncoder

# ===========================
# 0) 기본 설정
# ===========================
SEED = 42
TEST_RATIO = 0.2

# ===========================
# 1) CSV 자동 탐색
# ===========================
csv_files = glob.glob("*.csv")
if not csv_files:
    raise FileNotFoundError("⚠️ CSV 파일이 없습니다.")

csv_files = [(f, os.path.getsize(f)) for f in csv_files]
csv_files.sort(key=lambda x: x[1], reverse=True)
CSV_PATH = csv_files[0][0]
print(f"[자동선택] CSV 파일: {CSV_PATH} ({csv_files[0][1]/1024/1024:.2f} MB)")

# ===========================
# 2) 데이터 로드 & 컬럼 매핑
# ===========================
df = pd.read_csv(CSV_PATH)

def normalize_col(s: str) -> str:
    s = unicodedata.normalize("NFC", str(s))
    s = s.replace("㎡", "m2").replace("²", "2")
    s = s.strip().lower()
    s = re.sub(r"\s+", "", s)
    s = re.sub(r"[()\[\]{}]", "", s)
    s = s.replace("/", "").replace("-", "").replace(".", "").replace(",", "")
    return s

def pick_col(df_cols, include_keywords, exclude_keywords=None):
    exclude_keywords = exclude_keywords or []
    norm_map = {col: normalize_col(col) for col in df_cols}
    for col, norm in norm_map.items():
        if any(ex in norm for ex in exclude_keywords):
            continue
        if any(inc in norm for inc in include_keywords):
            return col
    return None

PRICE_INCL = ["거래금액만원", "거래금액", "실거래가", "매매금액", "금액"]
PRICE_EXCL = ["보증금", "월세", "전세", "관리비"]
AREA_INCL  = ["전용면적m2", "전용면적", "면적"]
FLOOR_INCL = ["층"]
DATE_INCL  = ["거래일자", "계약일자", "신고일"]
DATE_EXCL  = ["조회연월", "조회일"]

price_col = pick_col(df.columns, PRICE_INCL, PRICE_EXCL)
area_col  = pick_col(df.columns, AREA_INCL)
floor_col = pick_col(df.columns, FLOOR_INCL)
date_col  = pick_col(df.columns, DATE_INCL, DATE_EXCL)

# ===========================
# 3) 전처리
# ===========================
df[price_col] = (
    df[price_col].astype(str)
                  .str.replace(",", "", regex=False)
                  .str.replace(" ", "", regex=False)
)
df = df[df[price_col].str.match(r"^\d+$", na=False)]
df[price_col] = df[price_col].astype(np.int64)

df[area_col] = pd.to_numeric(df[area_col], errors="coerce")
df[floor_col] = pd.to_numeric(df[floor_col], errors="coerce")
df[date_col] = pd.to_datetime(df[date_col], errors="coerce")

df = df.dropna(subset=[price_col, area_col, floor_col, date_col]).copy()
df["year"] = df[date_col].dt.year.astype(int)
df["month"] = df[date_col].dt.month.astype(int)
df["연식"] = df["year"] - pd.to_numeric(df["건축년도"], errors="coerce")

# 범주형 처리
cat_features = ["시군구명", "법정동", "아파트명"]
for col in cat_features:
    if col in df.columns:
        le = LabelEncoder()
        df[col] = le.fit_transform(df[col].astype(str))
    else:
        df[col] = 0

features = [area_col, floor_col, "연식", "year", "month"] + cat_features
X = df[features]
y = df[price_col]

# ===========================
# 4) Train/Test Split (시간순)
# ===========================
df_sorted = df.sort_values(by=date_col)
split_idx = int(len(df_sorted) * (1 - TEST_RATIO))
train_idx, test_idx = df_sorted.index[:split_idx], df_sorted.index[split_idx:]

X_train, X_test = X.loc[train_idx], X.loc[test_idx]
y_train, y_test = y.loc[train_idx], y.loc[test_idx]

print(f"[분할] Train={len(X_train):,} / Test={len(X_test):,}")

# ===========================
# 5) 모델 학습 & 평가
# ===========================
models = {
    "Ridge": Ridge(alpha=1.0),
    "RandomForest": RandomForestRegressor(n_estimators=200, random_state=SEED, n_jobs=-1),
    "XGBoost": XGBRegressor(n_estimators=500, learning_rate=0.05, max_depth=6,
                            n_jobs=-1, random_state=SEED),
    "LightGBM": LGBMRegressor(n_estimators=600, learning_rate=0.05,
                              random_state=SEED, n_jobs=-1),
    "CatBoost": CatBoostRegressor(iterations=500, depth=6, learning_rate=0.05,
                                  random_state=SEED, verbose=0)
}

results = {}

for name, model in models.items():
    try:
        model.fit(X_train, y_train)
        y_pred = model.predict(X_test)

        mae = mean_absolute_error(y_test, y_pred)
        mse = mean_squared_error(y_test, y_pred)
        rmse = np.sqrt(mse)
        mape = np.mean(np.abs((y_test - y_pred) / y_test)) * 100
        r2 = r2_score(y_test, y_pred)

        results[name] = {"MAE": mae, "RMSE": rmse, "MAPE": mape, "R2": r2}

    except Exception as e:
        print(f"[{name} 실패] {e}")

# ===========================
# 6) 결과 표
# ===========================
results_df = pd.DataFrame(results).T
results_df = results_df[["MAE", "RMSE", "MAPE", "R2"]]
print("\n=== 모델 비교 결과 ===")
print(results_df)

# ===========================
# 7) 그래프
# ===========================
fig, axes = plt.subplots(1, 3, figsize=(18, 5))

axes[0].bar(results_df.index, results_df["MAE"], color="skyblue")
axes[0].set_title("MAE (작을수록 좋음)")
axes[0].set_ylabel("만원")

axes[1].bar(results_df.index, results_df["RMSE"], color="orange")
axes[1].set_title("RMSE (작을수록 좋음)")
axes[1].set_ylabel("만원")

axes[2].bar(results_df.index, results_df["R2"], color="green")
axes[2].set_title("R² (클수록 좋음)")
axes[2].set_ylabel("Score")

plt.tight_layout()
plt.savefig("model_comparison.png")
plt.close()

print("\n📊 비교 그래프 저장: model_comparison.png")