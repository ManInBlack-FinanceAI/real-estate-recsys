// loading.js

document.addEventListener('DOMContentLoaded', () => {
    const loadingMessageElement = document.getElementById('loading-message');
    const loadingTipElement = document.getElementById('loading-tip');
    const userName = "OOO"; // 나중에 사용자 이름을 실제 데이터로 대체

    const messages = [
        `${userName}님의 라이프스타일을 분석 중입니다...`,
        '12만 개의 매물 데이터를 비교하고 있습니다...',
        '주요 교통망과 주변 편의시설을 확인 중...',
        '투자 가치 분석을 위한 최신 시장 데이터를 적용 중...',
        '최적의 추천 매물을 선정하는 중입니다!'
    ];

    const tips = [
        "집을 고를 땐 주변 교통 편의성과 학군을 함께 고려하면 더욱 만족스러운 선택을 할 수 있습니다.",
        "부동산 투자 시에는 장기적인 관점에서 개발 호재와 인구 유입 추세를 분석하는 것이 중요합니다.",
        "전세 계약 전에는 반드시 등기부등본을 확인하여 근저당 설정 여부를 체크해야 합니다.",
        "아파트 평형 계산 시, 전용면적과 공용면적, 공급면적을 정확히 이해하는 것이 좋습니다.",
        "대출 계획은 부동산 계약 전 미리 금융기관과 상담하여 자신의 자금 조달 능력을 확인하는 것이 필수입니다."
    ];

    let messageIndex = 0;
    let tipIndex = 0;

    function updateLoadingMessage() {
        loadingMessageElement.textContent = messages[messageIndex];
        messageIndex = (messageIndex + 1) % messages.length;
    }

    function updateLoadingTip() {
        loadingTipElement.textContent = tips[tipIndex];
        tipIndex = (tipIndex + 1) % tips.length;
    }

    // 3초마다 메시지 및 팁 업데이트
    const messageInterval = setInterval(updateLoadingMessage, 3000);
    const tipInterval = setInterval(updateLoadingTip, 5000);

    // 10초 후 결과 페이지로 이동 (로딩 시간 조절 가능)
    setTimeout(() => {
        clearInterval(messageInterval);
        clearInterval(tipInterval);
        window.location.href = 'results.html';
    }, 10000); // 10초 후에 이동
});