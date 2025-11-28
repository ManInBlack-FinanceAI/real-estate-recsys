// results.js

// 카카오맵 전역 변수
let map;
let currentMarker;

// 카카오맵 초기화
function initKakaoMap() {
    const container = document.getElementById('map-area');
    if (!container) return;
    
    const options = {
        center: new kakao.maps.LatLng(37.5665, 126.9780), // 서울 시청 기본 위치
        level: 5
    };
    
    map = new kakao.maps.Map(container, options);
}

/**
 * API에서 매물 데이터 가져오기
 */
async function fetchPropertiesFromAPI(surveyData) {
    try {
        // 설문 데이터를 API 파라미터로 변환
        const params = new URLSearchParams();
        
        // 지역 필터
        if (surveyData.regions && surveyData.regions.length > 0) {
            params.append('regions', surveyData.regions.map(r => r.replace('서울특별시 ', '')).join(','));
        }
        
        // 예산 필터
        if (surveyData.budget_range) {
            const [min, max] = parseBudgetRange(surveyData.budget_range);
            params.append('min_price', min);
            params.append('max_price', max);
        }
        
        // 평수 필터
        if (surveyData.pyung_range) {
            const [min, max] = parsePyungRange(surveyData.pyung_range);
            params.append('min_area', min * 3.3);  // 평 -> m²
            params.append('max_area', max * 3.3);
        }
        
        // 신축 필터
        if (surveyData.new_build && surveyData.new_build !== '무관') {
            const currentYear = new Date().getFullYear();
            if (surveyData.new_build.includes('신축')) {
                params.append('min_year', currentYear - 5);
            } else if (surveyData.new_build.includes('준신축')) {
                params.append('min_year', currentYear - 10);
            }
        }
        
        // 역세권 필터
        if (surveyData.rank_top5 && surveyData.rank_top5[0] === 'station') {
            params.append('max_station_dist', 500);  // 500m 이내
        }
        
        // 정렬 (우선순위 기반)
        if (surveyData.rank_top5 && surveyData.rank_top5.length > 0) {
            const sortMap = {
                'price': 'price_asc',
                'size_floor': 'area_desc',
                'newer': 'year_desc',
                'station': 'station_asc'
            };
            params.append('sort_by', sortMap[surveyData.rank_top5[0]] || 'price_asc');
        }
        
        // 페이징
        params.append('limit', 50);
        params.append('offset', 0);
        
        // API 호출
        const response = await fetch(`/cau19/api/properties.php?${params.toString()}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.error || 'API 호출 실패');
        }
        
        console.log(`✅ API에서 ${data.count}개 매물 로드 완료 (전체: ${data.total}개)`);
        return data;
        
    } catch (error) {
        console.error('API 호출 오류:', error);
        throw error;
    }
}

/**
 * 예산 범위 파싱
 */
function parseBudgetRange(budgetStr) {
    const patterns = {
        '3억 이하': [0, 30000],
        '3~5억': [30000, 50000],
        '5~7억': [50000, 70000],
        '7~10억': [70000, 100000],
        '10억 이상': [100000, 999999]
    };
    return patterns[budgetStr] || [0, 999999];
}

/**
 * 평수 범위 파싱
 */
function parsePyungRange(pyungStr) {
    const patterns = {
        '10평대': [10, 20],
        '20평대': [20, 30],
        '30평대': [30, 40],
        '40평대 이상': [40, 999]
    };
    return patterns[pyungStr] || [0, 999];
}

/**
 * 가격 포맷
 */
function formatPrice(price) {
    if (price >= 10000) {
        return `${(price / 10000).toFixed(1)}억`;
    }
    return `${price}만원`;
}

/**
 * 제곱미터를 평으로 변환
 */
function sqmToPyung(sqm) {
    return (sqm * 0.3025).toFixed(1);
}

// 지도에 마커 표시
function showLocationOnMap(lat, lng, propertyName) {
    if (!map) {
        initKakaoMap();
    }
    
    // 기존 마커 제거
    if (currentMarker) {
        currentMarker.setMap(null);
    }
    
    const position = new kakao.maps.LatLng(lat, lng);
    
    // 새 마커 생성
    currentMarker = new kakao.maps.Marker({
        position: position,
        map: map
    });
    
    // 인포윈도우 생성
    const infowindow = new kakao.maps.InfoWindow({
        content: `<div style="padding:5px;font-size:12px;width:200px;text-align:center;">${propertyName}</div>`
    });
    
    infowindow.open(map, currentMarker);
    
    // 지도 중심 이동
    map.setCenter(position);
    map.setLevel(4);
}

document.addEventListener('DOMContentLoaded', async () => {
    const userPersonalizedTitle = document.getElementById('user-personalized-title');
    const userSummary = document.getElementById('user-summary');
    const matchPercentage = document.getElementById('match-percentage');
    const recommendationList = document.getElementById('recommendation-list');
    const reasonKeywordsContainer = document.getElementById('reason-keywords');
    
    // 카카오맵 초기화
    initKakaoMap();

    // 세션 스토리지와 로컬 스토리지에서 설문 데이터 가져오기
    let surveyData = null;
    const surveyV2String = sessionStorage.getItem('survey_v2') || localStorage.getItem('survey_v2');
    if (surveyV2String) {
        surveyData = JSON.parse(surveyV2String);
        console.log('설문 데이터 로드:', surveyData);
    }
    
    // 기존 userSurveyAnswers도 호환성을 위해 로드
    const userSurveyAnswersString = localStorage.getItem('userSurveyAnswers');
    let userAnswers = {};
    if (userSurveyAnswersString) {
        userAnswers = JSON.parse(userSurveyAnswersString);
    }
    
    // API에서 데이터 로드
    let filteredProperties = [];
    try {
        if (surveyData) {
            const apiResponse = await fetchPropertiesFromAPI(surveyData);
            filteredProperties = apiResponse.data;
            console.log('✅ API에서 데이터 로드 완료:', filteredProperties.length);
            console.log('첫 번째 데이터 샘플:', filteredProperties[0]); // 디버깅용
        }
    } catch (error) {
        console.error('API 호출 오류:', error);
        recommendationList.innerHTML = '<p style="text-align: center; color: #e74c3c;">데이터를 불러오는 중 오류가 발생했습니다.</p>';
    }

    // 가상의 사용자 이름
    const userName = "김부자";

    // 1. 개인화된 제목 및 요약 업데이트
    userPersonalizedTitle.textContent = `${userName}님을 위한 맞춤 분석 결과입니다.`;

    let summaryText = `${userName}님은 `;
    const importantConditions = userAnswers.important_conditions_res || userAnswers.important_conditions_inv;
    if (importantConditions && importantConditions.length > 0) {
        summaryText += `<strong>'${importantConditions[0]}'</strong>`;
        if (importantConditions.length > 1) {
            summaryText += `과 <strong>'${importantConditions[1]}'</strong>`;
        }
        summaryText += `을(를) 중시하는군요!`;
    } else {
        summaryText += `전반적인 주거 환경을 중시하는군요!`;
    }
    userSummary.innerHTML = summaryText;

    // 2. 추천 매물 리스트 생성
    recommendationList.innerHTML = '';

    if (filteredProperties.length > 0) {
        const topProperties = filteredProperties.slice(0, 10);
        
        topProperties.forEach(property => {
            const card = document.createElement('div');
            card.classList.add('property-card');
            
            // 위도, 경도 (한글 키 사용!)
            const lat = parseFloat(property['위도']) || 37.5665;
            const lng = parseFloat(property['경도']) || 126.9780;
            
            // 안전한 값 가져오기 함수
            function safeGet(obj, key, defaultValue = '') {
                const value = obj[key];
                if (value === null || value === undefined || value === '') {
                    return defaultValue;
                }
                return value;
            }
            
            // 키워드 생성
            const keywords = [];
            
            // 역세권
            const stationDist = parseFloat(property['역거리']);
            if (!isNaN(stationDist) && stationDist < 500) {
                keywords.push('역세권');
            }
            
            // 신축
            const buildYear = parseInt(property['건축년도']);
            const currentYear = new Date().getFullYear();
            if (!isNaN(buildYear)) {
                if (buildYear >= currentYear - 5) {
                    keywords.push('신축');
                } else if (buildYear >= currentYear - 10) {
                    keywords.push('준신축');
                }
            }
            
            // 층 카테고리
            const floorCategory = property['층_카테고리'];
            if (floorCategory && floorCategory !== '알수없음') {
                keywords.push(floorCategory);
            }
            
            // 면적
            const area = parseFloat(property['전용면적_㎡']);
            if (!isNaN(area) && area > 100) {
                keywords.push('넓은평수');
            }
            
            // 편의시설
            const martCount = parseInt(property['마트수']);
            const convCount = parseInt(property['편의점수']);
            const parkCount = parseInt(property['공원개수']);
            
            if (!isNaN(martCount) && martCount >= 3) keywords.push('마트인근');
            if (!isNaN(convCount) && convCount >= 10) keywords.push('편의점다수');
            if (!isNaN(parkCount) && parkCount >= 10) keywords.push('공원인근');
            
            // 가격 포맷
            const price = parseInt(property['거래금액_만원']);
            const priceText = formatPrice(price);
            
            // 평수 (API에서 이미 계산된 값 사용)
            const pyung = parseFloat(property['평수']);
            const pyungText = !isNaN(pyung) ? pyung.toFixed(1) + '평' : '평수 정보없음';
            
            // 층 정보 (층_원본 우선, 없으면 층_숫자)
            let floorText = property['층_원본'] || '';
            if (!floorText && property['층_숫자']) {
                floorText = property['층_숫자'] + '층';
            }
            if (!floorText) {
                floorText = '층 정보없음';
            }
            
            // 역 정보
            const stationName = safeGet(property, '최단지하철역', '정보없음');
            const walkTime = property['역도보시간'];
            const walkTimeText = walkTime && !isNaN(parseFloat(walkTime)) 
                ? `도보 ${Math.round(parseFloat(walkTime))}분` 
                : '도보시간 정보없음';
            
            card.innerHTML = `
                <img src="https://via.placeholder.com/300x200?text=${encodeURIComponent(property['아파트명'] || '매물')}" 
                     alt="${property['아파트명']} 이미지" class="property-image">
                <div class="card-details">
                    <h3>${safeGet(property, '아파트명', '정보없음')}</h3>
                    <p class="location">${safeGet(property, '시군구명', '')} ${safeGet(property, '법정동', '')}</p>
                    <p class="price">매매 ${priceText} (${pyungText})</p>
                    <p class="detail-info">
                        ${floorText} · ${safeGet(property, '건축년도', '?')}년 준공 · ${stationName} ${walkTimeText}
                    </p>
                    <div class="keywords">
                        ${keywords.map(kw => `<span class="keyword">#${kw}</span>`).join('')}
                    </div>
                    <button class="view-details-btn" onclick="showPropertyDetails(${property['id']})">상세보기</button>
                </div>
            `;
            
            // 카드 클릭 이벤트
            card.addEventListener('click', () => {
                showLocationOnMap(lat, lng, property['아파트명'] || '매물');
                
                // 선택 스타일 적용
                document.querySelectorAll('.property-card').forEach(c => {
                    c.style.border = '1px solid #eee';
                    c.style.backgroundColor = '#fff';
                });
                
                card.style.border = '2px solid #007bff';
                card.style.backgroundColor = '#f0f8ff';
            });
            
            recommendationList.appendChild(card);
        });
        
        // 매칭 점수 업데이트
        const matchScore = Math.min(95, 70 + Math.floor((filteredProperties.length / 10) * 5));
        matchPercentage.textContent = `${matchScore}%`;
    } else {
        recommendationList.innerHTML = '<p style="text-align: center; color: #777;">설문 조건에 맞는 매물이 없습니다. 조건을 조정해주세요.</p>';
        matchPercentage.textContent = '0%';
    }

    // 3. 추천 이유 키워드 업데이트
    reasonKeywordsContainer.innerHTML = '';
    const reasons = [];
    
    if (surveyData) {
        // 예산 관련
        if (surveyData.budget_range) {
            reasons.push(`예산${surveyData.budget_range}`);
        }
        
        // 지역 관련
        if (surveyData.regions && surveyData.regions.length > 0) {
            surveyData.regions.slice(0, 2).forEach(region => {
                reasons.push(region.replace('서울특별시 ', ''));
            });
        }
        
        // 평수 관련
        if (surveyData.pyung_range) {
            reasons.push(surveyData.pyung_range);
        }
        
        // 신축 여부
        if (surveyData.new_build && surveyData.new_build !== '무관') {
            reasons.push(surveyData.new_build.replace(/\(.*\)/, ''));
        }
        
        // 입주 시기
        if (surveyData.move_in) {
            reasons.push(`입주${surveyData.move_in}`);
        }
        
        // 우선순위 상위 2개
        if (surveyData.rank_top5 && surveyData.rank_top5.length > 0) {
            const priorityMap = {
                'price': '가격중시',
                'region': '지역중시',
                'station': '역세권중시',
                'size_floor': '평수중시',
                'newer': '신축중시'
            };
            surveyData.rank_top5.slice(0, 2).forEach(key => {
                if (priorityMap[key]) {
                    reasons.push(priorityMap[key]);
                }
            });
        }
    }
    
    // 기존 방식도 백업으로 사용
    if (reasons.length === 0) {
        reasons.push(...generateReasonKeywords(userAnswers));
    }
    
    if (reasons.length > 0) {
        reasons.slice(0, 7).forEach(reason => {
            const tag = document.createElement('span');
            tag.classList.add('reason-tag');
            tag.textContent = `#${reason}`;
            reasonKeywordsContainer.appendChild(tag);
        });
    } else {
        reasonKeywordsContainer.innerHTML = '<p style="font-size: 0.9em; color: #999;">설문 결과를 바탕으로 한 추천 키워드가 없습니다.</p>';
    }


    // --- 부동산 계산기 로직 시작 ---

    // 헬퍼 함수: 숫자 포맷 (세 자리마다 콤마)
    function formatNumber(num) {
        return new Intl.NumberFormat('ko-KR').format(Math.round(num));
    }

    // 대출 계산기
    const loanAmountInput = document.getElementById('loan-amount');
    const loanInterestRateInput = document.getElementById('loan-interest-rate');
    const loanPeriodInput = document.getElementById('loan-period');
    const monthlyPaymentSpan = document.getElementById('monthly-payment');
    const totalInterestSpan = document.getElementById('total-interest');

    function calculateLoan() {
        const principal = parseFloat(loanAmountInput.value) * 10000; // 만원 단위를 원 단위로
        const annualRate = parseFloat(loanInterestRateInput.value) / 100;
        const loanYears = parseFloat(loanPeriodInput.value);

        if (isNaN(principal) || isNaN(annualRate) || isNaN(loanYears) || principal <= 0 || annualRate < 0 || loanYears <= 0) {
            monthlyPaymentSpan.textContent = '0';
            totalInterestSpan.textContent = '0';
            return;
        }

        const monthlyRate = annualRate / 12;
        const numberOfPayments = loanYears * 12;

        let monthlyPayment = 0;
        if (monthlyRate === 0) { // 이자율이 0%인 경우
            monthlyPayment = principal / numberOfPayments;
        } else {
            // 원리금 균등 상환 방식 공식
            monthlyPayment = principal * (monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) / (Math.pow(1 + monthlyRate, numberOfPayments) - 1);
        }

        const totalPayment = monthlyPayment * numberOfPayments;
        const totalInterest = totalPayment - principal;

        monthlyPaymentSpan.textContent = formatNumber(monthlyPayment);
        totalInterestSpan.textContent = formatNumber(totalInterest);
    }

    loanAmountInput.addEventListener('input', calculateLoan);
    loanInterestRateInput.addEventListener('input', calculateLoan);
    loanPeriodInput.addEventListener('input', calculateLoan);
    calculateLoan(); // 초기 계산 실행

    // 취득세 계산기
    const acquisitionPriceInput = document.getElementById('acquisition-price');
    const acquisitionAreaInput = document.getElementById('acquisition-area'); // 면적은 세율에 영향 없으나, UI 유지를 위해
    const isMultipleHouseSelect = document.getElementById('is-multiple-house');
    const acquisitionTaxSpan = document.getElementById('acquisition-tax');
    const localEducationTaxSpan = document.getElementById('local-education-tax');
    const ruralSpecialTaxSpan = document.getElementById('rural-special-tax');
    const totalAcquisitionTaxSpan = document.getElementById('total-acquisition-tax');

    function calculateAcquisitionTax() {
        const price = parseFloat(acquisitionPriceInput.value) * 10000; // 만원 단위를 원 단위로
        const isMultiple = isMultipleHouseSelect.value === 'true';

        if (isNaN(price) || price <= 0) {
            acquisitionTaxSpan.textContent = '0';
            localEducationTaxSpan.textContent = '0';
            ruralSpecialTaxSpan.textContent = '0';
            totalAcquisitionTaxSpan.textContent = '0';
            return;
        }

        let acquisitionTaxRate = 0; // 취득세율
        let ruralSpecialTaxRate = 0; // 농어촌특별세율
        // 지방교육세율은 취득세의 10%

        // 2024년 기준 간략화된 주택 취득세율 (조정지역 여부, 공시지가, 면적 등 복잡한 조건 제외)
        // 실제로는 6억 이하, 6억 초과 9억 이하, 9억 초과 구간별로 다르고
        // 조정지역 2주택, 3주택 이상, 법인 등 복잡한 조건이 많습니다.
        // 여기서는 매우 단순화하여 1주택/다주택만 구분
        if (!isMultiple) { // 1주택자
            if (price <= 600000000) acquisitionTaxRate = 0.01; // 6억 이하 1%
            else if (price <= 900000000) acquisitionTaxRate = 0.01 + ((price - 600000000) / 300000000) * 0.02; // 6~9억 1~3%
            else acquisitionTaxRate = 0.03; // 9억 초과 3%
            ruralSpecialTaxRate = 0.002; // 85m² 이하 비과세, 초과는 취득세의 0.2%
        } else { // 2주택 이상 (조정지역 여부, 주택 수에 따라 세율이 훨씬 복잡함)
                 // 여기서는 투기과열지구를 고려하여 2주택자 8%, 3주택 이상 12%의 최고 세율을 가정 (매우 단순화)
            acquisitionTaxRate = 0.08; // 조정지역 2주택 이상 간략화
            // if (price > 0 && isMultiple) acquisitionTaxRate = 0.12; // 3주택 이상 가정 (더 높을 수 있음)
            ruralSpecialTaxRate = 0.004; // 85m² 초과시 취득세의 0.4%
        }

        let calculatedAcquisitionTax = price * acquisitionTaxRate;
        const calculatedLocalEducationTax = calculatedAcquisitionTax * 0.1; // 취득세의 10%
        let calculatedRuralSpecialTax = 0;

        // 85m² 초과일 경우 농어촌특별세 부과 (간이 계산이므로 면적 input을 사용)
        const area = parseFloat(acquisitionAreaInput.value);
        if (area > 85) { // 85m² 초과일 경우 농어촌특별세
            calculatedRuralSpecialTax = price * ruralSpecialTaxRate;
        }


        const totalTax = calculatedAcquisitionTax + calculatedLocalEducationTax + calculatedRuralSpecialTax;

        acquisitionTaxSpan.textContent = formatNumber(calculatedAcquisitionTax);
        localEducationTaxSpan.textContent = formatNumber(calculatedLocalEducationTax);
        ruralSpecialTaxSpan.textContent = formatNumber(calculatedRuralSpecialTax);
        totalAcquisitionTaxSpan.textContent = formatNumber(totalTax);
    }

    acquisitionPriceInput.addEventListener('input', calculateAcquisitionTax);
    acquisitionAreaInput.addEventListener('input', calculateAcquisitionTax);
    isMultipleHouseSelect.addEventListener('change', calculateAcquisitionTax);
    calculateAcquisitionTax(); // 초기 계산 실행

    // 양도세 계산기
    const salePriceInput = document.getElementById('sale-price');
    const acquisitionCostYangdoInput = document.getElementById('acquisition-cost-yangdo');
    const holdingPeriodInput = document.getElementById('holding-period');
    const isLongTermOwnerSelect = document.getElementById('is-long-term-owner');
    const capitalGainSpan = document.getElementById('capital-gain');
    const capitalGainsTaxSpan = document.getElementById('capital-gains-tax');

    function calculateCapitalGainsTax() {
        const salePrice = parseFloat(salePriceInput.value) * 10000;
        const acquisitionCost = parseFloat(acquisitionCostYangdoInput.value) * 10000;
        const holdingYears = parseFloat(holdingPeriodInput.value);
        const isLongTermExempt = isLongTermOwnerSelect.value === 'true'; // 1세대 1주택 비과세 요건 충족 가정

        if (isNaN(salePrice) || isNaN(acquisitionCost) || isNaN(holdingYears) || salePrice <= 0 || acquisitionCost <= 0) {
            capitalGainSpan.textContent = '0';
            capitalGainsTaxSpan.textContent = '0';
            return;
        }

        const gain = salePrice - acquisitionCost;
        capitalGainSpan.textContent = formatNumber(gain);

        let capitalGainsTax = 0;

        if (gain <= 0) { // 양도 차익이 없으면 세금 없음
            capitalGainsTaxSpan.textContent = '0';
            return;
        }

        // 1세대 1주택 비과세 (12억 이하) - 가정
        // 실제로는 2년 거주 요건, 조정대상지역 취득 시 보유/거주 기간 등 복잡
        if (isLongTermExempt && holdingYears >= 2 && salePrice <= 1200000000) { // 12억까지 비과세 (2년 보유, 2년 거주 등 요건 가정)
            capitalGainsTaxSpan.textContent = '0';
            return;
        }

        // 일반 양도세율 (매우 단순화된 예시, 실제로는 누진공제, 장기보유특별공제 등 복잡)
        // 투기과열지구 내 다주택자 중과, 단기 양도 중과 등 고려 안 됨.
        let taxRate = 0.06; // 최저세율
        // 실제 세율 구간은 훨씬 더 세분화되어 있으며, 여기에 누진공제가 붙습니다.
        // 이 코드는 단순히 차익 구간별 최대 세율을 적용한 것이므로 실제와 다릅니다.
        if (gain <= 12000000) taxRate = 0.06;
        else if (gain <= 46000000) taxRate = 0.15;
        else if (gain <= 88000000) taxRate = 0.24;
        else if (gain <= 150000000) taxRate = 0.35;
        else if (gain <= 300000000) taxRate = 0.38;
        else if (gain <= 500000000) taxRate = 0.40;
        else taxRate = 0.42;

        capitalGainsTax = gain * taxRate;
        // 지방소득세 10% (양도소득세의 10%)
        capitalGainsTax = capitalGainsTax * 1.1;

        capitalGainsTaxSpan.textContent = formatNumber(capitalGainsTax);
    }

    salePriceInput.addEventListener('input', calculateCapitalGainsTax);
    acquisitionCostYangdoInput.addEventListener('input', calculateCapitalGainsTax);
    holdingPeriodInput.addEventListener('input', calculateCapitalGainsTax);
    isLongTermOwnerSelect.addEventListener('change', calculateCapitalGainsTax);
    calculateCapitalGainsTax(); // 초기 계산 실행

    // --- 부동산 계산기 로직 끝 ---


    // --- 스크롤 애니메이션 로직 시작 ---
    const calculatorSection = document.querySelector('.calculator-section');
    if (calculatorSection) {
        // 초기 상태를 CSS로 설정했으므로 JS에서는 opacity와 transform을 직접 변경합니다.
        // results.css에 transition 속성이 정의되어 있어야 부드러운 애니메이션이 됩니다.
        // calculatorSection.style.opacity = '0'; // (CSS에서 이미 처리)
        // calculatorSection.style.transform = 'translateY(50px)'; // (CSS에서 이미 처리)

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                    observer.unobserve(entry.target); // 한 번 보이면 더 이상 관찰하지 않음
                }
            });
        }, {
            threshold: 0.2 // 뷰포트의 20%가 보이면 실행
        });
        observer.observe(calculatorSection);
    }
    // --- 스크롤 애니메이션 로직 끝 ---

});