// results.js

document.addEventListener('DOMContentLoaded', () => {
    const userPersonalizedTitle = document.getElementById('user-personalized-title');
    const userSummary = document.getElementById('user-summary');
    const matchPercentage = document.getElementById('match-percentage');
    const recommendationList = document.getElementById('recommendation-list');
    const reasonKeywordsContainer = document.getElementById('reason-keywords');

    // 로컬 스토리지에서 사용자 답변 가져오기
    const userSurveyAnswersString = localStorage.getItem('userSurveyAnswers');
    let userAnswers = {};
    if (userSurveyAnswersString) {
        userAnswers = JSON.parse(userSurveyAnswersString);
    }

    // 가상의 사용자 이름 (실제로는 로그인 정보 등에서 가져옴)
    const userName = "김부자"; // 예시 사용자 이름

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

    // 가상의 매칭 점수 (실제로는 추천 알고리즘 결과)
    const randomMatch = Math.floor(Math.random() * (99 - 85 + 1)) + 85; // 85% ~ 99%
    matchPercentage.textContent = `${randomMatch}%`;

    // 2. 추천 매물 리스트 생성 (가상 데이터)
    const recommendedProperties = generateDummyProperties(userAnswers); // 사용자 답변 기반 더미 데이터 생성
    recommendationList.innerHTML = ''; // 기존 내용 비우기

    if (recommendedProperties.length > 0) {
        recommendedProperties.forEach(property => {
            const card = document.createElement('div');
            card.classList.add('property-card');
            card.innerHTML = `
                <img src="${property.image}" alt="${property.name} 이미지" class="property-image">
                <div class="card-details">
                    <h3>${property.name}</h3>
                    <p class="location">${property.location}</p>
                    <p class="price">${property.price}</p>
                    <div class="keywords">
                        ${property.keywords.map(kw => `<span class="keyword">#${kw}</span>`).join('')}
                    </div>
                    <button class="view-details-btn">상세보기</button>
                </div>
            `;
            recommendationList.appendChild(card);
        });
    } else {
        recommendationList.innerHTML = '<p style="text-align: center; color: #777;">아직 추천할 매물이 없습니다. 설문 내용을 다시 확인해주세요.</p>';
    }


    // 3. 추천 이유 키워드 업데이트
    reasonKeywordsContainer.innerHTML = '';
    const reasons = generateReasonKeywords(userAnswers); // 사용자 답변 기반 추천 이유 생성
    if (reasons.length > 0) {
        reasons.forEach(reason => {
            const tag = document.createElement('span');
            tag.classList.add('reason-tag');
            tag.textContent = `#${reason}`;
            reasonKeywordsContainer.appendChild(tag);
        });
    } else {
         reasonKeywordsContainer.innerHTML = '<p style="font-size: 0.9em; color: #999;">설문 결과를 바탕으로 한 추천 키워드가 없습니다.</p>';
    }


    // 가상 추천 매물 데이터 생성 함수 (실제 API 연동 시 이 부분 대체)
    function generateDummyProperties(answers) {
        const purpose = answers.purpose;
        const properties = [];

        if (purpose === '주거용') {
            properties.push(
                {
                    name: "강남역 센트럴 아이파크",
                    location: "서울 강남구 역삼동",
                    price: "매매 12억 5천만원 / 전세 7억",
                    keywords: ["역세권", "신축", "편의시설"],
                    image: "https://via.placeholder.com/300x200/4285F4/FFFFFF?text=Apt+Gangnam"
                },
                {
                    name: "분당 파크뷰",
                    location: "경기 성남시 분당구 정자동",
                    price: "매매 9억 8천만원 / 전세 6억",
                    keywords: ["공원인접", "학군우수", "조용한환경"],
                    image: "https://via.placeholder.com/300x200/34A853/FFFFFF?text=Apt+Bundang"
                },
                {
                    name: "마포 한강 뷰 아파트",
                    location: "서울 마포구 상수동",
                    price: "매매 10억 1천만원 / 전세 6억 5천",
                    keywords: ["한강뷰", "교통편리", "깔끔한인테리어"],
                    image: "https://via.placeholder.com/300x200/FBBC05/FFFFFF?text=Apt+Mapo"
                }
            );
        } else if (purpose === '투자용') {
            properties.push(
                {
                    name: "역삼동 오피스텔 (수익률 5.5%)",
                    location: "서울 강남구 역삼동",
                    price: "매매 3억 5천만원",
                    keywords: ["역세권", "임대수익", "소액투자"],
                    image: "https://via.placeholder.com/300x200/EA4335/FFFFFF?text=Office+Yeoksam"
                },
                {
                    name: "판교 상가 (시세차익 기대)",
                    location: "경기 성남시 분당구 판교동",
                    price: "매매 15억",
                    keywords: ["개발호재", "시세차익", "배후수요풍부"],
                    image: "https://via.placeholder.com/300x200/4285F4/FFFFFF?text=Shop+Pangyo"
                },
                {
                    name: "영등포 재개발 예정지 빌라",
                    location: "서울 영등포구 신길동",
                    price: "매매 4억 2천만원",
                    keywords: ["재개발", "장기투자", "미래가치"],
                    image: "https://via.placeholder.com/300x200/34A853/FFFFFF?text=Villa+Yeongdeungpo"
                }
            );
        }
        return properties;
    }

    // 가상 추천 이유 키워드 생성 함수
    function generateReasonKeywords(answers) {
        const purpose = answers.purpose;
        const keywords = [];

        // 공통 키워드
        keywords.push("개인맞춤분석");
        keywords.push("최신매물정보");

        if (purpose === '주거용') {
            const conditions = answers.important_conditions_res || [];
            if (conditions.includes("교통 편의성")) keywords.push("편리한대중교통");
            if (conditions.includes("자녀 교육 환경")) keywords.push("우수한학군");
            if (conditions.includes("자연 친화적 환경")) keywords.push("쾌적한자연환경");
            if (conditions.includes("편의시설")) keywords.push("생활편의시설");
            if (conditions.includes("신축/깔끔한 인테리어")) keywords.push("신축/리모델링");
            if (conditions.includes("조용한 환경")) keywords.push("소음걱정NO");
            if (conditions.includes("주차 공간")) keywords.push("넉넉한주차");
            if (answers.region_res) keywords.push(answers.region_res.split(',')[0].trim()); // 첫 번째 지역 키워드
            if (answers.housing_type_res) keywords.push(answers.housing_type_res[0]); // 첫 번째 주거 형태
        } else if (purpose === '투자용') {
            const conditions = answers.important_conditions_inv || [];
            if (conditions.includes("공실 위험도")) keywords.push("안정적수익");
            if (conditions.includes("개발 호재")) keywords.push("개발호재기대");
            if (conditions.includes("역세권/교통")) keywords.push("교통프리미엄");
            if (conditions.includes("환금성")) keywords.push("높은환금성");
            if (conditions.includes("세금 혜택")) keywords.push("세금절감");
            if (conditions.includes("안정적인 배후수요")) keywords.push("풍부한배후수요");
            if (answers.investment_type) keywords.push(answers.investment_type[0]); // 첫 번째 투자 유형
            if (answers.expected_profit_type) keywords.push(answers.expected_profit_type); // 수익 형태
        }

        // 중복 제거 및 적절한 개수로 제한
        return Array.from(new Set(keywords)).slice(0, 7); // 최대 7개 키워드
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