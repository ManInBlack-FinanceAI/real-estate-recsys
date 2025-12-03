// filter.js - CSV 파싱 및 필터링 로직

/**
* CSV 파일을 파싱하여 객체 배열로 변환
* @param {string} csvText - CSV 파일 내용
* @returns {Array} 파싱된 데이터 배열
*/
function parseCSV(csvText) {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',');
  const data = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    const row = {};

    headers.forEach((header, index) => {
      row[header.trim()] = values[index] ? values[index].trim() : '';
    });

    data.push(row);
  }

  return data;
}

/**
* CSV 파일 로드
* @param {string} filePath - CSV 파일 경로
* @returns {Promise<Array>} 파싱된 데이터
*/
async function loadCSV(filePath) {
  try {
    const response = await fetch(filePath);
    if (!response.ok) {
      throw new Error(`CSV 파일 로드 실패: ${response.status}`);
    }
    const csvText = await response.text();
    return parseCSV(csvText);
  } catch (error) {
  console.error('CSV 로드 에러:', error);
  return [];
}
}

/**
* 평수 범위를 제곱미터로 변환
* @param {string} pyungRange - 평수 범위 (예: "21~30평")
* @returns {Object} {min: number, max: number} 제곱미터 범위
*/
function pyungToSquareMeter(pyungRange) {
  if (!pyungRange) return { min: 0, max: Infinity };

  const pyungToM2 = 3.3058; // 1평 = 3.3058㎡

  if (pyungRange === '~10평') {
    return { min: 0, max: 10 * pyungToM2 };
  } else if (pyungRange === '11~20평') {
  return { min: 11 * pyungToM2, max: 20 * pyungToM2 };
} else if (pyungRange === '21~30평') {
return { min: 21 * pyungToM2, max: 30 * pyungToM2 };
} else if (pyungRange === '31~40평') {
return { min: 31 * pyungToM2, max: 40 * pyungToM2 };
} else if (pyungRange === '41평~' || pyungRange === '41평 이상') {
return { min: 41 * pyungToM2, max: Infinity };
}

return { min: 0, max: Infinity };
}

/**
* 예산 범위를 만원 단위로 변환
* @param {string} budgetRange - 예산 범위 (예: "10억 미만")
* @returns {Object} {min: number, max: number} 만원 단위
*/
function budgetToWonRange(budgetRange) {
  if (!budgetRange) return { min: 0, max: Infinity };

  if (budgetRange === '10억 미만') {
    return { min: 0, max: 100000 }; // 10억원 = 100,000만원
  } else if (budgetRange === '10억 이상') {
  return { min: 100000, max: 150000 };
} else if (budgetRange === '15억 이상') {
return { min: 150000, max: 200000 };
} else if (budgetRange === '20억 이상') {
return { min: 200000, max: Infinity };
}

return { min: 0, max: Infinity };
}

/**
* 층 범위 필터
* @param {string} floorGroup - 층 그룹 (예: "저층(1~10층)")
* @returns {Object} {min: number, max: number}
*/
function floorToRange(floorGroup) {
  if (!floorGroup) return { min: 0, max: Infinity };

  if (floorGroup === '저층(1~10층)') {
    return { min: 1, max: 10 };
  } else if (floorGroup === '중층(11~20층)') {
  return { min: 11, max: 20 };
} else if (floorGroup === '고층(21층 이상)') {
return { min: 21, max: Infinity };
}

return { min: 0, max: Infinity };
}

/**
* 신축 여부를 건축년도 범위로 변환
* @param {string} newBuild - 신축 여부 (예: "신축(5년 이내)")
* @param {number} currentYear - 현재 연도
* @returns {Object} {min: number, max: number}
*/
function newBuildToYearRange(newBuild, currentYear = new Date().getFullYear()) {
  if (!newBuild || newBuild === '무관') {
    return { min: 0, max: Infinity };
  }

  if (newBuild === '신축(5년 이내)') {
    return { min: currentYear - 5, max: currentYear };
  } else if (newBuild === '준신축(10년 이내)') {
  return { min: currentYear - 10, max: currentYear };
}

return { min: 0, max: Infinity };
}

