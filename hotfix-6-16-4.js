(()=>{
 const STORE='ipa615';
 const get=()=>{try{return JSON.parse(localStorage.getItem(STORE)||'{}')}catch{return{}}};
 const moments=()=>Array.isArray(get().moments)?get().moments:[];
 const ratings=()=>get().ratings||{};
 const stats=()=>{const m=moments();return{total:m.length,photos:m.filter(x=>!String(x.type||'').startsWith('video')).length,videos:m.filter(x=>String(x.type||'').startsWith('video')).length,featured:m.filter(x=>x.featured).length}};
 const stars=v=>[1,2,3,4,5].map(n=>`<span class="${n<=v?'on':''}">★</span>`).join('');
 function decorateRatings(){
  document.querySelectorAll('[data-journey-rate]').forEach(btn=>{
   const card=btn.closest('.during-place-card'); if(!card)return;
   const name=card.querySelector('b'); if(!name)return;
   const key=btn.dataset.journeyRate, v=Number(ratings()[key]?.rating||0);
   let el=card.querySelector('.hf6164-stars');
   if(!el){el=document.createElement('span');el.className='hf6164-stars';name.insertAdjacentElement('afterend',el)}
   el.innerHTML=stars(v);el.title=v?`Avaliação ${v}/5`:'Ainda não avaliado';
  });
 }
 function timelineHTML(){
  const m=moments();
  if(!m.length)return '<div class="hf6164-empty">Sua linha do tempo será preenchida conforme você registrar momentos.</div>';
  return `<div class="hf6164-timeline">${m.map(x=>`<div class="hf6164-row"><span>${String(x.type||'').startsWith('video')?'🎥':'📷'}</span><div><b>${x.caption||'Momento da viagem'}</b><small>${new Date(x.date||Date.now()).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}</small></div></div>`).join('')}</div>`;
 }
 function statsHTML(){const s=stats();return `<div class="hf6164-stats"><div><strong>${s.total}</strong><small>momentos</small></div><div><strong>${s.photos}</strong><small>fotos</small></div><div><strong>${s.videos}</strong><small>vídeos</small></div><div><strong>${s.featured}</strong><small>destaques</small></div></div>`}
 function decorateMemories(){
  const hero=[...document.querySelectorAll('.album-hero')][0];
  if(hero){
   const s=stats(), spans=hero.querySelectorAll('.album-stats span');
   if(spans[0])spans[0].textContent=`📸 ${s.photos} fotos`;
   if(spans[1])spans[1].textContent=`🎥 ${s.videos} vídeos`;
   const parent=hero.parentElement||document.querySelector('#view');
   if(parent&&!parent.querySelector('.hf6164-memory-summary')){
    const sec=document.createElement('section');sec.className='section hf6164-memory-summary';sec.innerHTML=`<div class="section-head"><div><span class="eyebrow">MEMÓRIAS REAIS</span><h2>O que você já registrou</h2></div></div>${statsHTML()}<div class="section-head hf6164-head"><div><span class="eyebrow">LINHA DO TEMPO</span><h2>Sua viagem acontecendo</h2></div></div>${timelineHTML()}`;
    hero.insertAdjacentElement('afterend',sec);
   }
  }
  const afterHero=document.querySelector('.after-personalized-hero');
  if(afterHero){
   const grid=[...document.querySelectorAll('.after-stats-grid')][0],s=stats();
   if(grid){const cells=grid.querySelectorAll('div strong'); if(cells[2])cells[2].textContent=s.photos;if(cells[3])cells[3].textContent=s.videos}
   const story=[...document.querySelectorAll('.section-head h2')].find(x=>/memórias adicionadas|comece seu álbum/i.test(x.textContent||''));if(story)story.textContent=s.total?`${s.total} memórias adicionadas`:'Comece seu álbum agora';
   if(!document.querySelector('.hf6164-after-timeline')){const sec=document.createElement('section');sec.className='section hf6164-after-timeline';sec.innerHTML=`<div class="section-head"><div><span class="eyebrow">LINHA DO TEMPO</span><h2>Momentos registrados</h2></div></div>${timelineHTML()}`;afterHero.parentElement?.appendChild(sec)}
  }
 }
 function enhanceMovie(){
  document.querySelectorAll('.movie615').forEach(box=>{
   if(box.dataset.hf6164)return;box.dataset.hf6164='1';
   const scenes=[...box.querySelectorAll('.movie615scene')]; if(!scenes.length)return;
   const controls=box.querySelector('.movie615controls');if(!controls)return;
   const prog=controls.querySelector('[data-progress615]'); if(prog)prog.textContent=`1 / ${scenes.length}`;
   let i=0,t=null;
   const show=n=>{scenes[i]?.classList.remove('active');i=(n+scenes.length)%scenes.length;scenes[i]?.classList.add('active');if(prog)prog.textContent=`${i+1} / ${scenes.length}`;box.querySelectorAll('[data-hfscene]').forEach(b=>b.classList.toggle('active',Number(b.dataset.hfscene)===i))};
   const strip=document.createElement('div');strip.className='hf6164-thumbs';strip.innerHTML=scenes.map((sc,n)=>{const img=sc.querySelector('img');return `<button data-hfscene="${n}">${img?`<img src="${img.src}">`:sc.querySelector('video')?'🎥':'📷'}</button>`}).join('');controls.before(strip);
   strip.querySelectorAll('[data-hfscene]').forEach(b=>b.onclick=()=>show(Number(b.dataset.hfscene)));
   const prev=document.createElement('button');prev.className='hf6164-nav';prev.textContent='‹';prev.onclick=()=>show(i-1);controls.prepend(prev);
   const next=document.createElement('button');next.className='hf6164-nav';next.textContent='›';next.onclick=()=>show(i+1);controls.appendChild(next);
   show(0);
  });
 }
 function run(){decorateRatings();decorateMemories();enhanceMovie()}
 document.addEventListener('click',e=>{if(e.target.closest('.b615save'))setTimeout(run,80)},true);
 new MutationObserver(()=>requestAnimationFrame(run)).observe(document.documentElement,{subtree:true,childList:true});
 addEventListener('DOMContentLoaded',run);setTimeout(run,300);
})();
