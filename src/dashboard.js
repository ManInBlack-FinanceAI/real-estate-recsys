// 이 페이지에서 보여줄 아파트 ID (나중에 쿼리스트링으로 바꿔도 됨)
const TARGET_APT_ID = "1";

async function loadCSV(url) {
  const res = await fetch(url);
  const text = await res.text();

  const lines = text.trim().split("\n");
  const headers = lines[0].split(",").map((h) => h.trim());

  return lines.slice(1).map((line) => {
    const cols = line.split(",");
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = (cols[idx] || "").trim();
    });
    return obj;
  });
}

// 숫자 포맷 도우미
function formatNumber(numStr) {
  if (!numStr) return "-";
  const n = Number(numStr);
  if (Number.isNaN(n)) return numStr;
  return n.toLocaleString("ko-KR");
}

async function initDashboard() {
  // 1) 기본 정보 CSV 불러오기
  const detailRows = await loadCSV("apartment_detail.csv");
  const apt = detailRows.find((row) => row.id === TARGET_APT_ID);
  if (!apt) {
    console.error("해당 ID의 아파트 데이터를 찾을 수 없습니다.");
    return;
  }

  // 헤더
  document.getElementById("aptName").textContent = apt.name;
  document.getElementById("aptLocation").textContent = apt.location;

  document.getElementById(
    "aptApproved"
  ).textContent = `${apt.approved_date} (${apt.age})`;

  document.getElementById(
    "aptHouseholds"
  ).textContent = `${formatNumber(apt.households)}세대`;

  // 요약 카드
  const expectedPriceText =
    apt.expected_price && !Number.isNaN(Number(apt.expected_price))
      ? `${formatNumber(apt.expected_price)} 만원`
      : apt.expected_price || "-";

  document.getElementById("expectedPrice").textContent = expectedPriceText;

  document.getElementById(
    "recommendScore"
  ).textContent = `${apt.recommend_score} 점`;

  // 점수 막대 (0~100 기준)
  const score = Math.min(100, Math.max(0, Number(apt.recommend_score) || 0));
  const fill = document.getElementById("scoreBarFill");
  fill.style.width = `${score}%`;

  // 학군/교통 요약
  const schoolSummary = `${apt.school_elem} · ${apt.school_mid} · ${apt.school_high}`;
  document.getElementById("schoolSummary").textContent = schoolSummary;

  document.getElementById("transportSummary").textContent =
    apt.transport_summary;

  // 학군 카드
  document.getElementById("schoolElem").textContent = apt.school_elem;
  document.getElementById("schoolMid").textContent = apt.school_mid;
  document.getElementById("schoolHigh").textContent = apt.school_high;

  // 교통 카드 (예: "지하철:봉천역 도보 7분;버스:OO정류장 도보 3분")
  const transportTbody = document.getElementById("transportTbody");
  transportTbody.innerHTML = "";
  if (apt.transport_list) {
    const items = apt.transport_list.split(";");
    items.forEach((item) => {
      if (!item.trim()) return;
      const [mode, time] = item.split("|");
      const tr = document.createElement("tr");
      const tdMode = document.createElement("td");
      const tdTime = document.createElement("td");
      tdMode.textContent = mode || "";
      tdTime.textContent = time || "";
      tr.appendChild(tdMode);
      tr.appendChild(tdTime);
      transportTbody.appendChild(tr);
    });
  }

  // 오른쪽 기타 정보
  document.getElementById("detailLocation").textContent = apt.location;
  document.getElementById(
    "detailApproved"
  ).textContent = `${apt.approved_date} (${apt.age})`;

  document.getElementById(
    "detailHouseholds"
  ).textContent = `${formatNumber(
    apt.households
  )}세대 (해당 면적 ${formatNumber(apt.households_area)}세대)`;

  document.getElementById("detailStructure").textContent = apt.structure;
  document.getElementById("detailHeating").textContent = apt.heating;
  document.getElementById("detailParking").textContent = apt.parking;
  document.getElementById(
    "detailFarCoverage"
  ).textContent = `${apt.far} / ${apt.coverage}`;
  document.getElementById("detailOfficePhone").textContent =
    apt.office_phone || "-";
  document.getElementById("detailConstructor").textContent = apt.constructor;

  // 2) 가격 CSV 불러와서 그래프 그리기
  const priceRows = await loadCSV("apartment_price.csv");
  const aptPrices = priceRows
    .filter((row) => row.id === TARGET_APT_ID)
    .sort((a, b) => (a.date > b.date ? 1 : -1));

  const labels = aptPrices.map((r) => r.date);
  const prices = aptPrices.map((r) => Number(r.price));

  const ctx = document.getElementById("priceChart").getContext("2d");
  new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "실거래가",
          data: prices,
          borderWidth: 2,
          tension: 0.2,
          pointRadius: 2,
          borderColor: "#2563eb",
          backgroundColor: "rgba(37, 99, 235, 0.08)",
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          display: false,
        },
      },
      scales: {
        x: {
          ticks: {
            maxTicksLimit: 6,
          },
        },
        y: {
          beginAtZero: false,
        },
      },
    },
  });
}

// 🔹 상단 배너 버튼 동작
function initBanner() {
  const banner = document.querySelector(".navbar");
  const closeBtn = document.querySelector(".navbar-right .fa-times");
  const startBtn = document.querySelector(".start-now");

  if (closeBtn && banner) {
    closeBtn.addEventListener("click", () => {
      banner.style.display = "none";
    });
  }

  if (startBtn) {
    startBtn.addEventListener("click", () => {
      // 기존 zip 기준으로 설문 페이지로 이동하도록 처리
      window.location.href = "survey.html";
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initDashboard();
  initBanner();
});
