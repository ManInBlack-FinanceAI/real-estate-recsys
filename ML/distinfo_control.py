# -*- coding: utf-8 -*-
"""
aptlist_3_7.csv → (카카오 로컬 기반 POI/거리/개수 부착 + 상세 진행 로그) → aptlist_3_8.csv

추가 컬럼:
- 최단지하철역, 역거리, 역도보시간
- 버스정류장수, 병원거리, 마트수, 편의점수, 공원개수, 고속도로거리
- lat/lon 보정(없으면 주소/아파트명으로 지오코딩)

실행 전:
  export KAKAO_REST_API_KEY='YOUR_KEY'
필수: pip install pandas requests numpy
"""

import os, time, math, requests, pandas as pd, numpy as np
from typing import Dict, List, Tuple, Optional, Set

# =============== CONFIG ===============
KAKAO_REST_API_KEY = "e715edeb45ff79fd60b2e29ece5ee241"
INPUT_CSV  = "aptlist_3_7.csv"
OUTPUT_CSV = "aptlist_3_8.csv"

# 반경(m)
RADIUS_STATION = 20000
RADIUS_BUS = 750
RADIUS_HOSPITAL = 850
RADIUS_MARKET = 900
RADIUS_CONVENIENCE = 500
RADIUS_GRASS = 800
RADIUS_IC = 5000

# 타일 분할(45 cap 회피)
TILE_M_COARSE = 900

# 요청 제어
REQ_SLEEP   = 0.04     # 요청 간 대기(초)
MAX_RETRIES = 3
TIMEOUT     = 10

# 로그
VERBOSE   = True
LOG_EVERY = 10         # N행마다 진행 로그 출력

# Kakao endpoints
ADDR_URL = "https://dapi.kakao.com/v2/local/search/address.json"
KW_URL   = "https://dapi.kakao.com/v2/local/search/keyword.json"
CAT_URL  = "https://dapi.kakao.com/v2/local/search/category.json"
HEADERS  = {"Authorization": f"KakaoAK {KAKAO_REST_API_KEY}"}

# 그룹코드 & 키워드
CAT_SUBWAY, CAT_BUS = "SW8", "SW8"
CAT_HOSPITAL, CAT_MARKET, CAT_CONVENIENCE = "HP8", "MT1", "CS2"
KW_GRASS = ["공원", "하천", "녹지", "수변공원"]
KW_IC    = ["인터체인지", "고속도로 IC", "나들목"]

SESSION = requests.Session()

# =============== 전역 카운터(로그용) ===============
STAT = {
    "http_ok": 0, "http_err": 0, "retry": 0, "rate": 0,
    "geocode_addr": 0, "geocode_kw": 0, "geocode_fail": 0,
    "poi_calls": {"subway":0, "bus":0, "hospital":0, "market":0, "conv":0, "grass":0, "ic":0}
}

# =============== 간단 로거 ===============
def log(msg: str):
    if VERBOSE:
        print(msg, flush=True)

# =============== HTTP utils ===============
def http_get(url: str, params: Dict) -> Optional[dict]:
    for a in range(1, MAX_RETRIES + 1):
        try:
            r = SESSION.get(url, headers=HEADERS, params=params, timeout=TIMEOUT)
            if r.status_code == 200:
                STAT["http_ok"] += 1
                return r.json()
            # 과다요청/서버오류 → 백오프
            if r.status_code in (429, 500, 502, 503, 504):
                STAT["retry"] += 1
                time.sleep(0.4 * a)
            else:
                STAT["http_err"] += 1
                return None
        except requests.RequestException:
            STAT["http_err"] += 1
            time.sleep(0.4 * a)
    return None

# =============== Geo helpers ===============
def meters_to_deg(lat: float, mx: float, my: float) -> Tuple[float, float]:
    latr = math.radians(lat)
    return mx/(111320.0*max(math.cos(latr),1e-8)), my/111320.0

def rects_2x2(lat: float, lon: float, radius_m: int, tile_m: int) -> List[Tuple[float,float,float,float]]:
    dlon_half, dlat_half = meters_to_deg(lat, radius_m, radius_m)
    min_lon, max_lon = lon - dlon_half, lon + dlon_half
    min_lat, max_lat = lat - dlat_half, lat + dlat_half
    mid_lon, mid_lat = (min_lon+max_lon)/2.0, (min_lat+max_lat)/2.0
    return [
        (min_lon, mid_lat, mid_lon, max_lat),
        (mid_lon, mid_lat, max_lon, max_lat),
        (min_lon, min_lat, mid_lon, mid_lat),
        (mid_lon, min_lat, max_lon, mid_lat),
    ]

