<?php
require_once 'config.php';

try {
    $pdo = getDBConnection();
    
    // 전체 통계
    $overallStats = $pdo->query("
        SELECT 
            COUNT(*) as total_transactions,
            COUNT(DISTINCT 시군구명) as total_districts,
            COUNT(DISTINCT 아파트명) as total_apartments,
            AVG(거래금액_만원) as avg_price,
            AVG(전용면적_㎡) as avg_area,
            AVG(건축년도) as avg_year
        FROM apt_transactions
    ")->fetch();
    
    // 지역별 TOP 10
    $topDistricts = $pdo->query("
        SELECT 
            시군구명,
            COUNT(*) as transaction_count,
            AVG(거래금액_만원) as avg_price,
            MIN(거래금액_만원) as min_price,
            MAX(거래금액_만원) as max_price
        FROM apt_transactions
        GROUP BY 시군구명
        ORDER BY transaction_count DESC
        LIMIT 10
    ")->fetchAll();
    
    // 인기 아파트 TOP 10
    $topApartments = $pdo->query("
        SELECT 
            아파트명,
            시군구명,
            COUNT(*) as transaction_count,
            AVG(거래금액_만원) as avg_price,
            MAX(거래일자) as last_transaction
        FROM apt_transactions
        GROUP BY 아파트명, 시군구명
        ORDER BY transaction_count DESC
        LIMIT 10
    ")->fetchAll();
    
    // 가격대별 분포
    $priceDistribution = $pdo->query("
        SELECT 
            CASE 
                WHEN 거래금액_만원 < 30000 THEN '3억 이하'
                WHEN 거래금액_만원 < 50000 THEN '3~5억'
                WHEN 거래금액_만원 < 70000 THEN '5~7억'
                WHEN 거래금액_만원 < 100000 THEN '7~10억'
                ELSE '10억 이상'
            END as price_range,
            COUNT(*) as count
        FROM apt_transactions
        GROUP BY price_range
        ORDER BY MIN(거래금액_만원)
    ")->fetchAll();
    
    // 면적별 분포 (평수)
    $areaDistribution = $pdo->query("
        SELECT 
            CASE 
                WHEN 평수 < 20 THEN '10평대'
                WHEN 평수 < 30 THEN '20평대'
                WHEN 평수 < 40 THEN '30평대'
                ELSE '40평대 이상'
            END as pyung_range,
            COUNT(*) as count,
            AVG(거래금액_만원) as avg_price
        FROM apt_transactions
        WHERE 평수 IS NOT NULL
        GROUP BY pyung_range
        ORDER BY MIN(평수)
    ")->fetchAll();
    
    jsonResponse([
        'success' => true,
        'statistics' => [
            'overview' => $overallStats,
            'top_districts' => $topDistricts,
            'top_apartments' => $topApartments,
            'price_distribution' => $priceDistribution,
            'area_distribution' => $areaDistribution
        ]
    ]);
    
} catch (Exception $e) {
    errorResponse($e->getMessage(), 500);
}
?>
