// survey.js
document.addEventListener('DOMContentLoaded', () => {
    const surveyForm = document.getElementById('property-recommendation-survey');
    const questionSlides = document.querySelectorAll('.question-slide');
    const residentialQuestionsGroup = document.getElementById('residential-questions');
    const investmentQuestionsGroup = document.getElementById('investment-questions');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const submitBtn = document.getElementById('submit-survey-btn');
    const progressBarFill = document.querySelector('.progress-bar-fill');

    let currentQuestionIndex = 0;
    let selectedPurpose = ''; // '주거용' 또는 '투자용'
    const userAnswers = {}; // 사용자 답변 저장

    // 모든 질문 슬라이드 목록 (목적 질문 포함)
    let allActiveQuestions = Array.from(questionSlides);

    function updateQuestionVisibility() {
        questionSlides.forEach(slide => slide.classList.remove('active'));
        // allActiveQuestions 배열을 사용하여 현재 질문만 표시
        if (allActiveQuestions[currentQuestionIndex]) {
            allActiveQuestions[currentQuestionIndex].classList.add('active');
        }

        // 이전/다음/제출 버튼 가시성 업데이트
        prevBtn.style.display = currentQuestionIndex > 0 ? 'flex' : 'none';
        nextBtn.style.display = (currentQuestionIndex < allActiveQuestions.length - 1) ? 'flex' : 'none';
        submitBtn.style.display = (currentQuestionIndex === allActiveQuestions.length - 1) ? 'flex' : 'none';

        updateProgressBar();
    }

    function updateProgressBar() {
        const progress = ((currentQuestionIndex + 1) / allActiveQuestions.length) * 100;
        progressBarFill.style.width = `${progress}%`;
    }

    function goToNextQuestion() {
        // 현재 질문의 유효성 검사 (필요 시 추가)
        const currentQuestionElement = allActiveQuestions[currentQuestionIndex];
        const questionId = currentQuestionElement.dataset.questionId;
        const inputElement = document.getElementById(`${questionId}-input`) || currentQuestionElement.querySelector('input[type="text"], input[type="number"], textarea');

        // 선택 또는 입력이 되었는지 확인
        let isValid = true;
        if (inputElement && inputElement.required && !inputElement.value && !userAnswers[questionId]) {
             // 텍스트/숫자 입력이거나, 선택형인데 아직 선택이 안된 경우
            if (inputElement.type === 'hidden' && (!userAnswers[questionId] || userAnswers[questionId].length === 0)) {
                isValid = false;
            } else if (inputElement.type !== 'hidden' && !inputElement.value.trim()) {
                isValid = false;
            }
        } else if (questionId.includes('important_conditions') && userAnswers[questionId] && userAnswers[questionId].length < 1) { // 최소 1개는 선택하도록
             isValid = false;
        }


        if (!isValid) {
            alert('질문에 답변해주세요!');
            return;
        }

        if (currentQuestionIndex < allActiveQuestions.length - 1) {
            currentQuestionIndex++;
            updateQuestionVisibility();
        }
    }

    function goToPrevQuestion() {
        if (currentQuestionIndex > 0) {
            currentQuestionIndex--;
            updateQuestionVisibility();
        }
    }

    // 초기 질문(목적 선택)의 옵션 버튼 이벤트 리스너
    document.querySelector('.question-slide[data-question-id="purpose"] .option-buttons').addEventListener('click', (e) => {
        const btn = e.target.closest('.survey-option-btn');
        if (btn) {
            // 모든 버튼에서 selected 클래스 제거
            btn.parentNode.querySelectorAll('.survey-option-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected'); // 클릭된 버튼에 selected 클래스 추가

            selectedPurpose = btn.dataset.value;
            userAnswers.purpose = selectedPurpose;
            document.getElementById('purpose-input').value = selectedPurpose;

            // 주거용/투자용 질문 그룹 업데이트
            if (selectedPurpose === '주거용') {
                residentialQuestionsGroup.style.display = 'block';
                investmentQuestionsGroup.style.display = 'none';
                // 목적 질문과 주거용 질문만 포함
                allActiveQuestions = Array.from(document.querySelectorAll('.question-slide[data-question-id="purpose"], #residential-questions .question-slide'));
            } else if (selectedPurpose === '투자용') {
                residentialQuestionsGroup.style.display = 'none';
                investmentQuestionsGroup.style.display = 'block';
                // 목적 질문과 투자용 질문만 포함
                allActiveQuestions = Array.from(document.querySelectorAll('.question-slide[data-question-id="purpose"], #investment-questions .question-slide'));
            }
            // 목적 질문 이후 바로 다음 질문으로 넘어가도록
            goToNextQuestion();
        }
    });

    // 다른 모든 옵션 버튼에 대한 이벤트 리스너 (일반 선택 및 다중 선택 처리)
    surveyForm.addEventListener('click', (e) => {
        const btn = e.target.closest('.survey-option-btn');
        if (btn && !btn.parentNode.closest('.question-slide[data-question-id="purpose"]')) { // 목적 질문 제외
            const questionSlide = btn.closest('.question-slide');
            const questionId = questionSlide.dataset.questionId;
            const inputElement = document.getElementById(`${questionId}-input`);

            if (btn.parentNode.classList.contains('multi-select')) {
                // 다중 선택 처리
                btn.classList.toggle('selected');
                const selectedOptions = Array.from(btn.parentNode.querySelectorAll('.survey-option-btn.selected')).map(b => b.dataset.value);
                userAnswers[questionId] = selectedOptions;
                if (inputElement) { // hidden input이 있다면 업데이트
                    inputElement.value = JSON.stringify(selectedOptions); // 배열을 JSON 문자열로 저장
                }
            } else {
                // 단일 선택 처리
                btn.parentNode.querySelectorAll('.survey-option-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                userAnswers[questionId] = btn.dataset.value;
                if (inputElement) { // hidden input이 있다면 업데이트
                    inputElement.value = btn.dataset.value;
                }
            }
        }
    });

    // 텍스트/숫자 입력 필드 변경 시 userAnswers 업데이트
    surveyForm.addEventListener('input', (e) => {
        const input = e.target;
        if (input.tagName === 'INPUT' || input.tagName === 'TEXTAREA') {
            const questionSlide = input.closest('.question-slide');
            if (questionSlide) {
                const questionId = questionSlide.dataset.questionId;
                userAnswers[questionId] = input.value.trim();
            }
        }
    });


    // 내비게이션 버튼 이벤트 리스너
    nextBtn.addEventListener('click', goToNextQuestion);
    prevBtn.addEventListener('click', goToPrevQuestion);

    // 폼 제출 이벤트 리스너
    surveyForm.addEventListener('submit', (e) => {
        e.preventDefault();
        console.log('최종 사용자 답변:', userAnswers);
        // 사용자 답변을 로딩 페이지로 전달
        localStorage.setItem('userSurveyAnswers', JSON.stringify(userAnswers));
        window.location.href = 'loading.html';
    });

    // 초기화
    updateQuestionVisibility();
});