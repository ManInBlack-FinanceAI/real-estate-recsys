// URL에서 아파트 ID 추출
function getApartmentIdFromURL() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('id');
}

// 숫자 포맷 도우미
function formatNumber(num) {
  if (num === null || num === undefined || num === '') return '-';
  const n = Number(num);
  if (Number.isNaN(n)) return num;
  return n.toLocaleString('ko-KR');
}

// 가격 포맷 (만원 → 억 원)
function formatPrice(priceInManwon) {
  if (!priceInManwon || priceInManwon === 0) return '-';
  const eok = priceInManwon / 10000;
  if (eok >= 1) {
    return `${eok.toFixed(1)}억 원`;
  }
  return `${formatNumber(priceInManwon)} 만원`;
}

// API에서 아파트 데이터 가져오기
async function fetchApartmentData(id) {
  try {
    const response = await fetch(`/cau19/api/apartment_detail.php?id=${id}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'API 호출 실패');
    }
    
    return data;
  } catch (error) {
    console.error('아파트 데이터 로드 오류:', error);
    throw error;
  }
}

async function initDashboard() {
  const aptId = getApartmentIdFromURL();
  
  if (!aptId) {
    alert('아파트 ID가 지정되지 않았습니다.');
    // 기본값으로 임시 표시 (개발용)
    console.warn('아파트 ID가 없어 기본 데이터를 사용합니다.');
    return;
  }
  
  try {
    // API에서 데이터 가져오기
    const data = await fetchApartmentData(aptId);
    const apt = data.apartment;
    const priceHistory = data.price_history;
    const stats = data.statistics;
    
    console.log('아파트 데이터 로드 완료:', apt);
    
    // ========== 헤더 정보 ==========
    document.getElementById('aptName').textContent = apt.name || '아파트 이름';
    document.getElementById('aptLocation').textContent = apt.location || '주소 정보';
    
    // 준공일/연차
    const approvedText = apt.build_year 
      ? `${apt.build_year}년 준공 (${apt.age})`
      : '정보 없음';
    document.getElementById('aptApproved').textContent = approvedText;
    
    // 세대수 (DB에 없으므로 거래 건수로 대체 또는 "-"로 표시)
    document.getElementById('aptHouseholds').textContent = 
      `거래 ${formatNumber(stats.total_transactions)}건`;
    
    // ========== 요약 카드 ==========
    // 예상 가격 (평균 가격 사용)
    const expectedPriceText = formatPrice(stats.avg_price);
    document.getElementById('expectedPrice').textContent = expectedPriceText;
    
    // 추천 점수 (임시로 거래 건수 기반 계산)
    const recommendScore = Math.min(100, Math.max(50, 50 + stats.total_transactions));
    document.getElementById('recommendScore').textContent = `${recommendScore} 점`;
    
    // 점수 막대
    const fill = document.getElementById('scoreBarFill');
    fill.style.width = `${recommendScore}%`;
    
    // 학군/교통 요약 (DB에 없으므로 교통 정보로 대체)
    const schoolSummary = '학군 정보 준비 중';
    document.getElementById('schoolSummary').textContent = schoolSummary;
    
    const transportSummary = apt.nearest_station 
      ? `${apt.nearest_station} 도보 ${Math.round(apt.station_walk_time || 0)}분`
      : '교통 정보 없음';
    document.getElementById('transportSummary').textContent = transportSummary;
    
    // ========== 학군 카드 (DB에 없으므로 준비 중) ==========
    document.getElementById('schoolElem').textContent = '정보 준비 중';
    document.getElementById('schoolMid').textContent = '정보 준비 중';
    document.getElementById('schoolHigh').textContent = '정보 준비 중';
    
    // ========== 교통 카드 ==========
    const transportTbody = document.getElementById('transportTbody');
    transportTbody.innerHTML = '';
    
    // 지하철 정보
    if (apt.nearest_station) {
      const tr = document.createElement('tr');
      const tdMode = document.createElement('td');
      const tdTime = document.createElement('td');
      tdMode.textContent = `지하철 (${apt.nearest_station})`;
      tdTime.textContent = `도보 약 ${Math.round(apt.station_walk_time || 0)}분`;
      tr.appendChild(tdMode);
      tr.appendChild(tdTime);
      transportTbody.appendChild(tr);
    }
    
    // 버스 정보
    if (apt.bus_stops > 0) {
      const tr = document.createElement('tr');
      const tdMode = document.createElement('td');
      const tdTime = document.createElement('td');
      tdMode.textContent = '버스';
      tdTime.textContent = `주변 ${apt.bus_stops}개 정류장`;
      tr.appendChild(tdMode);
      tr.appendChild(tdTime);
      transportTbody.appendChild(tr);
    }
    
    // ========== 오른쪽 기본 정보 ==========
    document.getElementById('detailLocation').textContent = apt.location || '-';
    document.getElementById('detailApproved').textContent = approvedText;
    
    // 세대수 (DB에 없으므로 거래 통계로 대체)
    document.getElementById('detailHouseholds').textContent = 
      `거래 ${formatNumber(stats.total_transactions)}건 (평균 ${apt.area_pyung}평)`;
    
    // 현관구조 (DB에 없음)
    document.getElementById('detailStructure').textContent = '정보 없음';
    
    // 난방 (DB에 없음)
    document.getElementById('detailHeating').textContent = '정보 없음';
    
    // 주차 (DB에 없음)
    document.getElementById('detailParking').textContent = '정보 없음';
    
    // 용적률/건폐율 (DB에 없음)
    document.getElementById('detailFarCoverage').textContent = '정보 없음';
    
    // 관리사무소 (DB에 없음)
    document.getElementById('detailOfficePhone').textContent = '정보 없음';
    
    // 건설사 (DB에 없음)
    document.getElementById('detailConstructor').textContent = '정보 없음';
    
    // ========== 가격 그래프 ==========
    if (priceHistory && priceHistory.length > 0) {
      // 날짜별로 정렬 (이미 정렬되어 있지만 확인)
      const sortedHistory = priceHistory
        .filter(item => item.거래금액_만원 > 0) // 가격이 0인 항목 제외
        .sort((a, b) => {
          const dateA = new Date(a.거래일자);
          const dateB = new Date(b.거래일자);
          return dateA - dateB;
        });
      
      const labels = sortedHistory.map(item => {
        const date = new Date(item.거래일자);
        return `${date.getFullYear()}.${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      });
      
      const prices = sortedHistory.map(item => item.거래금액_만원);
      
      const canvas = document.getElementById('priceChart');
      const ctx = canvas.getContext('2d');
      
      // 기존 차트가 있다면 파괴
      if (canvas.chart) {
        canvas.chart.destroy();
      }
      
      // 새 차트 생성
      canvas.chart = new Chart(ctx, {
        type: 'line',
        data: {
          labels,
          datasets: [{
            label: '실거래가 (만원)',
            data: prices,
            borderWidth: 2,
            tension: 0.2,
            pointRadius: 3,
            pointHoverRadius: 5,
            borderColor: '#2563eb',
            backgroundColor: 'rgba(37, 99, 235, 0.1)',
            fill: true
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true,
              position: 'top'
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  return `거래가: ${formatNumber(context.parsed.y)} 만원`;
                }
              }
            }
          },
          scales: {
            x: {
              ticks: {
                maxTicksLimit: 10
              }
            },
            y: {
              beginAtZero: false,
              ticks: {
                callback: function(value) {
                  return formatNumber(value);
                }
              }
            }
          }
        }
      });
    } else {
      // 거래 내역이 없을 경우
      const chartContainer = document.getElementById('priceChart').parentElement;
      chartContainer.innerHTML = '<p style="text-align: center; padding: 40px; color: #999;">거래 내역이 없습니다.</p>';
    }
    
  } catch (error) {
    console.error('대시보드 초기화 오류:', error);
    alert('아파트 정보를 불러오는 중 오류가 발생했습니다.');
  }
}

// 🔹 상단 배너 버튼 동작
function initBanner() {
  const banner = document.querySelector('.navbar');
  const closeBtn = document.querySelector('.navbar-right .fa-times');
  const startBtn = document.querySelector('.start-now');
  
  if (closeBtn && banner) {
    closeBtn.addEventListener('click', () => {
      banner.style.display = 'none';
    });
  }
  
  if (startBtn) {
    startBtn.addEventListener('click', () => {
      window.location.href = 'survey.html';
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initDashboard();
  initBanner();
});
