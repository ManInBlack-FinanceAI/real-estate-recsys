# 🏠 Men in Black - 부동산 추천 시스템

금융인공지능실습 프로젝트 수행을 위한 리포지토리입니다.

## 📋 프로젝트 개요

**Men in Black**는 실거래 데이터 기반 맞춤형 부동산 추천 시스템입니다. 사용자의 라이프스타일, 예산, 선호도를 분석하여 최적의 주거 옵션을 제공합니다.

### 주요 기능

- 🎯 **개인화된 설문 기반 추천**: 사용자의 요구사항을 반영한 맞춤 매물 추천
- 📊 **실거래가 데이터 분석**: 수십만 건의 부동산 실거래 데이터 기반 분석
- 🗺️ **지도 기반 시각화**: 추천 매물의 위치를 지도에서 직관적으로 확인
- 🏢 **상세 정보 제공**: 교통, 편의시설, 학군 등 다각도 정보 제공
- 💰 **부동산 계산기**: 대출, 취득세, 양도세 계산 기능
- 📈 **거래 TOP 10**: 실시간 인기 거래 매물 정보
- 🤖 **ML 기반 가격 예측**: 머신러닝을 활용한 부동산 가격 예측

## 🚀 프로젝트 시연

프로젝트는 다음 경로에서 실제로 시연해볼 수 있습니다:

🔗 **데모 사이트**: https://trainsiot.com/cau19/src/index.html

## 📁 프로젝트 구조

```
real-estate-recsys/
│
├── src/                          # 프론트엔드 소스 코드
│   ├── index.html               # 메인 랜딩 페이지
│   ├── survey.html              # 설문조사 페이지
│   ├── results.html             # 추천 결과 페이지
│   ├── apartment_dashboard.html # 아파트 상세 대시보드
│   ├── cus_an.html              # 부동산 가이드 페이지
│   ├── service.html             # 서비스 소개 페이지
│   ├── top10.html               # 거래 TOP 10 페이지
│   ├── loading.html             # 로딩 페이지
│   │
│   ├── script.js                # 메인 스크립트
│   ├── survey.js                # 설문조사 로직
│   ├── result.js                # 결과 페이지 로직
│   ├── dashboard.js             # 대시보드 로직
│   ├── filter.js                # 필터링 로직
│   ├── loading.js               # 로딩 애니메이션
│   ├── cus_an.js                # 가이드 페이지 로직
│   │
│   ├── style.css                # 메인 스타일시트
│   ├── survey.css               # 설문조사 스타일
│   ├── results.css              # 결과 페이지 스타일
│   ├── dashboard.css            # 대시보드 스타일
│   ├── loading.css              # 로딩 페이지 스타일
│   ├── cus_an.css               # 가이드 페이지 스타일
│   │
│   └── *.jpg, *.png             # 이미지 리소스
│
├── api/                          # 백엔드 API (PHP)
│   ├── config.php               # 데이터베이스 설정
│   ├── properties.php           # 부동산 매물 조회 API
│   ├── filters.php              # 필터링 옵션 API
│   ├── stats.php                # 통계 데이터 API
│   ├── top10.php                # TOP 10 매물 API
│   └── apartment_detail.php     # 아파트 상세 정보 API
│
├── admin/                        # 관리자 도구
│   └── import_csv_to_db.php     # CSV → MariaDB 데이터 임포트 도구
│
├── db/                           # 데이터베이스 스키마
│   └── create_tables.sql        # 테이블 생성 SQL
│
├── ML/                           # 머신러닝 모델
│   ├── modeling.py              # 모델 학습 및 예측
│   ├── distinfo_control.py      # 분산 학습 제어
│   ├── cpu.py                   # CPU 기반 학습
│   └── gpu.py                   # GPU 기반 학습
│
├── .gitignore                    # Git 제외 파일 목록
├── .gitattributes               # Git 속성 설정
└── README.md                     # 프로젝트 문서 (본 파일)
```

## 🛠️ 기술 스택