# =============== Geocoding ===============
def geocode_address(addr: str) -> Optional[Tuple[float,float]]:
    if not addr: return None
    data = http_get(ADDR_URL, {"query": addr, "page":1, "size":10})
    time.sleep(REQ_SLEEP)
    if not data or not data.get("documents"): return None
    d0 = data["documents"][0]
    ra = d0.get("road_address")
    if ra and "x" in ra:
        STAT["geocode_addr"] += 1
        return float(ra["y"]), float(ra["x"])
    a = d0.get("address")
    if a and "x" in a:
        STAT["geocode_addr"] += 1
        return float(a["y"]), float(a["x"])
    return None

def geocode_fallback_keyword(keyword: str) -> Optional[Tuple[float,float]]:
    if not keyword: return None
    data = http_get(KW_URL, {"query": keyword, "page":1, "size":15, "sort":"accuracy"})
    time.sleep(REQ_SLEEP)
    if not data or not data.get("documents"): return None
    d0 = data["documents"][0]
    STAT["geocode_kw"] += 1
    return float(d0.get("y")), float(d0.get("x"))

def build_address_candidates(row: dict) -> List[str]:
    cands: List[str] = []
    for key in ["도로명주소", "법정주소", "지번주소"]:
        v = str(row.get(key, "")).strip()
        if v and v.lower() != "nan":
            cands.append(v)
    gu = str(row.get("자치구", "")).strip()
    dong = str(row.get("법정동", "")).strip()
    apt = str(row.get("아파트명", "")).strip()
    combo1 = " ".join([x for x in [row.get("시도",""), gu, dong, apt] if x])
    combo2 = " ".join([x for x in [row.get("시도",""), gu, dong] if x])
    for c in (combo1, combo2):
        if c and c not in cands:
            cands.append(c)
    # 중복 제거
    out, seen = [], set()
    for c in cands:
        if c not in seen:
            seen.add(c); out.append(c)
    return out

# =============== Category helpers ===============
def _collect_all_docs_rect(url: str, params: Dict, lat: float, lon: float, radius_m: int) -> List[dict]:
    docs: List[dict] = []
    for rect in rects_2x2(lat, lon, radius_m, TILE_M_COARSE):
        lx, ly, rx, ry = rect
        p = dict(params)
        p.pop("x", None); p.pop("y", None); p.pop("radius", None)
        p["rect"] = f"{lx},{ly},{rx},{ry}"
        p["page"] = 1
        while True:
            d = http_get(url, p); time.sleep(REQ_SLEEP)
            if not d or not d.get("documents"): break
            docs.extend(d["documents"])
            if d.get("meta",{}).get("is_end", True): break
            p["page"] += 1
    return docs

def category_count_and_min(lat: float, lon: float, radius_m: int, code: str) -> Tuple[int, Optional[float]]:
    params = {"category_group_code": code, "x":lon, "y":lat, "radius":radius_m, "size":15, "page":1, "sort":"distance"}
    data = http_get(CAT_URL, params); time.sleep(REQ_SLEEP)
    if not data: return 0, None
    meta = data.get("meta", {})
    tot = int(meta.get("total_count", 0))
    min_m = None
    if data.get("documents"):
        d0 = data["documents"][0]
        ds = d0.get("distance", "")
        try: min_m = float(ds) if ds != "" else None
        except: min_m = None
    if tot < 45:
        return tot, min_m
    docs = _collect_all_docs_rect(CAT_URL, params, lat, lon, radius_m)
    ids: Set[str] = set()
    for doc in docs:
        pid = doc.get("id") or f"{doc.get('place_name','')}|{doc.get('road_address_name','')}"
        ids.add(pid)
        ds = doc.get("distance", "")
        try:
            val = float(ds) if ds != "" else None
            if val is not None:
                min_m = val if min_m is None else min(min_m, val)
        except:
            pass
    return len(ids) if ids else tot, min_m

