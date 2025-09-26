# -*- coding: utf-8 -*-
# MLTEST.py - 서울 아파트 실거래가 예측 (통계지표 확장 버전)

import os, glob, re, unicodedata, warnings
warnings.filterwarnings("ignore")

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

from sklearn.metrics import (
    mean_absolute_error, mean_squared_error, median_absolute_error,
    r2_score, explained_variance_score
)
from sklearn.ensemble import RandomForestRegressor

SEED = 42
TEST_RATIO = 0.2
MAX_SCATTER_POINTS = 5000

# ===========================
# 0) CSV 자동 탐색
# ===========================
csv_files = glob.glob("*.csv")
if not csv_files:
    raise FileNotFoundError("⚠️ 현재 폴더에서 CSV 파일을 찾지 못했습니다.")

csv_files = [(f, os.path.getsize(f)) for f in csv_files]
csv_files.sort(key=lambda x: x[1], reverse=True)
CSV_PATH = csv_files[0][0]
print(f"[자동선택] CSV 파일: {CSV_PATH} ({csv_files[0][1]/1024/1024:.2f} MB)")

# ===========================
# 1) 컬럼명 정규화 + 자동 매핑
# ===========================
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

# ===========================
# 2) 데이터 로드 & 컬럼 매핑
# ===========================
df = pd.read_csv(CSV_PATH)
orig_cols = df.columns.tolist()

PRICE_INCL = ["거래금액만원", "거래금액", "실거래가", "매매금액", "금액"]
PRICE_EXCL = ["보증금", "월세", "전세", "관리비"]
AREA_INCL  = ["전용면적m2", "전용면적", "면적"]
FLOOR_INCL = ["층"]
DATE_INCL  = ["거래일자", "계약일자", "신고일", "접수일"]
DATE_EXCL  = ["조회연월", "조회일"]

price_col = pick_col(orig_cols, PRICE_INCL, PRICE_EXCL)
area_col  = pick_col(orig_cols, AREA_INCL)
floor_col = pick_col(orig_cols, FLOOR_INCL)
date_col  = pick_col(orig_cols, DATE_INCL, DATE_EXCL)

if not all([price_col, area_col, floor_col, date_col]):
    print("\n[에러] 필요한 컬럼을 찾지 못했습니다.")
    print("원본 컬럼:", orig_cols)
    raise SystemExit(1)

print("\n[컬럼 매핑]")
print(f"가격 : {price_col}")
print(f"면적 : {area_col}")
print(f"층   : {floor_col}")
print(f"날짜 : {date_col}")

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

features = [area_col, floor_col, "year", "month"]
X = df[features]
y = df[price_col]

# ===========================
# 4) 시간순 분할
# ===========================
df_sorted = df.sort_values(by=date_col)
split_idx = int(len(df_sorted) * (1 - TEST_RATIO))
train_idx, test_idx = df_sorted.index[:split_idx], df_sorted.index[split_idx:]

X_train, X_test = X.loc[train_idx], X.loc[test_idx]
y_train, y_test = y.loc[train_idx], y.loc[test_idx]

print(f"\n[분할] Train={len(X_train):,} / Test={len(X_test):,}")

# ===========================
# 5) 모델 학습 & 지표 계산 함수
# ===========================
results, preds = {}, {}

def adjusted_r2(y_true, y_pred, n, k):
    r2 = r2_score(y_true, y_pred)
    return 1 - (1-r2)*(n-1)/(n-k-1)

def evaluate_and_store(model_name, y_true, y_pred, n_features):
    mae = mean_absolute_error(y_true, y_pred)
    mse = mean_squared_error(y_true, y_pred)
    rmse = np.sqrt(mse)
    mape = np.mean(np.abs((y_true - y_pred) / y_true)) * 100
    medae = median_absolute_error(y_true, y_pred)
    r2 = r2_score(y_true, y_pred)
    adj_r2 = adjusted_r2(y_true, y_pred, len(y_true), n_features)
    evs = explained_variance_score(y_true, y_pred)

    results[model_name] = {
        "MAE": mae, "MSE": mse, "RMSE": rmse, "MAPE": mape,
        "MedAE": medae, "R2": r2, "Adj_R2": adj_r2, "EVS": evs
    }
    preds[model_name] = y_pred

# RandomForest
rf = RandomForestRegressor(n_estimators=200, random_state=SEED, n_jobs=-1)
rf.fit(X_train, y_train)
evaluate_and_store("RandomForest", y_test, rf.predict(X_test), X_train.shape[1])

# XGBoost
try:
    from xgboost import XGBRegressor
    xgb = XGBRegressor(n_estimators=500, learning_rate=0.05, max_depth=6,
                       random_state=SEED, n_jobs=-1)
    xgb.fit(X_train, y_train)
    evaluate_and_store("XGBoost", y_test, xgb.predict(X_test), X_train.shape[1])
except Exception as e:
    print("\n[XGBoost 건너뜀]", e)

# LightGBM
try:
    from lightgbm import LGBMRegressor
    lgb = LGBMRegressor(n_estimators=600, learning_rate=0.05,
                        random_state=SEED, n_jobs=-1)
    lgb.fit(X_train, y_train)
    evaluate_and_store("LightGBM", y_test, lgb.predict(X_test), X_train.shape[1])
except Exception as e:
    print("\n[LightGBM 건너뜀]", e)

# ===========================
# 6) 성능 출력
# ===========================
print("\n=== 성능 비교 결과 ===")
for m, s in results.items():
    print(f"\n[{m}]")
    print(f" MAE   = {s['MAE']:.2f}")
    print(f" MSE   = {s['MSE']:.2f}")
    print(f" RMSE  = {s['RMSE']:.2f}")
    print(f" MAPE  = {s['MAPE']:.2f}%")
    print(f" MedAE = {s['MedAE']:.2f}")
    print(f" R²    = {s['R2']:.4f}")
    print(f" Adj R²= {s['Adj_R2']:.4f}")
    print(f" EVS   = {s['EVS']:.4f}")