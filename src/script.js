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
            alert('전문가 상담 페이지로 이동합니다.');
            // 실제 구현: window.location.href = 'consultation.html';
        });
    }

    // "로그인" 클릭 시 (예시: 로그인 모달 또는 페이지로 이동)
    const loginButton = document.querySelector('.main-nav .login');
    if (loginButton) {
        loginButton.addEventListener('click', () => {
            alert('로그인 페이지/모달을 띄웁니다.');
            // 실제 구현: showLoginModal(); 또는 window.location.href = 'login.html';
        });
    }

    console.log('Main page scripts loaded.');
});