def keyword_count_and_min(lat: float, lon: float, radius_m: int, keywords: List[str]) -> Tuple[int, Optional[float]]:
    total = 0
    min_m = None
    capped = False
    for kw in keywords:
        p = {"query": kw, "x":lon, "y":lat, "radius":radius_m, "size":15, "page":1, "sort":"distance"}
        d = http_get(KW_URL, p); time.sleep(REQ_SLEEP)
        if not d: continue
        t = int(d.get("meta", {}).get("total_count", 0))
        total += t
        if t >= 45: capped = True
        if d.get("documents"):
            ds = d["documents"][0].get("distance", "")
            try:
                val = float(ds) if ds != "" else None
                if val is not None:
                    min_m = val if min_m is None else min(min_m, val)
            except: pass
    if not capped:
        return total, min_m
    ids: Set[str] = set()
    for kw in keywords:
        for rect in rects_2x2(lat, lon, radius_m, TILE_M_COARSE):
            lx, ly, rx, ry = rect
            p = {"query": kw, "rect": f"{lx},{ly},{rx},{ry}", "size":15, "page":1}
            while True:
                d = http_get(KW_URL, p); time.sleep(REQ_SLEEP)
                if not d or not d.get("documents"): break
                for doc in d["documents"]:
                    pid = doc.get("id") or f"{doc.get('place_name','')}|{doc.get('road_address_name','')}"
                    ids.add(pid)
                    ds = doc.get("distance", "")
                    try:
                        val = float(ds) if ds != "" else None
                        if val is not None:
                            min_m = val if min_m is None else min(min_m, val)
                    except: pass
                if d.get("meta",{}).get("is_end", True): break
                p["page"] += 1
    return len(ids), min_m

def nearest_ic_distance(lat: float, lon: float, radius_m: int) -> Optional[float]:
    best = None
    for kw in KW_IC:
        p = {"query": kw, "x":lon, "y":lat, "radius":radius_m, "size":15, "page":1, "sort":"distance"}
        d = http_get(KW_URL, p); time.sleep(REQ_SLEEP)
        if not d or not d.get("documents"): continue
        ds = d["documents"][0].get("distance", "")
        try:
            val = float(ds) if ds != "" else None
            if val is not None: best = val if best is None else min(best, val)
        except: pass
    return best

# =============== Feature builders ===============
def nearest_subway(lat: float, lon: float) -> Tuple[Optional[str], Optional[float], Optional[float]]:
    STAT["poi_calls"]["subway"] += 1
    p = {"category_group_code": CAT_SUBWAY, "x":lon, "y":lat, "radius":RADIUS_STATION,
         "size":1, "page":1, "sort":"distance"}
    d = http_get(CAT_URL, p); time.sleep(REQ_SLEEP)
    if not d or not d.get("documents"):
        return None, None, None
    doc = d["documents"][0]
    name = doc.get("place_name")
    dist = None
    try: dist = float(doc.get("distance",""))
    except: pass
    walk = round(dist/70.0, 1) if (dist is not None) else None
    return name, dist, walk

# =============== Per-row enrichment ===============
def enrich_row(row: dict):
    # 좌표 확보
    lon = row.get("경도"); lat = row.get("위도")
    try: lon = float(lon)
    except: lon = None
    try: lat = float(lat)
    except: lat = None

    geocode_used = None
    if lat is None or lon is None or (isinstance(lat, float) and np.isnan(lat)) or (isinstance(lon, float) and np.isnan(lon)):
        for addr in build_address_candidates(row):
            coord = geocode_address(addr)
            if coord:
                lat, lon = coord; geocode_used = f"addr:{addr}"; break
        if (lat is None or lon is None) and row.get("아파트명"):
            gu = str(row.get("자치구","")).strip()
            dong = str(row.get("법정동","")).strip()
            for kw in [f"{gu} {dong} {row.get('아파트명')}".strip(), f"{gu} {dong}".strip(), row.get("아파트명")]:
                coord = geocode_fallback_keyword(kw)
                if coord:
                    lat, lon = coord; geocode_used = f"kw:{kw}"; break
        if geocode_used is None:
            STAT["geocode_fail"] += 1

    feats = {
        "최단지하철역": None, "역거리": np.nan, "역도보시간": np.nan,
        "버스정류장수": np.nan, "병원거리": np.nan, "마트수": np.nan,
        "편의점수": np.nan, "공원개수": np.nan, "고속도로거리": np.nan
    }

    if lat is None or lon is None:
        return None, None, feats, geocode_used

    # 지하철
    try:
        name, dist, walk = nearest_subway(lat, lon)
        feats["최단지하철역"] = name
        feats["역거리"] = dist
        feats["역도보시간"] = walk
    except Exception as e:
        log(f"[WARN] subway: {e}")

    # 카테고리 호출 카운트
    try:
        STAT["poi_calls"]["bus"] += 1
        c, _ = category_count_and_min(lat, lon, RADIUS_BUS, CAT_BUS)
        feats["버스정류장수"] = c
    except Exception as e:
        log(f"[WARN] bus: {e}")

    try:
        STAT["poi_calls"]["hospital"] += 1
        _, m = category_count_and_min(lat, lon, RADIUS_HOSPITAL, CAT_HOSPITAL)
        feats["병원거리"] = m
    except Exception as e:
        log(f"[WARN] hospital: {e}")

    try:
        STAT["poi_calls"]["market"] += 1
        c, _ = category_count_and_min(lat, lon, RADIUS_MARKET, CAT_MARKET)
        feats["마트수"] = c
    except Exception as e:
        log(f"[WARN] market: {e}")

    try:
        STAT["poi_calls"]["conv"] += 1
        c, _ = category_count_and_min(lat, lon, RADIUS_CONVENIENCE, CAT_CONVENIENCE)
        feats["편의점수"] = c
    except Exception as e:
        log(f"[WARN] convenience: {e}")

    try:
        STAT["poi_calls"]["grass"] += 1
        c, _ = keyword_count_and_min(lat, lon, RADIUS_GRASS, KW_GRASS)
        feats["공원개수"] = c
    except Exception as e:
        log(f"[WARN] grass: {e}")

    try:
        STAT["poi_calls"]["ic"] += 1
        m = nearest_ic_distance(lat, lon, RADIUS_IC)
        feats["고속도로거리"] = m
    except Exception as e:
        log(f"[WARN] ic: {e}")

    return lat, lon, feats, geocode_used

