const $=s=>document.querySelector(s);
const brl=v=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(v||0));
let currentView='dashboard', selectedTripId='trip-portugal-2026';
const moduleLabels={itinerary:'Roteiro',documents:'Documentos',luggage:'Mala inteligente',checkin:'Check-in',exchange:'Exchange',payments:'Pagamentos',community:'Comunidade',live:'Live',album:'Álbum',movie:'Filme da viagem',passport:'Passaporte'};
function db(){
 const d=IPAData.getAll();
 d.clients=Array.isArray(d.clients)?d.clients:[];
 d.trips=Array.isArray(d.trips)?d.trips:[];
 d.itineraryTemplates=Array.isArray(d.itineraryTemplates)?d.itineraryTemplates:[];
 d.payments=Array.isArray(d.payments)?d.payments:[];
 d.benefits=Array.isArray(d.benefits)?d.benefits:[];
 return d
}
function modal(html){$('#adminModalBody').innerHTML=html;$('#adminModal').classList.add('open')}
function closeModal(){ $('#adminModal').classList.remove('open') }
if($('#closeAdminModal')) $('#closeAdminModal').onclick=closeModal;

function metric(icon,label,value,sub=''){return `<article class="metric"><span>${icon}</span><div><small>${label}</small><strong>${value}</strong><em>${sub}</em></div></article>`}
function dashboard(){
 const d=db(), active=d.trips.filter(t=>t.status!=='Concluído').length, pending=d.payments.filter(p=>p.status!=='Pago').reduce((s,p)=>s+Number(p.amount||0),0);
 return `<section class="welcome"><div><span class="eyebrow">VISÃO GERAL</span><h2>Bom dia! 👋</h2><p>Veja o que está acontecendo nas experiências dos seus clientes.</p></div><button class="primary" data-new-trip>+ Nova viagem</button></section>
 <div class="metrics">${metric('👤','Clientes ativos',(d.clients||[]).length,'base atual')}${metric('✈','Viagens ativas',active,'em operação')}${metric('💳','Em aberto',brl(pending),'a receber')}${metric('🔴','Lives programadas',(d.trips||[]).filter(t=>t.modules?.live).length,'viagens habilitadas')}</div>
 <section class="panel"><div class="panel-head"><div><span class="eyebrow">OPERAÇÃO</span><h2>Viagens</h2></div><button class="ghost" data-admin-view-jump="trips">Ver todas →</button></div>${tripTable(d.trips||[])}</section>
 <section class="panel"><div class="panel-head"><div><span class="eyebrow">PRÓXIMAS AÇÕES</span><h2>O que precisa da sua atenção</h2></div></div>
 <div class="attention"><div>💳 <span><b>3 cobranças em aberto</b><small>Você pode enviar lembretes pelo Financeiro.</small></span></div><div>✈ <span><b>Portugal 2026 está publicado</b><small>Use “Ver como cliente” para conferir a experiência.</small></span></div><div>🔴 <span><b>Live ainda não habilitada</b><small>Ative o módulo na viagem quando estiver pronta.</small></span></div></div></section>`;
}
function tripTable(trips){return `<div class="trip-table">${trips.map(t=>{const c=(db().clients||[]).find(x=>x.id===t.clientId);return `<button class="trip-row" data-edit-trip="${t.id}"><div class="flag">🇵🇹</div><div><b>${t.name}</b><small>${c?.name||'Cliente'} · ${t.destination}</small></div><span class="plan-pill">${t.plan}</span><span class="status-pill ${t.published?'published':''}">${t.published?'Publicado':t.status}</span><em>›</em></button>`}).join('')}</div>`}
function clientsView(){
 const d=db();return `<div class="view-actions"><div><span class="eyebrow">CRM</span><h2>Clientes</h2><p>O cliente pode ter várias viagens ao longo do tempo.</p></div><button class="primary" data-new-client>+ Novo cliente</button></div>
 <section class="panel"><div class="client-grid">${(d.clients||[]).map(c=>`<article class="client-card"><div class="client-avatar">${c.name.split(' ').map(x=>x[0]).slice(0,2).join('')}</div><div><h3>${c.name}</h3><p>${c.email}</p><small>${(d.trips||[]).filter(t=>t.clientId===c.id).length} viagem(ns)</small></div><button class="ghost" data-client-trips="${c.id}">Ver viagens</button></article>`).join('')}</div></section>`;
}
function tripsView(){
 const d=db();return `<div class="view-actions"><div><span class="eyebrow">EXPERIÊNCIAS</span><h2>Viagens</h2><p>Monte e personalize o que cada cliente verá no app.</p></div><button class="primary" data-new-trip>+ Nova viagem</button></div><section class="panel">${tripTable(d.trips||[])}</section>`;
}
function tripEditor(id){
 selectedTripId=id;const d=db(),t=(d.trips||[]).find(x=>x.id===id);if(!t)return tripsView();const c=(d.clients||[]).find(x=>x.id===t.clientId);
 return `<div class="editor-head"><button class="back" data-back-trips>← Viagens</button><div><span class="eyebrow">${c?.name||'CLIENTE'}</span><h2>${t.name}</h2><p>${t.destination} · ${t.startDate} → ${t.endDate}</p></div><div class="editor-actions"><button class="ghost" data-preview-trip="${t.id}">👁 Ver como cliente</button><button class="${t.published?'success':'primary'}" data-publish-trip="${t.id}">${t.published?'✓ Publicado':'🚀 Publicar viagem'}</button></div></div>
 <div class="editor-tabs"><button class="active">Visão geral</button><button data-scroll="modules">Módulos</button><button data-scroll="route">Roteiro</button><button data-scroll="services">Serviços</button></div>
 <section class="panel"><div class="panel-head"><div><span class="eyebrow">CONFIGURAÇÃO</span><h2>Plano contratado</h2></div><span class="plan-pill">${t.plan}</span></div>
 <div class="plan-select">${['Explore','Signature','Elite','Groups'].map(p=>`<button data-set-plan="${p}" class="${t.plan===p?'selected':''}"><b>${p}</b><small>${p==='Explore'?'Roteiro + app':p==='Signature'?'Pré-embarque + compras':p==='Elite'?'Experiência full':'Grandes grupos'}</small></button>`).join('')}</div></section>
 <section class="panel" id="modules"><div class="panel-head"><div><span class="eyebrow">EXPERIÊNCIA DO CLIENTE</span><h2>O que aparece no app</h2><p>Ligue ou desligue módulos para esta viagem.</p></div></div>
 <div class="module-grid">${Object.entries(moduleLabels).map(([key,label])=>`<label class="module-card ${t.modules?.[key]?'on':''}"><div><b>${label}</b><small>${t.modules?.[key]?'Visível para o cliente':'Oculto'}</small></div><input type="checkbox" data-trip-module="${key}" ${t.modules?.[key]?'checked':''}><span class="switch"></span></label>`).join('')}</div></section>
 <section class="panel" id="route"><div class="panel-head"><div><span class="eyebrow">ROTEIRO</span><h2>Personalização da viagem</h2></div><button class="ghost" data-choose-template>Usar modelo</button></div>
 <div class="itinerary-admin">${(t.itinerary||[]).map(day=>`<div class="day-admin"><div class="day-number">${day.day}</div><div><b>${day.title}</b>${day.places.map(p=>`<small>• ${p}</small>`).join('')}</div><button class="icon-btn">⋯</button></div>`).join('')||'<p>Nenhum roteiro configurado.</p>'}</div></section>
 <section class="panel" id="services"><div class="panel-head"><div><span class="eyebrow">SERVIÇOS E RECEITA</span><h2>Benefícios da viagem</h2></div></div><div class="service-chips"><span>💱 Exchange</span><span>📶 eSIM</span><span>🚐 Transfer</span><span>🛡 Seguro</span><span>🎟 Experiências</span></div></section>`;
}
function templatesView(){
 const d=db();return `<div class="view-actions"><div><span class="eyebrow">BIBLIOTECA</span><h2>Modelos de roteiro</h2><p>Crie uma vez e reutilize em novas vendas.</p></div><button class="primary">+ Novo modelo</button></div><div class="template-grid">${(d.itineraryTemplates||[]).map(t=>`<article class="template-card"><div class="template-cover">🗺️</div><span class="eyebrow">${t.destination}</span><h3>${t.name}</h3><p>${t.description}</p><div><span>${t.days} dias</span><button class="ghost" data-use-template="${t.id}">Usar roteiro</button></div></article>`).join('')}</div>`;
}
function financeView(){
 const d=db(),total=d.payments.reduce((s,p)=>s+p.amount,0),paid=d.payments.filter(p=>p.status==='Pago').reduce((s,p)=>s+p.amount,0),pending=total-paid;
 return `<div class="view-actions"><div><span class="eyebrow">FINANCEIRO</span><h2>Pagamentos</h2><p>Crie cobranças e acompanhe recebimentos.</p></div><button class="primary" data-new-charge>+ Nova cobrança</button></div>
 <div class="metrics">${metric('💼','Contratado',brl(total))}${metric('✓','Recebido',brl(paid))}${metric('⏱','Em aberto',brl(pending))}</div>
 <section class="panel"><div class="payment-admin-list">${d.payments.map(p=>`<div class="payment-admin-row"><div><b>${p.title}</b><small>${p.trip} · ${p.description}</small></div><strong>${brl(p.amount)}</strong><span class="${p.status==='Pago'?'paid':'pending'}">${p.status}</span><button class="ghost" data-remind="${p.id}">Lembrar</button></div>`).join('')}</div></section>`;
}
function partnersView(){
 const d=db();return `<div class="view-actions"><div><span class="eyebrow">MONETIZAÇÃO</span><h2>Parceiros e benefícios</h2><p>Escolha quais ofertas aparecem para os clientes.</p></div></div><section class="panel"><div class="partner-list">${d.benefits.map(b=>`<label class="partner-row"><div><b>${b.title}</b><small>${b.sponsorLabel} · ${b.partner}</small></div><input type="checkbox" data-benefit-toggle="${b.id}" ${b.enabled?'checked':''}><span class="switch"></span></label>`).join('')}</div></section>`;
}
function liveViewAdmin(){return `<div class="view-actions"><div><span class="eyebrow">LIVE</span><h2>Central de transmissões</h2><p>O fluxo real será conectado ao Cloudflare/Daily na próxima integração.</p></div></div><section class="panel"><div class="empty-live"><span>🔴</span><h2>Live pronta para integração</h2><p>As viagens com o módulo Live habilitado aparecerão aqui para iniciar a transmissão.</p></div></section>`}

