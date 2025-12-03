// 태그 필터
(function(){
  const pills = document.querySelectorAll('.an-pill');
  const rows = [...document.querySelectorAll('#an-required tr, #an-optional tr')];
  function apply(tag){
    pills.forEach(p=>p.classList.toggle('is-active', p.dataset.tag===tag));
    if(tag==='all'){ rows.forEach(r=>r.style.display=''); return; }
    rows.forEach(r=>{
      const tags = (r.dataset.tags||'').split(/\s+/);
      r.style.display = tags.includes(tag)? '' : 'none';
    });
  }
  pills.forEach(p=>p.addEventListener('click', ()=>apply(p.dataset.tag)));
})();

// JSON 스키마 모달
(function(){
  const modal = document.getElementById('an-modal');
  const openBtn = document.getElementById('an-open-json');
  const closeBtn = document.getElementById('an-close-modal');
  const backdrop = modal.querySelector('.an-modal-backdrop');
  const toggle = (open)=> modal.setAttribute('aria-hidden', open? 'false':'true');
  if(openBtn) openBtn.addEventListener('click', ()=>toggle(true));
  if(closeBtn) closeBtn.addEventListener('click', ()=>toggle(false));
  if(backdrop) backdrop.addEventListener('click', ()=>toggle(false));
  document.addEventListener('keydown', (e)=>{ if(e.key==='Escape') toggle(false); });
})();