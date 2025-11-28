-- 기존 테이블 삭제 (재실행 시)
DROP TABLE IF EXISTS apt_transactions;

-- 부동산 매물 테이블 (실제 데이터 기반)
CREATE TABLE apt_transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    
    -- 거래 정보 (모두 NULL 허용)
    조회연월 VARCHAR(6),
    거래년 SMALLINT,
    거래월 TINYINT,
    거래일 TINYINT,
    거래일자 DATE,
    
    -- 위치 정보
    시군구코드 VARCHAR(10),
    시군구명 VARCHAR(50),
    법정동 VARCHAR(100),
    도로명 VARCHAR(200),
    아파트명 VARCHAR(200),
    
    -- 거래 금액 및 면적
    거래금액_만원 INT,                    -- 최대 약 2억 (200,000만원)
    전용면적_㎡ DECIMAL(10,2),
    평수 DECIMAL(10,2) AS (전용면적_㎡ * 0.3025) STORED,  -- 자동 계산
    
    -- 층 정보 (문자열 + 숫자)
    층_원본 VARCHAR(20),                  -- '저층', '중층', '고층', '15층' 등
    층_숫자 TINYINT UNSIGNED,            -- 숫자 변환 값 (1~50, NULL 가능)
    층_카테고리 ENUM('저층', '중층', '고층', '알수없음') AS (
        CASE 
            WHEN 층_원본 LIKE '%저층%' THEN '저층'
            WHEN 층_원본 LIKE '%중층%' THEN '중층'
            WHEN 층_원본 LIKE '%고층%' THEN '고층'
            WHEN 층_숫자 <= 5 THEN '저층'
            WHEN 층_숫자 <= 15 THEN '중층'
            WHEN 층_숫자 > 15 THEN '고층'
            ELSE '알수없음'
        END
    ) STORED,
    
    건축년도 SMALLINT,                    -- 1970 ~ 2025
    
    -- 금융/경제 지표 (모두 NULL 허용)
    기준금리 DECIMAL(5,2),
    주담대금리 DECIMAL(5,2),
    CPI DECIMAL(10,2),
    주택매매가격지수 DECIMAL(10,2),
    주택전세가격지수 DECIMAL(10,2),
    아파트매매가격지수 DECIMAL(10,2),
    현금통화 DECIMAL(15,1),              -- 190046.3 같은 값
    경제활동인구 INT,
    
    -- 위치 좌표 (소수점 8자리)
    경도 DECIMAL(11,8),                   -- 127.019402892439
    위도 DECIMAL(11,8),                   -- 37.5999446937385
    
    -- 교통/편의시설 정보 (모두 NULL 허용)
    최단지하철역 VARCHAR(100),
    역거리 DECIMAL(10,1),                 -- 596.0 (미터 단위)
    역도보시간 DECIMAL(5,1),              -- 8.5 (분 단위)
    버스정류장수 TINYINT UNSIGNED,
    병원거리 DECIMAL(10,1),
    마트수 TINYINT UNSIGNED,
    편의점수 TINYINT UNSIGNED,
    공원개수 TINYINT UNSIGNED,
    고속도로거리 DECIMAL(10,1),
    
    -- 생성/수정 시간
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- 인덱스 (검색 최적화)
    INDEX idx_지역 (시군구명, 법정동),
    INDEX idx_가격 (거래금액_만원),
    INDEX idx_면적 (전용면적_㎡),
    INDEX idx_평수 (평수),
    INDEX idx_건축년도 (건축년도),
    INDEX idx_좌표 (위도, 경도),
    INDEX idx_거래일자 (거래일자),
    INDEX idx_아파트명 (아파트명),
    INDEX idx_층_카테고리 (층_카테고리),
    INDEX idx_역거리 (역거리),
    INDEX idx_복합검색 (시군구명, 거래금액_만원, 전용면적_㎡)
    
) ENGINE=InnoDB 
  DEFAULT CHARSET=utf8mb4 
  COLLATE=utf8mb4_unicode_ci
  COMMENT='부동산 아파트 거래 데이터';