### 프론트엔드
- **HTML5 / CSS3**: 시맨틱 마크업 및 반응형 디자인
- **JavaScript (ES6+)**: 동적 UI 및 상호작용 구현
- **Font Awesome**: 아이콘 라이브러리
- **Google Fonts (Pretendard)**: 한글 웹폰트

### 백엔드
- **PHP 7.4+**: REST API 서버
- **MariaDB**: 관계형 데이터베이스
- **PDO**: 데이터베이스 연결 레이어

### 머신러닝
- **Python 3.8+**: 데이터 분석 및 모델링
- **scikit-learn / TensorFlow**: 머신러닝 프레임워크
- **pandas / numpy**: 데이터 처리

### 인프라
- **Apache/Nginx**: 웹 서버
- **Linux**: 서버 운영체제

## 💾 데이터베이스 설정

### 1. 테이블 구조

프로젝트는 `apt_transactions` 테이블을 사용하여 부동산 거래 데이터를 저장합니다.

**주요 컬럼:**
- **거래 정보**: 조회연월, 거래일자, 거래금액
- **위치 정보**: 시군구명, 법정동, 도로명주소, 지번주소, 위도/경도
- **매물 정보**: 아파트명, 전용면적, 층, 건축년도
- **편의시설**: 최단지하철역, 역거리, 버스정류장수, 병원거리, 마트수, 편의점수
- **경제지표**: 기준금리, 주담대금리, CPI, 주택매매가격지수
- **상세정보**: 건설사, 시행사, 난방방식, 세대수, 주차대수

### 2. 데이터 임포트 방법

CSV 파일의 데이터를 MariaDB에 업로드하려면 다음 도구를 사용하세요:

🔗 **데이터 임포트 도구**: 
```
https://trainsiot.com/cau19/admin/import_csv_to_db.php
```

**임포트 프로세스:**
1. 브라우저에서 위 URL 접속
2. 자동으로 테이블 생성 및 데이터 임포트 시작
3. 실시간 진행 상황 모니터링
4. 완료 후 데이터 통계 확인

**주요 기능:**
- ✅ 자동 테이블 생성 (`create_tables.sql` 실행)
- ✅ CSV 파일 자동 파싱 (BOM 처리)
- ✅ 배치 처리 (1000건씩 커밋)
- ✅ 층 데이터 자동 파싱 (저층/중층/고층 분류)
- ✅ 실시간 진행 상황 표시
- ✅ 오류 로깅 및 통계 제공
- ✅ 지역별/층별 분포 분석

**성능:**
- 처리 속도: 약 1,000~2,000개/초
- 메모리 제한: 512MB
- 타임아웃: 5분

## 🎨 주요 페이지 설명

### 1. 메인 페이지 (`index.html`)
- 서비스 소개 및 랜딩 페이지
- 설문조사 시작 버튼
- 로그인/회원가입 모달
- FAQ 모달
- 부동산 계산기 바로가기

### 2. 설문조사 페이지 (`survey.html`)
- 사용자 요구사항 수집
- 예산, 위치, 면적, 층, 편의시설 선호도 입력
- 진행률 표시

### 3. 결과 페이지 (`results.html`)
- 추천 매물 목록 표시
- 지도 기반 매물 위치 시각화
- 필터링 및 정렬 기능
- 상세 정보 팝업
- 부동산 계산기 (대출/취득세/양도세)

### 4. 아파트 대시보드 (`apartment_dashboard.html`)
- 특정 아파트의 상세 정보
- 거래 이력 차트
- 주변 편의시설 지도
- 건축 정보 및 관리 정보

### 5. 부동산 가이드 (`cus_an.html`)
- 부동산 구매/임대 가이드
- 전문 용어 설명
- 거래 절차 안내

### 6. TOP 10 페이지 (`top10.html`)
- 실시간 인기 거래 매물
- 지역별 거래 순위
- 가격 및 거래량 통계

## 🔌 API 엔드포인트

### 1. 매물 조회 API
```
GET /api/properties.php
```

**파라미터:**
- `minPrice`, `maxPrice`: 가격 범위 (만원)
- `minArea`, `maxArea`: 면적 범위 (㎡)
- `region`: 지역명 (예: "강남구")
- `floor`: 층 카테고리 (저층/중층/고층)
- `minYear`: 최소 건축년도
- `sort`: 정렬 기준 (price/area/date)
- `limit`: 결과 개수 제한