/**
* 설문 데이터로 CSV 데이터 필터링
* @param {Array} data - CSV 파싱된 데이터
* @param {Object} surveyData - 설문 응답 데이터
* @returns {Array} 필터링된 데이터
*/
function filterProperties(data, surveyData) {
  if (!data || data.length === 0) return [];
  if (!surveyData) return data;

  console.log('필터링 시작:', {
    totalData: data.length,
    surveyData
  });

  let filtered = [...data];

  // 1. 예산 필터 (거래금액)
  if (surveyData.budget_range) {
    const budgetRange = budgetToWonRange(surveyData.budget_range);
    filtered = filtered.filter(item => {
      const price = Number(item['거래금액(만원)']) || 0;
      return price >= budgetRange.min && price <= budgetRange.max;
    });
    console.log(`예산 필터 후: ${filtered.length}개`);
  }

  // 3. 희망 지역 (시군구명 또는 법정동)
  if (surveyData.regions && surveyData.regions.length > 0) {
    filtered = filtered.filter(item => {
      const itemRegion = item['시군구명'] || '';
      const itemDong = item['법정동'] || '';

      return surveyData.regions.some(region => {
        // "서울특별시 강남구" 형태로 비교
        return itemRegion.includes(region) ||
        region.includes(itemRegion) ||
        (region.includes(itemDong) && itemDong);
      });
    });
    console.log(`지역 필터 후: ${filtered.length}개`);
  }

  // 5. 평수 (전용면적)
  if (surveyData.pyung_range) {
    const areaRange = pyungToSquareMeter(surveyData.pyung_range);
    filtered = filtered.filter(item => {
      const area = Number(item['전용면적(㎡)']) || 0;
      return area >= areaRange.min && area <= areaRange.max;
    });
    console.log(`평수 필터 후: ${filtered.length}개`);
  }

  // 6. 층 범위
  if (surveyData.floor_group) {
    const floorRange = floorToRange(surveyData.floor_group);
    filtered = filtered.filter(item => {
      const floor = Number(item['층']) || 0;
      return floor >= floorRange.min && floor <= floorRange.max;
    });
    console.log(`층 필터 후: ${filtered.length}개`);
  }

  // 7. 신축 여부 (건축년도)
  if (surveyData.new_build && surveyData.new_build !== '무관') {
    const yearRange = newBuildToYearRange(surveyData.new_build);
    filtered = filtered.filter(item => {
      const buildYear = Number(item['건축년도']) || 0;
      return buildYear >= yearRange.min && buildYear <= yearRange.max;
    });
    console.log(`신축 필터 후: ${filtered.length}개`);
  }

  console.log('필터링 완료:', filtered.length);
  return filtered;
}

/**
* 필터링된 데이터를 우선순위에 따라 정렬
* @param {Array} data - 필터링된 데이터
* @param {Array} priorities - 우선순위 배열 (예: ['price', 'region', 'station'])
* @returns {Array} 정렬된 데이터
*/
function sortByPriorities(data, priorities) {
  if (!priorities || priorities.length === 0) return data;

  return [...data].sort((a, b) => {
    // 각 우선순위에 따라 점수 계산
    for (const priority of priorities) {
      let scoreA = 0, scoreB = 0;

      switch (priority) {
        case 'price':
        // 가격이 낮을수록 높은 점수
        scoreA = -(Number(a['거래금액(만원)']) || 0);
        scoreB = -(Number(b['거래금액(만원)']) || 0);
        break;
        case 'station':
        // 역까지 거리가 가까울수록 높은 점수
        scoreA = -(Number(a['distance_to_station_m']) || 0);
        scoreB = -(Number(b['distance_to_station_m']) || 0);
        break;
        case 'newer':
        // 건축년도가 최근일수록 높은 점수
        scoreA = Number(a['건축년도']) || 0;
        scoreB = Number(b['건축년도']) || 0;
        break;
        case 'size_floor':
        // 평수가 클수록 높은 점수 (선호도에 따라 조정 가능)
        scoreA = Number(a['전용면적(㎡)']) || 0;
        scoreB = Number(b['전용면적(㎡)']) || 0;
        break;
        default:
        continue;
      }

      if (scoreA !== scoreB) {
        return scoreB - scoreA;
      }
    }

    return 0;
  });
}

/**
* 제곱미터를 평수로 변환
* @param {number} sqm - 제곱미터
* @returns {string} 평수 (소수점 1자리)
*/
function sqmToPyung(sqm) {
  return (sqm / 3.3058).toFixed(1);
}

/**
* 만원을 억원 단위로 포맷팅
* @param {number} manwon - 만원 단위 금액
* @returns {string} 억원 단위 문자열
*/
function formatPrice(manwon) {
  const eok = Math.floor(manwon / 10000);
  const man = manwon % 10000;

  if (eok > 0 && man > 0) {
    return `${eok}억 ${man.toLocaleString()}만원`;
  } else if (eok > 0) {
  return `${eok}억원`;
} else {
return `${man.toLocaleString()}만원`;
}
}

// Export functions for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    parseCSV,
    loadCSV,
    filterProperties,
    sortByPriorities,
    sqmToPyung,
    formatPrice
  };
}