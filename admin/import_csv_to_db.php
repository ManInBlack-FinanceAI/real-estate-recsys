<?php
/**
 * CSV → MariaDB 임포트 스크립트
 * 실제 데이터 기반으로 완전히 재작성
 */

set_time_limit(300); // 5분 타임아웃
ini_set('memory_limit', '512M'); // 메모리 증가

// DB 연결 설정
$host = 'trainsiot_mariaDB';
$dbname = 'cau19'; 
$username = 'cau19';
$password = 'cau_training';

/**
 * 층 데이터 파싱 함수 (루프 밖으로 이동!)
 */
function parseFloor($floorStr) {
    $floorStr = trim($floorStr);
    
    // 숫자만 있는 경우
    if (is_numeric($floorStr)) {
        return [$floorStr, (int)$floorStr];
    }
    
    // 문자열에서 숫자 추출 시도 (예: "15층" → 15)
    if (preg_match('/(\d+)/', $floorStr, $matches)) {
        return [$floorStr, (int)$matches[1]];
    }
    
    // 키워드 매칭
    $floorMap = [
        '저층' => 3,
        '중층' => 10,
        '고층' => 20,
        '최상층' => 30
    ];
    
    foreach ($floorMap as $key => $value) {
        if (mb_strpos($floorStr, $key) !== false) {
            return [$floorStr, $value];
        }
    }
    
    // 알 수 없는 경우
    return [$floorStr, null];
}

/**
 * NULL 처리 함수 (루프 밖으로 이동!)
 */
function safeValue($value) {
    if ($value === null) return null;
    $value = trim($value);
    return ($value === '' || $value === 'NULL') ? null : $value;
}

