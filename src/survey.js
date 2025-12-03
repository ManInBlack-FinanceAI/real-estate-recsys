// survey.js (v2 buttons-all, conditional 7-1, results redirect)
document.addEventListener('DOMContentLoaded', () => {
  const surveyForm = document.getElementById('property-recommendation-survey');
  const slides = Array.from(document.querySelectorAll('.question-slide'));
  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');
  const submitBtn = document.getElementById('submit-survey-btn');
  const bar = document.getElementById('srvyProgress');
  const valBox = document.getElementById('validation-message');

  const loanRatio = document.getElementById('loanRatio');
  const loanRatioOut = document.getElementById('loanRatioOut');
  const loanRate = document.getElementById('loanRate');
  const loanCalc = document.getElementById('loanCalc');
  const rankList = document.getElementById('rankList');

  const budgetMinInput = document.getElementById('budget-min');
  const budgetMaxInput = document.getElementById('budget-max');
  const budgetHidden = document.getElementById('budget_range-input');

  // 🔹 새로 추가: 역세권 도보 시간 입력
  const stationWalkInput  = document.getElementById('station-walk-minutes');
  const stationWalkHidden = document.getElementById('station_walk-input');

  function updateBudgetHidden() {
    if (!budgetHidden) return;
    const min = Number(budgetMinInput?.value || '');
    const max = Number(budgetMaxInput?.value || '');

    if (!isNaN(min) && !isNaN(max) && min > 0 && max > 0 && min <= max) {
      // 예: "3~8" 이런 형태로 저장
      budgetHidden.value = `${min}~${max}`;
      hideVal();
    } else {
    budgetHidden.value = '';
  }
}

// 🔹 새로 추가: 역세권 hidden 값 동기화
function updateStationWalkHidden() {
  if (!stationWalkHidden) return;
  const v = Number(stationWalkInput?.value || '');

  if (!isNaN(v) && v > 0) {
    stationWalkHidden.value = String(v); // 숫자를 그대로 저장
    hideVal();
  } else {
    stationWalkHidden.value = '';
  }
}

budgetMinInput?.addEventListener('input', updateBudgetHidden);
budgetMaxInput?.addEventListener('input', updateBudgetHidden);

// 🔹 새로 추가
stationWalkInput?.addEventListener('input', updateStationWalkHidden);

let idx = 0;

function setIdx(i){
  slides.forEach((s,k)=> s.style.display = (k===i ? 'block':'none'));
  idx = i;
  updateBar();
  updateNav();
  window.scrollTo({top:0, behavior:'smooth'});
}
function updateBar(){
  if(!bar) return;
  const p = ((idx+1)/slides.length)*100;
  bar.style.width = p.toFixed(1)+'%';
}
function updateNav(){
  prevBtn.style.display = idx===0 ? 'none' : 'inline-flex';
  const last = (idx === slides.length-1);
  nextBtn.style.display = last ? 'none' : 'inline-flex';
  submitBtn.style.display = last ? 'inline-flex' : 'none';
}

// Button selection handler (single & multi)
surveyForm.addEventListener('click', (e)=>{
  const btn = e.target.closest('.survey-option-btn');
  if(!btn) return;
  const slide = btn.closest('.question-slide');
  const isMulti = btn.parentElement && btn.parentElement.classList.contains('multi-select');
  const qid = slide?.dataset?.questionId;
  const hidden = document.getElementById(qid + '-input');

  if(isMulti){
    btn.classList.toggle('selected');
    const selected = Array.from(slide.querySelectorAll('.survey-option-btn.selected')).map(b=>b.dataset.value);
    if(hidden) hidden.value = selected.join(',');
  } else {
  btn.parentNode.querySelectorAll('.survey-option-btn').forEach(b=> b.classList.remove('selected'));
  btn.classList.add('selected');
  if(hidden) hidden.value = btn.dataset.value;
}
});

function validate(){
  const slide = slides[idx];
  if(!slide) return true;
  const qid = slide.dataset && slide.dataset.questionId;
  if(qid === 'loan'){ return true; } // 4번은 디자인만 변경
  const hidden = document.getElementById(qid + '-input');
  if(hidden){
    const val = (hidden.value || '').trim();
    if(!val){ showVal('선택지를 선택해주세요.'); return false; }
  }
  hideVal(); return true;
}
function showVal(msg){ if(valBox){ valBox.textContent = msg; valBox.style.display = 'block'; } }
function hideVal(){ if(valBox){ valBox.style.display = 'none'; } }

prevBtn.addEventListener('click', ()=> setIdx(Math.max(0, idx-1)));

nextBtn.addEventListener('click', ()=>{
  if(!validate()) return;
  setIdx(Math.min(slides.length-1, idx+1));
});

// Step 4 loan calc (visual)
const fmt = n => Number(n).toLocaleString('ko-KR');
function recalcLoan(){
  const ratio = Number(loanRatio?.value || 0);
  if(loanRatioOut) loanRatioOut.textContent = ratio + '%';
  const rate = Number(loanRate?.value || 0);
  let msg = `대출 비중: ${ratio}%`;
  if(rate>0){ msg += ` · 적용 금리: ${rate}%`; }
  if(loanCalc) loanCalc.textContent = msg;
}
loanRatio?.addEventListener('input', recalcLoan);
loanRate?.addEventListener('input', recalcLoan);

// ✅ 클릭 기반 중요 항목 순위 지정 (네모 박스에 숫자 표시)
let priorityOrder = [];

function syncPriorityUI() {
  const hidden = document.getElementById('priority-input');
  if (!hidden || !rankList) return;

  const items = Array.from(rankList.querySelectorAll('li'));

  items.forEach(li => {
    const key = li.dataset.key;
    const box = li.querySelector('.priority-box');
    const rankIdx = priorityOrder.indexOf(key);

    if (rankIdx === -1) {
      li.dataset.rank = '';
      li.classList.remove('selected');
      if (box) box.textContent = '';
    } else {
      const rank = rankIdx + 1;
      li.dataset.rank = String(rank);
      li.classList.add('selected');
      if (box) box.textContent = rank;
    }
  });

  hidden.value = priorityOrder.join(',');
}

if (rankList) {
  rankList.querySelectorAll('li').forEach(li => {
    li.addEventListener('click', () => {
      const key = li.dataset.key;
      const idx = priorityOrder.indexOf(key);

      if (idx !== -1) {
        // 다시 클릭 → 해제
        priorityOrder.splice(idx, 1);
      } else {
        if (priorityOrder.length >= 5) return; // 최대 5개까지만
        priorityOrder.push(key);
      }

      syncPriorityUI();
    });
  });

  const resetBtn = document.getElementById('priority-reset');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      priorityOrder = [];
      syncPriorityUI();
    });
  }

  // 초기 상태 반영
  syncPriorityUI();
}



