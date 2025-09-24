# -*- coding: utf-8 -*-
import os, csv, time, math, requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

# 항상 py 파일이 있는 경로 기준으로 실행
os.chdir(os.path.dirname(os.path.abspath(__file__)))

API_KEY = "35fc1e9c87f611089e5d742742e4b68a344912a362bc55de129a13717fd49563"

# ⚠️ SSL 오류 회피: HTTP 먼저 → 실패 시 HTTPS로 폴백
BASE_URLS = [
    "http://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev",
    "https://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev",
]

# requests 세션 + 재시도/백오프
session = requests.Session()
retry = Retry(
    total=5, connect=5, read=5,
    backoff_factor=1.5,                     # 0,1.5,3,4.5, ...
    status_forcelist=[429,500,502,503,504],
    allowed_methods={"GET"},
    respect_retry_after_header=True,
)
adapter = HTTPAdapter(max_retries=retry, pool_connections=10, pool_maxsize=50)
session.mount("http://", adapter)
session.mount("https://", adapter)
TIMEOUT = (10, 60)                           # (connect, read)
HEADERS = {"Accept": "application/json", "User-Agent": "rtms-collector/2024"}

# 서울 시군구
SGG_MAP = {
    "11110":"종로구","11140":"중구","11170":"용산구","11200":"성동구","11215":"광진구",
    "11230":"동대문구","11260":"중랑구","11290":"성북구","11305":"강북구","11320":"도봉구",
    "11350":"노원구","11380":"은평구","11410":"서대문구","11440":"마포구","11470":"양천구",
    "11500":"강서구","11530":"구로구","11545":"금천구","11560":"영등포구","11590":"동작구",
    "11620":"관악구","11650":"서초구","11680":"강남구","11710":"송파구","11740":"강동구"
}
SGG_CODES = list(SGG_MAP.keys())

# 2024년 전체
MONTHS = [f"2016{str(m).zfill(2)}" for m in range(1, 13)]

def request_json(params):
    """HTTP 우선 → 실패 시 HTTPS 폴백"""
    last_err = None
    for url in BASE_URLS:
        try:
            r = session.get(url, params=params, headers=HEADERS, timeout=TIMEOUT)
            r.raise_for_status()
            return r.json()
        except (requests.exceptions.SSLError,
                requests.exceptions.ReadTimeout,
                requests.exceptions.ConnectionError) as e:
            last_err = e
            continue
    raise last_err

def fetch_items_all_pages(sgg, ym, num_rows=1000, polite_delay=0.25):
    """시군구/연월 전 페이지 수집 (페이지네이션 + 폴백 + 재시도)"""
    params = {
        "serviceKey": API_KEY,
        "LAWD_CD": sgg,
        "DEAL_YMD": ym,
        "_type": "json",
        "numOfRows": num_rows,
        "pageNo": 1
    }
    try:
        data = request_json(params)
    except Exception as e:
        print(f"⚠️ {ym} {sgg} {SGG_MAP.get(sgg,'')}: 1페이지 실패 → 스킵: {e}")
        return []

    body = (data.get("response") or {}).get("body") or {}
    total = int(body.get("totalCount", 0) or 0)
    if total == 0:
        print(f"ℹ️ {ym} {sgg} {SGG_MAP.get(sgg,'')}: totalCount=0")
        return []

    items = body.get("items", {}).get("item", [])
    if isinstance(items, dict):
        items = [items]
    all_items = list(items)

    pages = math.ceil(total / num_rows)
    for page in range(2, pages + 1):
        time.sleep(polite_delay)
        params["pageNo"] = page
        try:
            data = request_json(params)
            body = (data.get("response") or {}).get("body") or {}
            items = body.get("items", {}).get("item", [])
            if isinstance(items, dict):
                items = [items]
            all_items.extend(items)
        except Exception as e:
            print(f"⚠️ {ym} {sgg} p{page} 실패 → 스킵: {e}")
            continue

    print(f"✅ {ym} {sgg} {SGG_MAP.get(sgg,'')}: total={total}, 수신={len(all_items)}, pages={pages}")
    return all_items

def main():
    rows = []
    for ym in MONTHS:
        for sgg in SGG_CODES:
            items = fetch_items_all_pages(sgg, ym)
            for it in items:
                y = str(it.get("dealYear") or "")
                m = str(it.get("dealMonth") or "").zfill(2) if it.get("dealMonth") is not None else ""
                d = str(it.get("dealDay") or "").zfill(2) if it.get("dealDay") is not None else ""
                deal_date = f"{y}-{m}-{d}" if (y and m and d) else ""

                rows.append([
                    ym, sgg, SGG_MAP.get(sgg, ""),
                    it.get("umdNm"), it.get("aptNm"),
                    it.get("excluUseAr"), it.get("floor"),
                    it.get("dealAmount"),
                    deal_date,
                    it.get("buildYear"), it.get("roadNm"), it.get("jibun"),
                    it.get("dealType"), it.get("estateAgentSggNm"), it.get("buyerGbn")
                ])
            time.sleep(0.5)      # 구 사이 간격
        time.sleep(1.0)          # 월 단위 간격

    out = "seoul_real_estate_2016.csv"
    with open(out, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.writer(f)
        w.writerow([
            "조회연월","시군구코드","시군구명","법정동","아파트명","전용면적(㎡)",
            "층","거래금액(만원)","거래일자","건축년도","도로명","지번",
            "거래유형","중개사무소명","거래자구분"
        ])
        w.writerows(rows)

    print(f"\n📝 파일 저장 완료: {out} (총 {len(rows)}건)")

if __name__ == "__main__":
    main()