# =============== Main ===============
def check_kakao_key():
    if not KAKAO_REST_API_KEY:
        raise RuntimeError("KAKAO_REST_API_KEY가 비어있습니다. 환경변수로 설정하세요.")
    r = SESSION.get(ADDR_URL, headers=HEADERS, params={"query":"서울특별시 중구 세종대로 110"}, timeout=10)
    if r.status_code != 200:
        raise RuntimeError(f"Kakao 키/네트워크 문제: HTTP {r.status_code} - {r.text[:200]}")

def main():
    check_kakao_key()

    # CSV 읽기 (인코딩 탐색)
    df = None
    for enc in (None, "utf-8-sig", "cp949"):
        try:
            df = pd.read_csv(INPUT_CSV, encoding=enc) if enc else pd.read_csv(INPUT_CSV)
            break
        except Exception:
            continue
    if df is None:
        raise RuntimeError(f"CSV 읽기 실패: {INPUT_CSV}")

    # 보조 lat/lon 컬럼
    if "lat" not in df.columns: df["lat"] = np.nan
    if "lon" not in df.columns: df["lon"] = np.nan

    n = len(df)
    start = time.time()
    last_log_t = start
    success_rows = 0

    log(f"[START] rows={n}  file={INPUT_CSV}")
    for idx, row in df.iterrows():
        lat, lon, feats, geo_used = enrich_row(row.to_dict())

        if lat is not None and lon is not None:
            df.at[idx, "lat"] = lat; df.at[idx, "lon"] = lon
            if "위도" in df.columns: df.at[idx, "위도"] = lat
            if "경도" in df.columns: df.at[idx, "경도"] = lon

        for k, v in feats.items():
            df.at[idx, k] = v

        success_rows += 1

        # 진행 로그
        if (idx+1) % LOG_EVERY == 0 or (idx+1) == n:
            now = time.time()
            elapsed = now - start
            avg_s = elapsed / max(idx+1, 1)
            eta_s = avg_s * (n - (idx+1))
            gu = str(row.get("자치구", ""))[:6]
            dong = str(row.get("법정동", ""))[:6]
            apt = str(row.get("아파트명", ""))[:12]
            src = geo_used if geo_used else "coord:orig"
            log(
                f"[{idx+1:>5}/{n}] {gu}/{dong}/{apt}  |  avg {avg_s:.2f}s/row  "
                f"ETA {eta_s/60:.1f}m  |  geos: addr={STAT['geocode_addr']}, kw={STAT['geocode_kw']}, fail={STAT['geocode_fail']}  "
                f"| http ok={STAT['http_ok']} err={STAT['http_err']} retry={STAT['retry']}  | src={src}"
            )
            last_log_t = now

    df.to_csv(OUTPUT_CSV, index=False, encoding="utf-8-sig")
    total_t = time.time() - start

    # 요약 로그
    log("\n========== SUMMARY ==========")
    log(f"Rows         : {n}")
    log(f"Elapsed      : {total_t/60:.1f}m  (avg {total_t/max(n,1):.2f}s/row)")
    log(f"HTTP         : ok={STAT['http_ok']}, err={STAT['http_err']}, retry={STAT['retry']}")
    log(f"Geocode      : addr={STAT['geocode_addr']}, kw={STAT['geocode_kw']}, fail={STAT['geocode_fail']}")
    log(f"POI calls    : {STAT['poi_calls']}")
    log(f"Saved        : {OUTPUT_CSV}")
    log("================================\n")

if __name__ == "__main__":
    main()