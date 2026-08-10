const $=s=>document.querySelector(s);const money=v=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v||0);
function render(){const d=IPAData.getAll();
 const total=d.payments.reduce((s,p)=>s+p.amount,0),paid=d.payments.filter(p=>p.status==='Pago').reduce((s,p)=>s+p.amount,0),pending=total-paid;
 const fm=document.querySelector('#financeMetrics');if(fm)fm.innerHTML=`<div><small>Contratado</small><strong>${money(total)}</strong></div><div><small>Recebido</small><strong>${money(paid)}</strong></div><div><small>Em aberto</small><strong>${money(pending)}</strong></div>`;
 const pl=document.querySelector('#paymentAdminList');if(pl)pl.innerHTML=d.payments.map(p=>`<div class="admin-payment-row"><div><b>${p.title}</b><small>${p.description}</small></div><strong>${money(p.amount)}</strong><span class="${p.status==='Pago'?'ok':'wait'}">${p.status}</span><button data-remind="${p.id}">Enviar lembrete</button></div>`).join('');
 setTimeout(()=>document.querySelectorAll('[data-remind]').forEach(b=>b.onclick=()=>alert('Lembrete enviado ao app do cliente.')),0);$('#plan').value=d.client.plan;$('#requestedEuro').value=d.exchange.requestedEuro;$('#buyRate').value=d.exchange.buyRate;$('#sellRate').value=d.exchange.sellRate;$('#partner').value=d.exchange.partner;$('#status').value=d.exchange.status;$('#margin').textContent=money((d.exchange.sellRate-d.exchange.buyRate)*d.exchange.requestedEuro);$('#benefits').innerHTML=d.benefits.map(b=>`<label class="benefit-row"><input type="checkbox" data-benefit="${b.id}" ${b.enabled?'checked':''}><div><b>${b.title}</b><small>${b.sponsorLabel}: ${b.partner}</small></div><span>${b.enabled?'Ativo':'Oculto'}</span></label>`).join('');document.querySelectorAll('[data-benefit]').forEach(x=>x.onchange=()=>{IPAData.setBenefit(x.dataset.benefit,x.checked);render()})}
$('#plan').onchange=()=>{IPAData.updateClient({plan:$('#plan').value});render()};
['requestedEuro','buyRate','sellRate'].forEach(id=>$('#'+id).oninput=()=>{$('#margin').textContent=money((Number($('#sellRate').value)-Number($('#buyRate').value))*Number($('#requestedEuro').value))});
$('#saveExchange').onclick=()=>{IPAData.updateExchange({requestedEuro:Number($('#requestedEuro').value),buyRate:Number($('#buyRate').value),sellRate:Number($('#sellRate').value),partner:$('#partner').value,status:$('#status').value});alert('Exchange salvo');render()};
$('#reset').onclick=()=>{IPAData.reset();render()};render();

const sendCharge=document.querySelector('#sendCharge');
if(sendCharge)sendCharge.onclick=()=>{
  const methods=[];
  if(document.querySelector('#acceptPix').checked)methods.push('PIX');
  if(document.querySelector('#acceptCard').checked)methods.push('Cartão');
  IPAData.createPayment({
    trip:'Portugal 2026',
    title:document.querySelector('#newPayTitle').value.trim()||'Nova cobrança',
    description:document.querySelector('#newPayDescription').value.trim()||'Cobrança Indo por Aí',
    amount:Number(document.querySelector('#newPayAmount').value||0),
    dueDate:document.querySelector('#newPayDue').value,
    methods
  });
  alert('Cobrança enviada para o app do cliente.');
  render();
};
