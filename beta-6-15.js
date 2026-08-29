(()=>{const K='ipa615',db=()=>{try{return JSON.parse(localStorage.getItem(K)||'{}')}catch{return{}}},save=x=>localStorage.setItem(K,JSON.stringify(x));
const modal=h=>{document.querySelector('.b615o')?.remove();let o=document.createElement('div');o.className='b615o';o.innerHTML='<div class="b615m"><button class="b615x">×</button>'+h+'</div>';document.body.appendChild(o);o.querySelector('.b615x').onclick=()=>o.remove();return o};
function rating(b){let key=b.dataset.journeyRate||'local',s=db(),cur=s.ratings?.[key]?.rating||0,o=modal(`<h2>Avaliar lugar</h2><p>Toque nas estrelas</p><div class="b615stars">${[1,2,3,4,5].map(n=>`<button data-s="${n}">★</button>`).join('')}</div><b class="b615score"></b><textarea placeholder="Comentário opcional"></textarea><button class="btn btn-primary b615save">Salvar avaliação</button>`),v=cur;
const paint=()=>{o.querySelectorAll('[data-s]').forEach(x=>x.classList.toggle('on',+x.dataset.s<=v));o.querySelector('.b615score').textContent=v?v+'/5':'Selecione uma nota'};
o.querySelectorAll('[data-s]').forEach(x=>{let f=e=>{e.preventDefault();e.stopPropagation();v=+x.dataset.s;paint()};x.addEventListener('pointerup',f);x.addEventListener('click',f)});paint();
o.querySelector('.b615save').onclick=()=>{if(!v)return alert('Selecione uma nota');s=db();s.ratings||={};s.ratings[key]={rating:v,note:o.querySelector('textarea').value,date:new Date().toISOString()};save(s);try{let p=key.split('|');if(window.IPAData?.saveJourneyPlace&&p.length>2)IPAData.saveJourneyPlace(p[0],p[1],p[2],s.ratings[key])}catch{}o.remove()} }
function moment(b){let key=b.dataset.moment,o=modal(`<h2>📷 Registrar momento</h2><p>Essa mídia alimentará Memórias, Álbum e Filme.</p>
<div class="b615mediachoices">
<label class="b615up">📸 Tirar foto<input class="b615camera" type="file" accept="image/*" capture="environment"></label>
<label class="b615up">🖼️ Escolher da galeria<input class="b615gallery" type="file" accept="image/*,video/*" multiple></label>
</div>
<div class="b615prev"></div><input class="b615cap" placeholder="Legenda"><label><input class="b615fav" type="checkbox"> ❤️ Destaque da viagem</label><button class="btn btn-primary b615ms">Salvar momento</button>`),files=[];
const pick=e=>{files=[...e.target.files];let p=o.querySelector('.b615prev');p.innerHTML='';files.slice(0,8).forEach(f=>{let u=URL.createObjectURL(f),el=document.createElement(f.type.startsWith('video')?'video':'img');el.src=u;if(el.tagName==='VIDEO')el.controls=true;p.appendChild(el)})};
o.querySelector('.b615camera').onchange=pick;o.querySelector('.b615gallery').onchange=pick;
o.querySelector('.b615ms').onclick=()=>{if(!files.length)return alert('Escolha uma foto ou vídeo');let s=db();s.moments||=[];files.forEach(f=>s.moments.push({place:key,name:f.name,type:f.type,caption:o.querySelector('.b615cap').value,featured:o.querySelector('.b615fav').checked,date:new Date().toISOString()}));save(s);o.remove();alert('Momento registrado ✓')} }
async function fetchSmartPlaces(q){
 try{
  const r=await fetch('/api/places/search?q='+encodeURIComponent(q));
  const j=await r.json();
  return j.places||[];
 }catch(e){return []}
}
function smartCards(a){
 return a.slice(0,8).map(p=>`<div class="b615rec"><div><b>${p.name||'Sugestão'}</b><small>${p.address||''}</small>${p.rating?`<em>⭐ ${p.rating}${p.reviews?` · ${p.reviews} avaliações`:''}</em>`:''}</div><div class="b615recActions">${p.mapsUrl?`<a href="${p.mapsUrl}" target="_blank">Mapa</a>`:''}<button data-add="${p.name||'Lugar'}">+ Adicionar à rota</button></div></div>`).join('')
}
function bindAdd(root){root.querySelectorAll('[data-add]').forEach(x=>x.onclick=()=>{let s=db();s.routeAdds||=[];s.routeAdds.push({name:x.dataset.add,date:new Date().toISOString()});save(s);alert('Adicionado à rota pessoal ✓')})}
function explore(){let o=modal(`<h2>✨ Explorar</h2><p>Dicas inteligentes fora do seu roteiro.</p><div class="b615filters"><button data-q="cafe">☕ Cafés</button><button data-q="restaurant">🍽️ Restaurantes</button><button data-q="bar">🍸 Bares</button><button data-q="shopping">🛍️ Compras</button><button data-q="tourist attraction">📸 Descobrir</button></div><div class="b615res">Escolha uma categoria.</div>`),r=o.querySelector('.b615res');
o.querySelectorAll('[data-q]').forEach(b=>b.onclick=async()=>{r.textContent='Buscando dicas inteligentes…';let a=await fetchSmartPlaces(b.dataset.q);r.innerHTML=a.length?smartCards(a):'Nenhuma sugestão encontrada agora.';bindAdd(r)})}
function decorateExplore(){
 const title=[...document.querySelectorAll('h2')].find(x=>/mapa do roteiro/i.test(x.textContent||''));
 if(!title)return;
 const view=title.closest('#view')||document.querySelector('#view')||document.body;
 if(view.querySelector('.b615smartSection'))return;
 const sec=document.createElement('section');sec.className='section b615smartSection';
 sec.innerHTML=`<div class="section-head"><div><span class="eyebrow">DICAS INTELIGENTES</span><h2>Descubra algo fora do roteiro ✨</h2></div></div>
 <div class="b615filters"><button data-inline-q="cafe">☕ Cafés</button><button data-inline-q="restaurant">🍽️ Restaurantes</button><button data-inline-q="bar">🍸 Bares</button><button data-inline-q="shopping">🛍️ Compras</button><button data-inline-q="tourist attraction">📸 Surpreenda-me</button></div>
 <div class="b615inlineRes"><p class="b615hint">Escolha uma categoria e o Indo por Aí busca sugestões do Google Places que não fazem parte do roteiro.</p></div>`;
 view.appendChild(sec);
 const res=sec.querySelector('.b615inlineRes');
 sec.querySelectorAll('[data-inline-q]').forEach(b=>b.onclick=async()=>{res.innerHTML='<p class="b615hint">Buscando boas ideias…</p>';let a=await fetchSmartPlaces(b.dataset.inlineQ);res.innerHTML=a.length?smartCards(a):'<p class="b615hint">Nenhuma sugestão encontrada agora.</p>';bindAdd(res)});
}
function decorate(){decorateExplore();document.querySelectorAll('[data-journey-rate]').forEach(b=>{if(!b.dataset.b615){b.dataset.b615='1';let m=document.createElement('button');m.type='button';m.className='b615moment';m.dataset.moment=b.dataset.journeyRate;m.textContent='📷 Momento';b.parentElement?.appendChild(m)}});[...document.querySelectorAll('button,a')].filter(x=>/^\s*explorar\s*$/i.test(x.textContent||'')).forEach(x=>x.dataset.b615explore='1')}
document.addEventListener('pointerup',e=>{let r=e.target.closest('[data-journey-rate]');if(r){e.preventDefault();e.stopImmediatePropagation();rating(r);return}let m=e.target.closest('.b615moment');if(m){e.preventDefault();e.stopImmediatePropagation();moment(m);return}let x=e.target.closest('[data-b615explore]');if(x){e.preventDefault();e.stopImmediatePropagation();explore()}},true);
new MutationObserver(decorate).observe(document.documentElement,{subtree:true,childList:true});addEventListener('DOMContentLoaded',decorate);window.IPABeta615={explore};})();