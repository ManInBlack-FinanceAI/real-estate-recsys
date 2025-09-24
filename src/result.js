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
});