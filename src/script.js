// script.js

document.addEventListener('DOMContentLoaded', () => {
    // "서비스 자세히 보기" 버튼 클릭 시
    const learnMoreButton = document.querySelector('.navbar-center .learn-more');
    if (learnMoreButton) {
        learnMoreButton.addEventListener('click', (e) => {
            e.preventDefault();
            // 스크롤을 서비스 소개 섹션으로 이동
            const serviceSection = document.querySelector('.service-introduction-section');
            if (serviceSection) {
                serviceSection.scrollIntoView({ behavior: 'smooth' });
            }
        });
    }

    // "전문가 상담" 버튼 클릭 시 (예시: 상담 페이지로 이동)
    const bookSessionButton = document.querySelector('.main-nav .book-session');
    if (bookSessionButton) {
        bookSessionButton.addEventListener('click', (e) => {
            e.preventDefault();
            alert('추천 사례 페이지로 이동합니다.');
            // 실제 구현: window.location.href = 'cases.html';
        });
    }

    // "로그인" 클릭 시 모달 열기
    const loginButton = document.querySelector('.main-nav .login');
    const authModal = document.getElementById('auth-modal');
    const authLogin = authModal ? authModal.querySelector('.auth-login') : null;
    const authSignup = authModal ? authModal.querySelector('.auth-signup') : null;
    const openSignupBtn = document.getElementById('open-signup');
    const backToLoginBtn = document.getElementById('back-to-login');

    const openAuthModal = (mode = 'login') => {
        if (!authModal || !authLogin || !authSignup) return;
        authModal.classList.add('active');

        if (mode === 'signup') {
            authLogin.classList.remove('active');
            authSignup.classList.add('active');
        } else {
            authLogin.classList.add('active');
            authSignup.classList.remove('active');
        }
    };

    if (loginButton) {
        loginButton.addEventListener('click', (e) => {
            e.preventDefault();
            openAuthModal('login');
        });
    }

    if (openSignupBtn) {
        openSignupBtn.addEventListener('click', (e) => {
            e.preventDefault();
            openAuthModal('signup');
        });
    }

    if (backToLoginBtn) {
        backToLoginBtn.addEventListener('click', (e) => {
            e.preventDefault();
            openAuthModal('login');
        });
    }


    console.log('Main page scripts loaded.');

    // 문의 / FAQ 모달 열기
    const faqLink = document.getElementById('nav-faq');
    const faqModal = document.getElementById('faq-modal');

    if (faqLink && faqModal) {
        faqLink.addEventListener('click', (e) => {
            e.preventDefault();
            faqModal.classList.add('active');
        });
    }

    // FAQ 검색 기능
    const faqSearchInput = document.getElementById('faq-search-input');
    if (faqSearchInput && faqModal) {
        faqSearchInput.addEventListener('input', () => {
            const keyword = faqSearchInput.value.toLowerCase();
            const items = faqModal.querySelectorAll('.faq-item');
            items.forEach((item) => {
                const text = item.textContent.toLowerCase();
                item.style.display = text.includes(keyword) ? '' : 'none';
            });
        });
    }

    // "시작하기" 버튼 → 설문 페이지로 이동
    const startNowButton = document.querySelector('.navbar-right .start-now');
    if (startNowButton) {
        startNowButton.addEventListener('click', () => {
            window.location.href = 'survey.html';
        });
    }

    // 모든 모달 닫기 공통 처리
    const modals = document.querySelectorAll('.modal');
    const modalCloseButtons = document.querySelectorAll('.modal-close');

    modalCloseButtons.forEach((btn) => {
        btn.addEventListener('click', () => {
            const parentModal = btn.closest('.modal');
            if (parentModal) {
                parentModal.classList.remove('active');
            }
        });
    });

    // 배경(어두운 영역) 클릭 시 닫기
    modals.forEach((modal) => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    });

});