surveyForm.addEventListener('submit', (e)=>{
  e.preventDefault();
  const data = {
    property_type: (document.getElementById('property_type-input')||{}).value || null,
    deal_type: (document.getElementById('deal_type-input')||{}).value || null,
    budget_range: (document.getElementById('budget_range-input')||{}).value || null,
    loan_ratio: Number((document.getElementById('loanRatio')||{}).value || 0),
    loan_rate: Number((document.getElementById('loanRate')||{}).value || 0),
    regions: (document.getElementById('regions-input')||{}).value ? (document.getElementById('regions-input').value.split(',').map(s=>s.trim()).filter(Boolean)) : [],
    move_in: (document.getElementById('move_in-input')||{}).value || null,
    pyung_range: (document.getElementById('pyung_range-input')||{}).value || null,
    floor_group: (document.getElementById('floor_group-input')||{}).value || null,
    new_build: (document.getElementById('new_build-input')||{}).value || null,
    // 🔹 새로 추가: 역세권 도보 시간(분)
    station_walk:  Number((document.getElementById('station_walk-input') || {}).value || 0),
    rank_all: (() => {
      const priorityInput = document.getElementById('priority-input');
      if (priorityInput && priorityInput.value.trim()) {
        return priorityInput.value
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
      }
      // 만약 사용자가 순위를 전혀 안 눌렀으면, 기존 순서를 그대로 사용
      return Array.from(document.querySelectorAll('#rankList li')).map(li => li.dataset.key);
    })()
  };
  data.rank_top5 = data.rank_all.slice(0,5);

  data.pref_is_apartment = data.property_type === '아파트';
  data.pref_is_sale = data.deal_type === '매매';

  // 세션 스토리지에도 저장 (페이지 새로고침 시에도 유지)
  sessionStorage.setItem('survey_v2', JSON.stringify(data));
  localStorage.setItem('survey_v2', JSON.stringify(data));

  console.log('설문 데이터 저장:', data);
  window.location.href = 'results.html';
});

// init
setIdx(0);
recalcLoan();
});