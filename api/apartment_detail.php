<?php
/**
 * 아파트 상세 정보 API
 * 특정 아파트의 기본 정보와 거래 내역을 반환
 */

require_once 'config.php';

try {
    $pdo = getDBConnection();
    
    // 파라미터 받기
    $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
    $aptName = isset($_GET['name']) ? trim($_GET['name']) : '';
    $district = isset($_GET['district']) ? trim($_GET['district']) : '';
    
    // ID 또는 아파트명으로 조회
    if ($id > 0) {
        // ID로 조회
        $sql = "SELECT * FROM apt_transactions WHERE id = ? LIMIT 1";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$id]);
        $apartment = $stmt->fetch();
        
        if (!$apartment) {
            errorResponse('해당 ID의 아파트를 찾을 수 없습니다.', 404);
        }
        
        $aptName = $apartment['아파트명'];
        $district = $apartment['시군구명'];
        
    } elseif ($aptName && $district) {
        // 아파트명과 구로 조회 (대표 데이터 1개)
        $sql = "SELECT * FROM apt_transactions 
                WHERE 아파트명 = ? AND 시군구명 = ? 
                ORDER BY 거래일자 DESC 
                LIMIT 1";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$aptName, $district]);
        $apartment = $stmt->fetch();
        
        if (!$apartment) {
            errorResponse('해당 아파트를 찾을 수 없습니다.', 404);
        }
    } else {
        errorResponse('아파트 ID 또는 이름과 지역을 제공해주세요.', 400);
    }
    
    // 해당 아파트의 모든 거래 내역 조회 (가격 추이용)
    $priceHistorySQL = "SELECT 
                            거래일자,
                            거래금액_만원,
                            전용면적_㎡,
                            평수,
                            층_원본,
                            층_카테고리
                        FROM apt_transactions
                        WHERE 아파트명 = ? AND 시군구명 = ?
                        ORDER BY 거래일자 ASC";
    
    $priceStmt = $pdo->prepare($priceHistorySQL);
    $priceStmt->execute([$aptName, $district]);
    $priceHistory = $priceStmt->fetchAll();
    
    // 통계 계산
    $avgPrice = 0;
    $minPrice = PHP_INT_MAX;
    $maxPrice = 0;
    $totalTransactions = count($priceHistory);
    
    foreach ($priceHistory as $transaction) {
        $price = (int)$transaction['거래금액_만원'];
        if ($price > 0) {
            $avgPrice += $price;
            $minPrice = min($minPrice, $price);
            $maxPrice = max($maxPrice, $price);
        }
    }
    
    if ($totalTransactions > 0) {
        $avgPrice = round($avgPrice / $totalTransactions);
    }
    
    if ($minPrice === PHP_INT_MAX) {
        $minPrice = 0;
    }
    
    // 응답 데이터 구성
    $response = [
        'success' => true,
        'apartment' => [
            'id' => $apartment['id'],
            'name' => $apartment['아파트명'],
            'district' => $apartment['시군구명'],
            'dong' => $apartment['법정동'],
            'road' => $apartment['도로명'],
            'location' => $apartment['시군구명'] . ' ' . $apartment['법정동'],
            'build_year' => $apartment['건축년도'],
            'age' => date('Y') - (int)$apartment['건축년도'] . '년차',
            'latitude' => $apartment['위도'],
            'longitude' => $apartment['경도'],
            
            // 교통 정보
            'nearest_station' => $apartment['최단지하철역'],
            'station_distance' => $apartment['역거리'],
            'station_walk_time' => $apartment['역도보시간'],
            'bus_stops' => $apartment['버스정류장수'],
            
            // 편의시설
            'hospital_distance' => $apartment['병원거리'],
            'mart_count' => $apartment['마트수'],
            'convenience_count' => $apartment['편의점수'],
            'park_count' => $apartment['공원개수'],
            'highway_distance' => $apartment['고속도로거리'],
            
            // 가격 통계
            'avg_price' => $avgPrice,
            'min_price' => $minPrice,
            'max_price' => $maxPrice,
            'latest_price' => (int)$apartment['거래금액_만원'],
            'total_transactions' => $totalTransactions,
            
            // 면적 정보
            'area_sqm' => $apartment['전용면적_㎡'],
            'area_pyung' => $apartment['평수'],
            
            // 층 정보
            'floor_original' => $apartment['층_원본'],
            'floor_number' => $apartment['층_숫자'],
            'floor_category' => $apartment['층_카테고리']
        ],
        'price_history' => $priceHistory,
        'statistics' => [
            'total_transactions' => $totalTransactions,
            'avg_price' => $avgPrice,
            'min_price' => $minPrice,
            'max_price' => $maxPrice,
            'price_range' => $maxPrice - $minPrice
        ]
    ];
    
    jsonResponse($response);
    
} catch (Exception $e) {
    errorResponse($e->getMessage(), 500);
}
?>
