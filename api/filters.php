<?php
require_once 'config.php';

try {
    $pdo = getDBConnection();
    
    // 지역 목록
    $regions = $pdo->query("
        SELECT DISTINCT 시군구명 as region, COUNT(*) as count
        FROM apt_transactions
        GROUP BY 시군구명
        ORDER BY 시군구명
    ")->fetchAll();
    
    // 가격 범위
    $priceRange = $pdo->query("
        SELECT 
            MIN(거래금액_만원) as min_price,
            MAX(거래금액_만원) as max_price,
            AVG(거래금액_만원) as avg_price
        FROM apt_transactions
    ")->fetch();
    
    // 면적 범위
    $areaRange = $pdo->query("
        SELECT 
            MIN(전용면적_㎡) as min_area,
            MAX(전용면적_㎡) as max_area,
            AVG(전용면적_㎡) as avg_area
        FROM apt_transactions
    ")->fetch();
    
    // 건축년도 범위
    $yearRange = $pdo->query("
        SELECT 
            MIN(건축년도) as min_year,
            MAX(건축년도) as max_year
        FROM apt_transactions
    ")->fetch();
    
    // 층 카테고리 분포
    $floorCategories = $pdo->query("
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
    
    // 역거리 통계
    $stationStats = $pdo->query("
        SELECT 
            MIN(역거리) as min_distance,
            MAX(역거리) as max_distance,
            AVG(역거리) as avg_distance,
            COUNT(CASE WHEN 역거리 <= 300 THEN 1 END) as within_300m,
            COUNT(CASE WHEN 역거리 <= 500 THEN 1 END) as within_500m,
            COUNT(CASE WHEN 역거리 <= 1000 THEN 1 END) as within_1km
        FROM apt_transactions
        WHERE 역거리 IS NOT NULL
    ")->fetch();
    
    jsonResponse([
        'success' => true,
        'filters' => [
            'regions' => $regions,
            'price_range' => $priceRange,
            'area_range' => $areaRange,
            'year_range' => $yearRange,
            'floor_categories' => $floorCategories,
            'station_stats' => $stationStats
        ]
    ]);
    
} catch (Exception $e) {
    errorResponse($e->getMessage(), 500);
}
?>
