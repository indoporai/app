(()=>{const K='ipa615',db=()=>{try{return JSON.parse(localStorage.getItem(K)||'{}')}catch{return{}}},save=x=>localStorage.setItem(K,JSON.stringify(x));
const modal=h=>{document.querySelector('.b615o')?.remove();let o=document.createElement('div');o.className='b615o';o.innerHTML='<div class="b615m"><button class="b615x">×</button>'+h+'</div>';document.body.appendChild(o);o.querySelector('.b615x').onclick=()=>o.remove();return o};
function rating(b){let key=b.dataset.journeyRate||'local',s=db(),cur=s.ratings?.[key]?.rating||0,o=modal(`<h2>Avaliar lugar</h2><p>Toque nas estrelas</p><div class="b615stars">${[1,2,3,4,5].map(n=>`<button data-s="${n}">★</button>`).join('')}</div><b class="b615score"></b><textarea placeholder="Comentário opcional"></textarea><button class="btn btn-primary b615save">Salvar avaliação</button>`),v=cur;
const paint=()=>{o.querySelectorAll('[data-s]').forEach(x=>x.classList.toggle('on',+x.dataset.s<=v));o.querySelector('.b615score').textContent=v?v+'/5':'Selecione uma nota'};
o.querySelectorAll('[data-s]').forEach(x=>{let f=e=>{e.preventDefault();e.stopPropagation();v=+x.dataset.s;paint()};x.addEventListener('pointerup',f);x.addEventListener('click',f)});paint();
o.querySelector('.b615save').onclick=()=>{if(!v)return alert('Selecione uma nota');s=db();s.ratings||={};s.ratings[key]={rating:v,note:o.querySelector('textarea').value,date:new Date().toISOString()};save(s);try{let p=key.split('|');if(window.IPAData?.saveJourneyPlace&&p.length>2)IPAData.saveJourneyPlace(p[0],p[1],p[2],s.ratings[key])}catch{}o.remove()} }
function moment(b){let key=b.dataset.moment,o=modal(`<h2>📷 Registrar momento</h2><p>Essa mídia alimentará Memórias, Álbum, Linha do Tempo e Filme.</p>
<div class="b615mediachoices">
<label class="b615up">📸 Tirar foto<input class="b615camera" type="file" accept="image/*" capture="environment"></label>
<label class="b615up">🖼️ Escolher da galeria<input class="b615gallery" type="file" accept="image/*,video/*" multiple></label>
</div>
<div class="b615prev"></div><input class="b615cap" placeholder="Legenda"><label><input class="b615fav" type="checkbox"> ❤️ Destaque da viagem</label><button class="btn btn-primary b615ms">Salvar momento</button>`),files=[];
const pick=e=>{files=[...e.target.files];let p=o.querySelector('.b615prev');p.innerHTML='';files.slice(0,8).forEach(f=>{let u=URL.createObjectURL(f),el=document.createElement(f.type.startsWith('video')?'video':'img');el.src=u;if(el.tagName==='VIDEO')el.controls=true;p.appendChild(el)})};
o.querySelector('.b615camera').onchange=pick;o.querySelector('.b615gallery').onchange=pick;
const dataURL=f=>new Promise((ok,no)=>{let r=new FileReader();r.onload=()=>ok(r.result);r.onerror=no;r.readAsDataURL(f)});
o.querySelector('.b615ms').onclick=async()=>{
 if(!files.length)return alert('Escolha uma foto ou vídeo');
 const t=typeof activeTrip==='function'?activeTrip():null;
 const parts=String(key||'').split('|');
 const day=Number(parts[1]||((typeof state!=='undefined'&&state.tripDay)||1));
 const placeId=parts[2]||'';
 const placeName=decodeURIComponent(b.dataset.placeName||'Momento da viagem');
 const caption=o.querySelector('.b615cap').value.trim();
 const featured=o.querySelector('.b615fav').checked;
 let local=db();local.moments||=[];
 for(const f of files){
   const type=f.type.startsWith('video/')?'video':'image';
   let src='',path='';
   try{
     if(window.IPAFirebase?.uploadMemory && t?.clientId){
       const up=await window.IPAFirebase.uploadMemory(f,t.clientId,t.id);
       src=up?.url||''; path=up?.path||'';
     }else{
       src=await dataURL(f);
     }
   }catch(err){
     try{src=await dataURL(f)}catch(e){}
   }
   const memory={tripId:t?.id||'',clientId:t?.clientId||'',prompt:caption||placeName,type,src,url:src,path,name:f.name,day,placeId,placeName,featured};
   try{window.IPAData?.addMemory(memory)}catch(e){console.warn('Memória local pendente',e)}
   local.moments.push({id:'m-'+Date.now()+'-'+Math.random().toString(36).slice(2,8),tripId:t?.id||'',place:key,placeId,placeName,name:f.name,type:f.type,media:src,caption,featured,date:new Date().toISOString()});
 }
 try{save(local)}catch(e){console.warn('Cache local da mídia não coube; memória principal foi preservada',e)}
 if(window.IPAFirebase?.user && window.IPAFirebase?.syncNow){try{await window.IPAFirebase.syncNow()}catch(e){console.warn('Sincronização pendente',e)}}
 o.remove();alert(`${files.length} momento${files.length>1?'s':''} salvo${files.length>1?'s':''} em Memórias ✓`);
 try{render()}catch(e){}
} }
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
function decorate(){decorateExplore();document.querySelectorAll('[data-journey-rate]').forEach(b=>{if(!b.dataset.b615){b.dataset.b615='1';let m=document.createElement('button');m.type='button';m.className='b615moment';m.dataset.moment=b.dataset.journeyRate;m.textContent='📷 Momento';b.parentElement?.appendChild(m)}})}
document.addEventListener('pointerup',e=>{let r=e.target.closest('[data-journey-rate]');if(r){e.preventDefault();e.stopImmediatePropagation();rating(r);return}let m=e.target.closest('.b615moment');if(m){e.preventDefault();e.stopImmediatePropagation();moment(m);return}},true);
new MutationObserver(decorate).observe(document.documentElement,{subtree:true,childList:true});addEventListener('DOMContentLoaded',decorate);window.IPABeta615={explore};})();