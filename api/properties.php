<?php
require_once 'config.php';

try {
    $pdo = getDBConnection();
    
    // URL 파라미터 받기
    $regions = isset($_GET['regions']) ? explode(',', $_GET['regions']) : [];
    $minPrice = isset($_GET['min_price']) ? (int)$_GET['min_price'] : 0;
    $maxPrice = isset($_GET['max_price']) ? (int)$_GET['max_price'] : 999999;
    $minArea = isset($_GET['min_area']) ? (float)$_GET['min_area'] : 0;
    $maxArea = isset($_GET['max_area']) ? (float)$_GET['max_area'] : 999;
    $minYear = isset($_GET['min_year']) ? (int)$_GET['min_year'] : 1970;
    $maxStation = isset($_GET['max_station_dist']) ? (float)$_GET['max_station_dist'] : 9999;
    $maxWalkTime = isset($_GET['max_walk_time']) ? (float)$_GET['max_walk_time'] : 9999; // 도보 시간 (분)
    $floorCategory = isset($_GET['floor_category']) ? $_GET['floor_category'] : null; // 저층, 중층, 고층
    $limit = isset($_GET['limit']) ? min((int)$_GET['limit'], 100) : 20;
    $offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;
    $sortBy = isset($_GET['sort_by']) ? $_GET['sort_by'] : 'price_asc';
    
    // SQL 쿼리 구성 (컬럼명 업데이트!)
    $sql = "SELECT 
                id,
                조회연월,
                거래년, 거래월, 거래일,
                시군구명, 법정동, 도로명, 아파트명,
                거래금액_만원,
                전용면적_㎡,
                평수,
                층_원본,
                층_숫자,
                층_카테고리,
                건축년도,
                경도, 위도,
                최단지하철역,
                역거리,
                역도보시간,
                버스정류장수,
                병원거리,
                마트수,
                편의점수,
                공원개수,
                고속도로거리
            FROM apt_transactions
            WHERE 1=1";
    
    $params = [];
    
    // 지역 필터
    if (!empty($regions)) {
        // 공백 제거 및 정제
        $regions = array_map('trim', $regions);
        $regions = array_filter($regions);
        
        if (!empty($regions)) {
            $placeholders = str_repeat('?,', count($regions) - 1) . '?';
            $sql .= " AND 시군구명 IN ($placeholders)";
            $params = array_merge($params, $regions);
        }
    }
    
    // 가격 필터 (NULL이나 0인 경우도 고려)
    if ($minPrice > 0 || $maxPrice < 999999) {
        $sql .= " AND (거래금액_만원 BETWEEN ? AND ? OR 거래금액_만원 IS NULL)";
        $params[] = $minPrice;
        $params[] = $maxPrice;
    }
    
    // 면적 필터
    $sql .= " AND 전용면적_㎡ BETWEEN ? AND ?";
    $params[] = $minArea;
    $params[] = $maxArea;
    
    // 건축년도 필터
    $sql .= " AND 건축년도 >= ?";
    $params[] = $minYear;
    
    // 역 거리 필터
    $sql .= " AND 역거리 <= ?";
    $params[] = $maxStation;
    
    // 역 도보 시간 필터 (새로 추가!)
    if ($maxWalkTime < 9999) {
        $sql .= " AND 역도보시간 <= ?";
        $params[] = $maxWalkTime;
    }
    
    // 층 카테고리 필터 (새로 추가!)
    if ($floorCategory && in_array($floorCategory, ['저층', '중층', '고층'])) {
        $sql .= " AND 층_카테고리 = ?";
        $params[] = $floorCategory;
    }
    
    // 정렬
    switch ($sortBy) {
        case 'price_asc':
            $sql .= " ORDER BY 거래금액_만원 ASC";
            break;
        case 'price_desc':
            $sql .= " ORDER BY 거래금액_만원 DESC";
            break;
        case 'area_desc':
            $sql .= " ORDER BY 전용면적_㎡ DESC";
            break;
        case 'year_desc':
            $sql .= " ORDER BY 건축년도 DESC";
            break;
        case 'station_asc':
            $sql .= " ORDER BY 역거리 ASC";
            break;
        case 'floor_asc':
            $sql .= " ORDER BY 층_숫자 ASC";
            break;
        case 'floor_desc':
            $sql .= " ORDER BY 층_숫자 DESC";
            break;
        default:
            $sql .= " ORDER BY 거래금액_만원 ASC";
    }
    
    // 페이징
    $sql .= " LIMIT ? OFFSET ?";
    $params[] = $limit;
    $params[] = $offset;
    
    // 쿼리 실행
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $properties = $stmt->fetchAll();
    
    // 전체 개수 조회
    $countSQL = "SELECT COUNT(*) as total FROM apt_transactions WHERE 1=1";
    $countParams = [];
    
    if (!empty($regions)) {
        $regions = array_map('trim', $regions);
        $regions = array_filter($regions);
        if (!empty($regions)) {
            $placeholders = str_repeat('?,', count($regions) - 1) . '?';
            $countSQL .= " AND 시군구명 IN ($placeholders)";
            $countParams = array_merge($countParams, $regions);
        }
    }
    if ($minPrice > 0 || $maxPrice < 999999) {
        $countSQL .= " AND (거래금액_만원 BETWEEN ? AND ? OR 거래금액_만원 IS NULL)";
        $countParams[] = $minPrice;
        $countParams[] = $maxPrice;
    }
    $countSQL .= " AND 전용면적_㎡ BETWEEN ? AND ?";
    $countParams[] = $minArea;
    $countParams[] = $maxArea;
    $countSQL .= " AND 건축년도 >= ?";
    $countParams[] = $minYear;
    $countSQL .= " AND 역거리 <= ?";
    $countParams[] = $maxStation;
    
    if ($maxWalkTime < 9999) {
        $countSQL .= " AND 역도보시간 <= ?";
        $countParams[] = $maxWalkTime;
    }
    
    if ($floorCategory && in_array($floorCategory, ['저층', '중층', '고층'])) {
        $countSQL .= " AND 층_카테고리 = ?";
        $countParams[] = $floorCategory;
    }
    
    $countStmt = $pdo->prepare($countSQL);
    $countStmt->execute($countParams);
    $total = $countStmt->fetch()['total'];
    
    // 응답
    jsonResponse([
        'success' => true,
        'total' => $total,
        'count' => count($properties),
        'data' => $properties,
        'pagination' => [
            'limit' => $limit,
            'offset' => $offset,
            'total_pages' => ceil($total / $limit)
        ],
        'filters_applied' => [
            'regions' => $regions,
            'price_range' => [$minPrice, $maxPrice],
            'area_range' => [$minArea, $maxArea],
            'min_year' => $minYear,
            'max_station_dist' => $maxStation,
            'max_walk_time' => $maxWalkTime,
            'floor_category' => $floorCategory,
            'sort_by' => $sortBy
        ]
    ]);
    
} catch (Exception $e) {
    errorResponse($e->getMessage(), 500);
}
?>
