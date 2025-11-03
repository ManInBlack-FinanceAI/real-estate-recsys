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
    hideVal();
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

  // Drag & Drop ranking (use all 5 on submit)
  let dragEl=null;
  rankList?.addEventListener('dragstart', e=>{
    if(e.target.tagName==='LI'){ dragEl=e.target; e.target.classList.add('dragging'); e.dataTransfer.effectAllowed='move'; }
  });
  rankList?.addEventListener('dragend', e=>{ if(e.target.tagName==='LI') e.target.classList.remove('dragging'); dragEl=null; });
  rankList?.addEventListener('dragover', e=>{
    e.preventDefault();
    const after = getAfter(rankList, e.clientY);
    if(!dragEl) return;
    if(after==null) rankList.appendChild(dragEl); else rankList.insertBefore(dragEl, after);
  });
  function getAfter(container,y){
    const els=[...container.querySelectorAll('li:not(.dragging)')];
    return els.reduce((close,child)=>{
      const box=child.getBoundingClientRect();
      const offset=y - box.top - box.height/2;
      return (offset<0 && offset>close.offset)?{offset,el:child}:close;
    },{offset:-Infinity,el:null}).el;
  }

  surveyForm.addEventListener('submit', (e)=>{
    e.preventDefault();
    const data = {
      property_type: (document.getElementById('property_type-input')||{}).value || null,
      deal_type: (document.getElementById('deal_type-input')||{}).value || null,
      budget_range: (document.getElementById('budget_range-input')||{}).value || null,
      loan_ratio: Number((document.getElementById('loanRatio')||{}).value || null),
      loan_rate: Number((document.getElementById('loanRate')||{}).value || null),
      regions: (document.getElementById('regions-input')||{}).value ? (document.getElementById('regions-input').value.split(',').map(s=>s.trim()).filter(Boolean)) : [],
      move_in: (document.getElementById('move_in-input')||{}).value || null,
      pyung_range: (document.getElementById('pyung_range-input')||{}).value || null,
      floor_group: (document.getElementById('floor_group-input')||{}).value || null,
      new_build: (document.getElementById('new_build-input')||{}).value || null,
      rank_all: Array.from(document.querySelectorAll('#rankList li')).map(li=>li.dataset.key)
    };
    data.rank_top5 = data.rank_all.slice(0,5);
    data.pref_is_apartment = data.property_type === '아파트';
    data.pref_is_sale = data.deal_type === '매매';
    localStorage.setItem('survey_v2', JSON.stringify(data));
    window.location.href = 'results.html';
  });

  // init
  setIdx(0);
  recalcLoan();
});