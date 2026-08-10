const IPA_DEFAULT_DATA = {
  client: { id:"demo-renato", name:"Renato", plan:"Signature", trip:"Portugal 2026" },
  benefits: [
    {id:"exchange",enabled:true,title:"Indo por Aí Exchange",partner:"C6 Bank",sponsorLabel:"Parceiro Oficial",cta:"Ativar benefício"},
    {id:"esim",enabled:true,title:"Internet Internacional",partner:"Airalo",sponsorLabel:"Benefício exclusivo",cta:"Ativar eSIM"},
    {id:"insurance",enabled:false,title:"Seguro Viagem",partner:"Allianz",sponsorLabel:"Parceiro Oficial",cta:"Ver cobertura"},
    {id:"transfer",enabled:true,title:"Transfer Privativo",partner:"Indo por Aí",sponsorLabel:"Exclusivo",cta:"Ver detalhes"}
  ],
  exchange: { requestedEuro:850, buyRate:6.18, sellRate:6.32, status:"Reservado", delivery:"Carteira digital" },
  prep: {
    purchase:[
      {label:"Passagens aéreas",done:true},{label:"Hotel no Porto",done:true},{label:"Seguro viagem",done:true},
      {label:"Transfer aeroporto → hotel",done:false},{label:"Passeio Vale do Douro",done:true}
    ],
    documents:[
      {label:"Passaporte válido",done:true},{label:"Seguro viagem",done:true},{label:"Comprovante de hospedagem",done:true},
      {label:"Passagem de retorno",done:true},{label:"Autorização de viagem para menor",done:false}
    ],
    luggage:[
      {label:"Casaco leve",done:true},{label:"Tênis confortável",done:true},{label:"Adaptador de tomada",done:false},
      {label:"Capa de chuva",done:false},{label:"Protetor solar",done:true}
    ]
  }
};
function clone(x){ return JSON.parse(JSON.stringify(x)); }
function readData(){
  try{ const s=localStorage.getItem("ipa-demo-db"); return s?JSON.parse(s):clone(IPA_DEFAULT_DATA); }
  catch(e){ return clone(IPA_DEFAULT_DATA); }
}
function writeData(d){ localStorage.setItem("ipa-demo-db",JSON.stringify(d)); }
window.IPAData={
  getAll(){return readData()},
  reset(){writeData(clone(IPA_DEFAULT_DATA))},
  updateClient(p){const d=readData();d.client={...d.client,...p};writeData(d)},
  setBenefit(id,en){const d=readData();const b=d.benefits.find(x=>x.id===id);if(b)b.enabled=en;writeData(d)},
  updateExchange(p){const d=readData();d.exchange={...d.exchange,...p};writeData(d)},
  togglePrep(section,index){const d=readData();if(d.prep[section]?.[index])d.prep[section][index].done=!d.prep[section][index].done;writeData(d)}
};
