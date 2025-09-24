from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
import requests
import json
from pathlib import Path

app = FastAPI()

# CORS (같은 포트에서 서빙되므로 사실 필요 없음, 그래도 유지)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 법정동 코드 로드
BASE_DIR = Path(__file__).resolve().parent
with open(BASE_DIR / "법정동코드.json", "r", encoding="utf-8") as f:
    lawd_code_map = json.load(f)

# 국토부 API 서비스 키 (본인 키로 교체!)
SERVICE_KEY = "35fc1e9c87f611089e5d742742e4b68a344912a362bc55de129a13717fd49563"

@app.get("/api/deals")
def get_deals(
    address: str = Query(..., description="주소 입력"),
    startYm: str = Query(..., description="조회 시작 연월 (YYYYMM)"),
    endYm: str = Query(..., description="조회 종료 연월 (YYYYMM)")
):
    # 주소로 법정동 코드 조회
    if address not in lawd_code_map:
        return JSONResponse(content={"error": "법정동코드.json에 해당 주소가 없습니다."}, status_code=400)

    full_code = lawd_code_map[address]
    lawd_cd = full_code[:5]

    # 요청할 연월 리스트 생성
    ym_list = []
    start = int(startYm)
    end = int(endYm)
    cur = start
    while cur <= end:
        ym_list.append(str(cur))
        year = cur // 100
        month = cur % 100
        month += 1
        if month > 12:
            year += 1
            month = 1
        cur = year * 100 + month

    all_deals = []

    for ym in ym_list:
        url = (
            f"https://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev"
            f"?serviceKey={SERVICE_KEY}&LAWD_CD={lawd_cd}&DEAL_YMD={ym}"
        )
        try:
            response = requests.get(url)
            response.encoding = "utf-8"
            if response.status_code != 200:
                continue

            from xml.etree import ElementTree as ET
            root = ET.fromstring(response.text)

            items = root.findall(".//item")
            for item in items:
                get = lambda tag: (item.find(tag).text.strip() if item.find(tag) is not None else "")
                all_deals.append({
                    "apt": get("aptNm"),
                    "price": get("dealAmount"),
                    "area": get("excluUseAr"),
                    "floor": get("floor"),
                    "dong": get("umdNm"),
                    "jibun": get("jibun"),
                    "year": get("dealYear"),
                    "month": get("dealMonth"),
                    "day": get("dealDay")
                })
        except Exception as e:
            print("API 호출 실패:", e)
            continue

    # 정렬 (최신순)
    all_deals.sort(key=lambda d: f"{d['year']}{d['month'].zfill(2)}{d['day'].zfill(2)}", reverse=True)

    return all_deals

# ✅ templates 폴더 안의 HTML, CSS, JS 정적 파일 서빙
app.mount("/", StaticFiles(directory="templates", html=True), name="static")