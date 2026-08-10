const $=s=>document.querySelector(s);
function money(v){return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v||0)}
function render(){
 const d=IPAData.getAll();
 $('#plan').value=d.client.plan;
 $('#requestedEuro').value=d.exchange.requestedEuro;
 $('#buyRate').value=d.exchange.buyRate;
 $('#sellRate').value=d.exchange.sellRate;
 $('#exchangeStatus').value=d.exchange.status;
 $('#marginValue').textContent=money((d.exchange.sellRate-d.exchange.buyRate)*d.exchange.requestedEuro);
 $('#benefits').innerHTML=d.benefits.map(b=>`<label class="benefit-row"><input type="checkbox" data-benefit="${b.id}" ${b.enabled?'checked':''}><div><b>${b.title}</b><small>${b.sponsorLabel}: ${b.partner}</small></div><span>${b.enabled?'Ativo':'Oculto'}</span></label>`).join('');
 document.querySelectorAll('[data-benefit]').forEach(x=>x.onchange=()=>{IPAData.setBenefit(x.dataset.benefit,x.checked);render()});
}
$('#plan').onchange=()=>{IPAData.updateClient({plan:$('#plan').value});render()};
['requestedEuro','buyRate','sellRate'].forEach(id=>$('#'+id).oninput=()=>{
 const e=Number($('#requestedEuro').value||0),b=Number($('#buyRate').value||0),s=Number($('#sellRate').value||0);
 $('#marginValue').textContent=money((s-b)*e);
});
$('#saveExchange').onclick=()=>{IPAData.updateExchange({
 requestedEuro:Number($('#requestedEuro').value||0),
 buyRate:Number($('#buyRate').value||0),
 sellRate:Number($('#sellRate').value||0),
 status:$('#exchangeStatus').value
});alert('Exchange salvo.');render()};
$('#resetDemo').onclick=()=>{IPAData.reset();render()};
render();