?>
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CSV 임포트</title>
    <style>
        body {
            font-family: 'Noto Sans KR', Arial, sans-serif;
            max-width: 1400px;
            margin: 20px auto;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        .container {
            background: white;
            border-radius: 10px;
            padding: 30px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.1);
        }
        h2 {
            color: #667eea;
            border-bottom: 3px solid #667eea;
            padding-bottom: 10px;
            margin-top: 30px;
        }
        .status {
            padding: 15px;
            margin: 10px 0;
            border-radius: 5px;
            font-weight: bold;
        }
        .success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
        .warning { background: #fff3cd; color: #856404; border: 1px solid #ffeaa7; }
        .info { background: #d1ecf1; color: #0c5460; border: 1px solid #bee5eb; }
        .progress {
            background: #e9ecef;
            border-radius: 10px;
            height: 30px;
            margin: 20px 0;
            overflow: hidden;
        }
        .progress-bar {
            background: linear-gradient(90deg, #667eea, #764ba2);
            height: 100%;
            line-height: 30px;
            color: white;
            text-align: center;
            transition: width 0.3s;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }
        th, td {
            padding: 12px;
            text-align: left;
            border: 1px solid #dee2e6;
        }
        th {
            background: #667eea;
            color: white;
            font-weight: bold;
        }
        tr:nth-child(even) {
            background: #f8f9fa;
        }
        .log-box {
            max-height: 400px;
            overflow-y: auto;
            border: 2px solid #dee2e6;
            border-radius: 5px;
            padding: 15px;
            background: #f8f9fa;
            font-family: 'Courier New', monospace;
            font-size: 13px;
        }
        .stat-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin: 20px 0;
        }
        .stat-card {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
        }
        .stat-card h3 {
            margin: 0;
            font-size: 2em;
        }
        .stat-card p {
            margin: 10px 0 0 0;
            opacity: 0.9;
        }
    </style>
</head>
<body>
<div class="container">
    <h1 style="color: #667eea; text-align: center;">🏠 부동산 데이터 임포트</h1>
    
<?php

try {
    $pdo = new PDO(
        "mysql:host=$host;dbname=$dbname;charset=utf8mb4",
        $username,
        $password,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
        ]
    );
    
    echo "<div class='status success'>✅ 데이터베이스 연결 성공</div>";
    
    // 1. 테이블 생성
    echo "<h2>📋 Step 1: 테이블 생성</h2>";
    $sqlFile = __DIR__ . '/../db/create_tables.sql';
    
    if (!file_exists($sqlFile)) {
        throw new Exception("SQL 파일을 찾을 수 없습니다: $sqlFile");
    }
    
    $createTableSQL = file_get_contents($sqlFile);
    $pdo->exec($createTableSQL);
    echo "<div class='status success'>✅ 테이블 생성 완료</div>";
    
    // 2. CSV 파일 찾기
    echo "<h2>📂 Step 2: CSV 파일 로드</h2>";
    $csvFile = __DIR__ . '/../aptlist_tmp.csv';
    
    if (!file_exists($csvFile)) {
        throw new Exception("CSV 파일을 찾을 수 없습니다: $csvFile");
    }
    
    $fileSize = filesize($csvFile);
    echo "<div class='status info'>📄 파일 크기: " . number_format($fileSize / 1024 / 1024, 2) . " MB</div>";
    
    $file = fopen($csvFile, 'r');
    
    // BOM 제거
    $bom = fread($file, 3);
    if ($bom !== "\xEF\xBB\xBF") {
        rewind($file);
    }
    
    // 헤더 읽기
    $header = fgetcsv($file);
    echo "<div class='status info'>📊 컬럼 수: " . count($header) . "개</div>";
    
    // 3. 데이터 임포트
    echo "<h2>⚙️ Step 3: 데이터 임포트</h2>";
    
    // INSERT 준비 (새로운 CSV 구조)
    $stmt = $pdo->prepare("
        INSERT INTO apt_transactions (
            조회연월, 시군구코드, 시군구명, 법정동, 아파트명,
            거래금액_만원, 전용면적_㎡, 층_원본, 층_숫자, 거래일자, 건축년도, 도로명,
            기준금리, 주담대금리, 최단지하철역, 역거리, 역도보시간,
            CPI, 주택매매가격지수, 주택전세가격지수, 아파트매매가격지수, 현금통화, 경제활동인구,
            위도, 경도, 버스정류장수, 병원거리, 마트수, 편의점수, 공원개수, 고속도로거리,
            거래년, 거래월, 거래일, 도로명주소, 지번주소, 아파트코드, 시도, 도로상세주소,
            전화번호, 관리방식, 도로형태, 난방방식, 동수, 세대수, 건설사, 시행사,
            사용승인일, 관리비부과면적, 경비관리형태, 청소관리형태, 주차대수, 단지승인일, road_key
        ) VALUES (
            ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?, ?
        )
    ");
    
    $count = 0;
    $errorCount = 0;
    $errorDetails = [];
    $startTime = microtime(true);
    
    $pdo->beginTransaction();
    
    echo "<div class='log-box' id='logBox'>";
    
    while (($row = fgetcsv($file)) !== false) {
        try {
            // 층 데이터 처리
            list($floorOriginal, $floorNumber) = parseFloor($row[6]);
            
            // 거래일자 (row[7]에 이미 날짜 형식으로 있음)
            $transactionDate = safeValue($row[7]);
            
            // 사용승인일 파싱
            $approvalDate = safeValue($row[45]);
            if ($approvalDate && strlen($approvalDate) >= 10) {
                $approvalDate = substr($approvalDate, 0, 10); // YYYY-MM-DD 추출
            }
            
            // 단지승인일 파싱
            $complexApprovalDate = safeValue($row[50]);
            if ($complexApprovalDate && strlen($complexApprovalDate) >= 19) {
                // 이미 DATETIME 형식
            }
            
            // 데이터 삽입 (CSV 컬럼 순서에 맞게 수정)
            $stmt->execute([
                safeValue($row[0]),   // 조회연월
                safeValue($row[1]),   // 시군구코드
                safeValue($row[2]),   // 시군구명
                safeValue($row[3]),   // 법정동
                safeValue($row[4]),   // 아파트명
                safeValue($row[53]),  // 거래금액(만원) - CSV 마지막 컬럼!
                safeValue($row[5]),   // 전용면적(㎡)
                $floorOriginal,       // 층_원본
                $floorNumber,         // 층_숫자
                $transactionDate,     // 거래일자
                safeValue($row[8]),   // 건축년도
                safeValue($row[9]),   // 도로명
                safeValue($row[10]),  // 기준금리
                safeValue($row[11]),  // 주담대금리
                safeValue($row[12]),  // 최단지하철역
                safeValue($row[13]),  // 역거리
                safeValue($row[14]),  // 역도보시간
                safeValue($row[15]),  // CPI
                safeValue($row[16]),  // 주택매매가격지수
                safeValue($row[17]),  // 주택전세가격지수
                safeValue($row[18]),  // 아파트매매가격지수
                safeValue($row[19]),  // 현금통화
                safeValue($row[20]),  // 경제활동인구
                safeValue($row[21]),  // 위도
                safeValue($row[22]),  // 경도
                safeValue($row[23]),  // 버스정류장수
                safeValue($row[24]),  // 병원거리
                safeValue($row[25]),  // 마트수
                safeValue($row[26]),  // 편의점수
                safeValue($row[27]),  // 공원개수
                safeValue($row[28]),  // 고속도로거리
                safeValue($row[29]),  // 거래년
                safeValue($row[30]),  // 거래월
                safeValue($row[31]),  // 거래일
                safeValue($row[32]),  // 도로명주소
                safeValue($row[33]),  // 지번주소
                safeValue($row[34]),  // 아파트코드
                safeValue($row[35]),  // 시도
                safeValue($row[36]),  // 도로상세주소
                safeValue($row[37]),  // 전화번호
                safeValue($row[38]),  // 관리방식
                safeValue($row[39]),  // 도로형태
                safeValue($row[40]),  // 난방방식
                safeValue($row[41]),  // 동수
                safeValue($row[42]),  // 세대수
                safeValue($row[43]),  // 건설사
                safeValue($row[44]),  // 시행사
                $approvalDate,        // 사용승인일
                safeValue($row[46]),  // 관리비부과면적
                safeValue($row[47]),  // 경비관리형태
                safeValue($row[48]),  // 청소관리형태
                safeValue($row[49]),  // 주차대수
                $complexApprovalDate, // 단지승인일
                safeValue($row[51])   // road_key
            ]);
            
            $count++;
            
            // 1000개씩 커밋
            if ($count % 1000 == 0) {
                $pdo->commit();
                $pdo->beginTransaction();
                
                $elapsed = microtime(true) - $startTime;
                $speed = $count / $elapsed;
                $message = sprintf(
                    "[%s] ✅ %s개 임포트 완료 (%.1f개/초)",
                    date('H:i:s'),
                    number_format($count),
                    $speed
                );
                echo "<div style='color: green;'>$message</div>";
                flush();
            }
            
        } catch (Exception $e) {
            $errorCount++;
            
            if ($errorCount <= 10) {
                $errorMsg = sprintf(
                    "[오류 #%d] 행 %d: %s",
                    $errorCount,
                    $count + $errorCount,
                    $e->getMessage()
                );
                echo "<div style='color: red;'>⚠️ $errorMsg</div>";
                
                $errorDetails[] = [
                    'row' => $count + $errorCount,
                    'message' => $e->getMessage(),
                    'data' => implode(' | ', array_slice($row, 0, 5))
                ];
            }
        }
    }
    
    $pdo->commit();
    fclose($file);
    
    $totalTime = microtime(true) - $startTime;
    
    echo "</div>"; // log-box 끝
    
    // 4. 결과 요약
    echo "<h2>🎉 Step 4: 완료!</h2>";
    
    echo "<div class='stat-grid'>";
    echo "<div class='stat-card'><h3>" . number_format($count) . "</h3><p>성공</p></div>";
    echo "<div class='stat-card'><h3>" . number_format($errorCount) . "</h3><p>오류</p></div>";
    echo "<div class='stat-card'><h3>" . number_format($totalTime, 1) . "초</h3><p>소요 시간</p></div>";
    echo "<div class='stat-card'><h3>" . number_format($count / $totalTime, 1) . "개/초</h3><p>처리 속도</p></div>";
    echo "</div>";
    
    if ($errorCount > 0 && !empty($errorDetails)) {
        echo "<h2>⚠️ 오류 상세</h2>";
        echo "<table>";
        echo "<tr><th>행 번호</th><th>오류 메시지</th><th>데이터 샘플</th></tr>";
        foreach ($errorDetails as $error) {
            echo "<tr>";
            echo "<td>{$error['row']}</td>";
            echo "<td>" . htmlspecialchars($error['message']) . "</td>";
            echo "<td>" . htmlspecialchars($error['data']) . "</td>";
            echo "</tr>";
        }
        echo "</table>";
    }
    
    // 5. 데이터 통계
    if ($count > 0) {
        echo "<h2>📊 데이터 통계</h2>";
        
        $stats = $pdo->query("
            SELECT 
                COUNT(*) as total,
                COUNT(DISTINCT 시군구명) as districts,
                COUNT(DISTINCT 아파트명) as apts,
                MIN(거래금액_만원) as min_price,
                MAX(거래금액_만원) as max_price,
                AVG(거래금액_만원) as avg_price,
                MIN(전용면적_㎡) as min_area,
                MAX(전용면적_㎡) as max_area,
                AVG(전용면적_㎡) as avg_area
            FROM apt_transactions
        ")->fetch();
        
        echo "<table>";
        echo "<tr><th>항목</th><th>값</th></tr>";
        echo "<tr><td>총 거래</td><td>" . number_format($stats['total']) . "건</td></tr>";
        echo "<tr><td>지역 수</td><td>" . $stats['districts'] . "개</td></tr>";
        echo "<tr><td>아파트 수</td><td>" . number_format($stats['apts']) . "개</td></tr>";
        echo "<tr><td>최저가</td><td>" . number_format($stats['min_price']) . "만원</td></tr>";
        echo "<tr><td>최고가</td><td>" . number_format($stats['max_price']) . "만원</td></tr>";
        echo "<tr><td>평균가</td><td>" . number_format($stats['avg_price']) . "만원</td></tr>";
        echo "<tr><td>최소 면적</td><td>" . number_format($stats['min_area'], 2) . "㎡</td></tr>";
        echo "<tr><td>최대 면적</td><td>" . number_format($stats['max_area'], 2) . "㎡</td></tr>";
        echo "<tr><td>평균 면적</td><td>" . number_format($stats['avg_area'], 2) . "㎡</td></tr>";
        echo "</table>";
        
        // 층 분포
        echo "<h2>🏢 층 분포</h2>";
        $floorStats = $pdo->query("
            SELECT 
                층_카테고리,
                COUNT(*) as count,
                AVG(거래금액_만원) as avg_price
            FROM apt_transactions
            WHERE 층_카테고리 IS NOT NULL
            GROUP BY 층_카테고리
            ORDER BY 
                CASE 층_카테고리
                    WHEN '저층' THEN 1
                    WHEN '중층' THEN 2
                    WHEN '고층' THEN 3
                    ELSE 4
                END
        ")->fetchAll();
        
        echo "<table>";
        echo "<tr><th>층 구분</th><th>건수</th><th>평균 가격</th></tr>";
        foreach ($floorStats as $stat) {
            echo "<tr>";
            echo "<td>{$stat['층_카테고리']}</td>";
            echo "<td>" . number_format($stat['count']) . "건</td>";
            echo "<td>" . number_format($stat['avg_price']) . "만원</td>";
            echo "</tr>";
        }
        echo "</table>";
        
        // 지역별 통계
        echo "<h2>📍 지역별 TOP 10</h2>";
        $regionStats = $pdo->query("
            SELECT 
                시군구명,
                COUNT(*) as count,
                AVG(거래금액_만원) as avg_price,
                AVG(전용면적_㎡) as avg_area
            FROM apt_transactions
            GROUP BY 시군구명
            ORDER BY count DESC
            LIMIT 10
        ")->fetchAll();
        
        echo "<table>";
        echo "<tr><th>지역</th><th>거래 건수</th><th>평균 가격</th><th>평균 면적</th></tr>";
        foreach ($regionStats as $stat) {
            echo "<tr>";
            echo "<td>{$stat['시군구명']}</td>";
            echo "<td>" . number_format($stat['count']) . "건</td>";
            echo "<td>" . number_format($stat['avg_price']) . "만원</td>";
            echo "<td>" . number_format($stat['avg_area'], 1) . "㎡</td>";
            echo "</tr>";
        }
        echo "</table>";
    }
    
    echo "<div style='text-align: center; margin-top: 40px;'>";
    echo "<a href='../api/properties.php?limit=10' style='display: inline-block; padding: 15px 30px; background: linear-gradient(135deg, #667eea, #764ba2); color: white; text-decoration: none; border-radius: 5px; font-weight: bold;'>📡 API 테스트하기</a>";
    echo "</div>";
    
} catch (PDOException $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    echo "<div class='status error'>";
    echo "<h3>❌ 데이터베이스 오류</h3>";
    echo "<p>" . htmlspecialchars($e->getMessage()) . "</p>";
    echo "<pre style='max-height: 300px; overflow: auto;'>" . htmlspecialchars($e->getTraceAsString()) . "</pre>";
    echo "</div>";
} catch (Exception $e) {
    echo "<div class='status error'>";
    echo "<h3>❌ 오류 발생</h3>";
    echo "<p>" . htmlspecialchars($e->getMessage()) . "</p>";
    echo "</div>";
}

?>

</div>
</body>
</html>