### 2. 필터 옵션 API
```
GET /api/filters.php
```
- 사용 가능한 지역 목록
- 가격/면적 범위
- 건축년도 범위

### 3. 통계 API
```
GET /api/stats.php
```
- 전체 거래 통계
- 지역별 평균 가격
- 거래량 추이

### 4. TOP 10 API
```
GET /api/top10.php
```
- 최근 인기 매물
- 거래 빈도 높은 아파트
- 가격 상승률 TOP 10

### 5. 아파트 상세 정보 API
```
GET /api/apartment_detail.php?apt_code=XXX
```
- 특정 아파트의 상세 정보
- 거래 이력
- 주변 편의시설 정보

## 🤖 머신러닝 모델

### 모델 구조
- **목적**: 부동산 가격 예측 및 추천 최적화
- **특징**: 지역, 면적, 층, 건축년도, 편의시설, 경제지표 등 다중 변수 활용

### 학습 방법

#### CPU 기반 학습
```bash
python ML/cpu.py
```

#### GPU 기반 학습
```bash
python ML/gpu.py
```

#### 분산 학습 제어
```bash
python ML/distinfo_control.py
```

### 모델 활용
```bash
python ML/modeling.py
```

## 🚀 로컬 개발 환경 설정

### 1. 저장소 클론
```bash
git clone https://github.com/your-username/real-estate-recsys.git
cd real-estate-recsys
```

### 2. 데이터베이스 설정
```bash
# MariaDB 접속
mysql -u root -p

# 데이터베이스 생성
CREATE DATABASE cau19 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# 사용자 생성 및 권한 부여
CREATE USER 'cau19'@'localhost' IDENTIFIED BY 'cau_training';
GRANT ALL PRIVILEGES ON cau19.* TO 'cau19'@'localhost';
FLUSH PRIVILEGES;

# 테이블 생성
mysql -u cau19 -p cau19 < db/create_tables.sql
```

### 3. PHP 설정
`api/config.php` 파일에서 데이터베이스 연결 정보 수정:
```php
$host = 'localhost';
$dbname = 'cau19';
$username = 'cau19';
$password = 'cau_training';
```

### 4. 웹 서버 실행
```bash
# Apache 사용 시
sudo service apache2 start

# PHP 내장 서버 사용 시
php -S localhost:8000
```

### 5. 데이터 임포트
브라우저에서 `http://localhost:8000/admin/import_csv_to_db.php` 접속

## 📊 데이터 소스

본 프로젝트는 다음 공공 데이터를 활용합니다:
- 국토교통부 실거래가 공개시스템
- 한국은행 경제통계시스템
- 공공데이터포털 부동산 정보

## 👥 팀 구성

**Men in Black** 개발팀
- 중앙대학교 금융인공지능실습 수강생

## 📞 문의

- **Email**: eueseok@naver.com
- **전화**: 010-6886-8724
- **주소**: 서울특별시 동작구 흑석로 84

## 📄 라이선스

Copyright © 2025 Men in Black Real Estate. All Rights Reserved.

---

## 🔧 문제 해결 (Troubleshooting)

### 데이터베이스 연결 오류
```
SQLSTATE[HY000] [1045] Access denied
```
→ `api/config.php`의 데이터베이스 인증 정보를 확인하세요.

### CSV 임포트 실패
```
Maximum execution time exceeded
```
→ `php.ini`에서 `max_execution_time`과 `memory_limit`을 증가시키세요.

### API 응답 오류
```
500 Internal Server Error
```
→ PHP 에러 로그를 확인하고 데이터베이스 연결 상태를 점검하세요.

## 📈 향후 계획

- [ ] 사용자 인증 시스템 구현
- [ ] 찜하기 및 비교하기 기능
- [ ] 챗봇 상담 서비스
- [ ] 모바일 앱 개발
- [ ] 실시간 시세 알림 기능
- [ ] VR 매물 투어 기능

---

**Built with ❤️ by Men in Black Team**