function render(){
 const content=$('#adminContent');
 if(!content) return;
 document.querySelectorAll('.nav').forEach(b=>b.classList.toggle('active',b.dataset.adminView===currentView));
 const titles={dashboard:'Dashboard',clients:'Clientes',trips:'Viagens',templates:'Modelos de roteiro',finance:'Financeiro',live:'Live',partners:'Parceiros'};
 $('#adminTitle').textContent=titles[currentView]||'Indo por Aí Business';
 const views={dashboard,clients:clientsView,trips:tripsView,templates:templatesView,finance:financeView,live:liveViewAdmin,partners:partnersView};
 content.innerHTML=views[currentView]();
 bind();
}
function bind(){
 document.querySelectorAll('[data-admin-view],[data-admin-view-jump]').forEach(b=>b.onclick=()=>{currentView=b.dataset.adminView||b.dataset.adminViewJump;render()});
 document.querySelectorAll('[data-edit-trip]').forEach(b=>b.onclick=()=>{$('#adminTitle').textContent='Personalizar viagem';$('#adminContent').innerHTML=tripEditor(b.dataset.editTrip);bind()});
 document.querySelectorAll('[data-back-trips]').forEach(b=>b.onclick=()=>{currentView='trips';render()});
 document.querySelectorAll('[data-trip-module]').forEach(x=>x.onchange=()=>{IPAData.toggleTripModule(selectedTripId,x.dataset.tripModule,x.checked);$('#adminContent').innerHTML=tripEditor(selectedTripId);bind()});
 document.querySelectorAll('[data-set-plan]').forEach(b=>b.onclick=()=>{IPAData.updateTrip(selectedTripId,{plan:b.dataset.setPlan});$('#adminContent').innerHTML=tripEditor(selectedTripId);bind()});
 document.querySelectorAll('[data-publish-trip]').forEach(b=>b.onclick=()=>{const t=db().trips.find(x=>x.id===b.dataset.publishTrip);IPAData.publishTrip(t.id,!t.published);$('#adminContent').innerHTML=tripEditor(t.id);bind()});
 document.querySelectorAll('[data-preview-trip]').forEach(b=>b.onclick=()=>window.open('index.html?preview='+encodeURIComponent(b.dataset.previewTrip),'_blank'));
 document.querySelectorAll('[data-scroll]').forEach(b=>b.onclick=()=>document.querySelector('#'+b.dataset.scroll)?.scrollIntoView({behavior:'smooth'}));
 document.querySelectorAll('[data-benefit-toggle]').forEach(x=>x.onchange=()=>{IPAData.setBenefit(x.dataset.benefitToggle,x.checked);render()});
 document.querySelectorAll('[data-remind]').forEach(b=>b.onclick=()=>alert('Lembrete enviado para o app do cliente.'));
 document.querySelectorAll('[data-new-client]').forEach(b=>b.onclick=newClientModal);
 document.querySelectorAll('[data-new-trip]').forEach(b=>b.onclick=newTripModal);
 document.querySelectorAll('[data-new-charge]').forEach(b=>b.onclick=newChargeModal);
 document.querySelectorAll('[data-choose-template]').forEach(b=>b.onclick=chooseTemplateModal);
 document.querySelectorAll('[data-use-template]').forEach(b=>b.onclick=()=>{currentView='trips';render();alert('Abra uma viagem e escolha “Usar modelo” para aplicar este roteiro.')});
}
function newClientModal(){modal(`<span class="eyebrow">NOVO CLIENTE</span><h2>Cadastrar cliente</h2><div class="form-grid"><label>Nome<input id="cName" placeholder="Nome completo"></label><label>E-mail<input id="cEmail" placeholder="email@cliente.com"></label><label>Telefone<input id="cPhone" placeholder="(11) 99999-9999"></label></div><button class="primary full" id="saveClient">Salvar cliente</button>`);$('#saveClient').onclick=()=>{IPAData.createClient({name:$('#cName').value||'Novo cliente',email:$('#cEmail').value,phone:$('#cPhone').value});closeModal();currentView='clients';render()}}
function newTripModal(){const d=db();modal(`<span class="eyebrow">NOVA EXPERIÊNCIA</span><h2>Criar viagem</h2><div class="form-grid"><label>Cliente<select id="tClient">${d.clients.map(c=>`<option value="${c.id}">${c.name}</option>`).join('')}</select></label><label>Nome da viagem<input id="tName" value="Portugal 2026"></label><label>Destino<input id="tDest" value="Porto, Portugal"></label><label>Plano<select id="tPlan"><option>Explore</option><option selected>Signature</option><option>Elite</option><option>Groups</option></select></label><label>Início<input id="tStart" type="date" value="2026-09-05"></label><label>Fim<input id="tEnd" type="date" value="2026-09-12"></label></div><button class="primary full" id="saveTrip">Criar e personalizar</button>`);$('#saveTrip').onclick=()=>{const t=IPAData.createTrip({clientId:$('#tClient').value,name:$('#tName').value,destination:$('#tDest').value,plan:$('#tPlan').value,startDate:$('#tStart').value,endDate:$('#tEnd').value,travelers:1});closeModal();selectedTripId=t.id;$('#adminTitle').textContent='Personalizar viagem';$('#adminContent').innerHTML=tripEditor(t.id);bind()}}
function newChargeModal(){modal(`<span class="eyebrow">FINANCEIRO</span><h2>Nova cobrança</h2><div class="form-grid"><label>Título<input id="pTitle" value="Parcela da viagem"></label><label>Valor<input id="pAmount" type="number" value="1500"></label><label>Vencimento<input id="pDue" type="date" value="2026-08-25"></label><label>Descrição<input id="pDesc" value="Cobrança enviada pelo Indo por Aí"></label></div><button class="primary full" id="savePay">Enviar para o app</button>`);$('#savePay').onclick=()=>{IPAData.createPayment({trip:'Portugal 2026',title:$('#pTitle').value,amount:Number($('#pAmount').value),dueDate:$('#pDue').value,description:$('#pDesc').value,methods:['PIX','Cartão']});closeModal();currentView='finance';render()}}
function chooseTemplateModal(){const d=db();modal(`<span class="eyebrow">BIBLIOTECA DE ROTEIROS</span><h2>Escolha um modelo</h2><div class="modal-template-list">${d.itineraryTemplates.map(t=>`<button data-apply-template="${t.id}"><div><b>${t.name}</b><small>${t.destination} · ${t.days} dias</small></div><span>Usar →</span></button>`).join('')}</div>`);document.querySelectorAll('[data-apply-template]').forEach(b=>b.onclick=()=>{IPAData.applyTemplate(selectedTripId,b.dataset.applyTemplate);closeModal();$('#adminContent').innerHTML=tripEditor(selectedTripId);bind()})}
document.querySelectorAll('.nav').forEach(b=>b.onclick=()=>{currentView=b.dataset.adminView;render()});
render();
