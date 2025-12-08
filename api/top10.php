<?php
/**
 * TOP 10 API - 지역별 거래량 상위 10개 아파트 조회
 */
require_once 'config.php';

try {
    $pdo = getDBConnection();
    
    // URL 파라미터에서 지역명 받기
    $region = isset($_GET['region']) ? trim($_GET['region']) : '';
    
    if (empty($region)) {
        errorResponse('지역명(region)을 입력해주세요.', 400);
    }
    
    // 해당 지역의 아파트별 거래 건수를 집계하고 상위 10개 추출
    $sql = "
        SELECT 
            아파트명,
            COUNT(*) as 거래건수,
            AVG(거래금액_만원) as 평균거래금액,
            MIN(거래금액_만원) as 최저거래금액,
            MAX(거래금액_만원) as 최고거래금액,
            AVG(전용면적_㎡) as 평균면적,
            MAX(건축년도) as 최근건축년도,
            시군구명,
            법정동
        FROM apt_transactions
        WHERE 시군구명 = ?
            AND 아파트명 IS NOT NULL
            AND 아파트명 != ''
        GROUP BY 아파트명, 시군구명, 법정동
        ORDER BY 거래건수 DESC
        LIMIT 10
    ";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$region]);
    $results = $stmt->fetchAll();
    
    // 결과가 없는 경우
    if (empty($results)) {
        jsonResponse([
            'success' => true,
            'region' => $region,
            'data' => [],
            'message' => '해당 지역의 거래 데이터가 없습니다.'
        ]);
    }
    
    // 결과 가공 (금액을 억 단위로 변환)
    $processedData = array_map(function($item) {
        return [
            'rank' => null, // 순위는 클라이언트에서 표시
            'name' => $item['아파트명'],
            'volume' => (int)$item['거래건수'],
            'avg_price_만원' => round($item['평균거래금액']),
            'avg_price_억' => round($item['평균거래금액'] / 10000, 1),
            'min_price_억' => round($item['최저거래금액'] / 10000, 1),
            'max_price_억' => round($item['최고거래금액'] / 10000, 1),
            'avg_area' => round($item['평균면적'], 1),
            'latest_year' => $item['최근건축년도'],
            'district' => $item['시군구명'],
            'dong' => $item['법정동']
        ];
    }, $results);
    
    // 응답
    jsonResponse([
        'success' => true,
        'region' => $region,
        'count' => count($processedData),
        'data' => $processedData
    ]);
    
} catch (Exception $e) {
    errorResponse('서버 오류: ' . $e->getMessage(), 500);
}
?>
