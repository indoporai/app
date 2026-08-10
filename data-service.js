const IPA_DEFAULT_DATA = {
  client:{id:"demo-renato",name:"Renato",plan:"Signature",trip:"Portugal 2026"},
  plans:{
    Explore:["Roteiros configurados","Acesso ao app","Diário da viagem","Álbum e filme","Passaporte e selos","Comunidade Indo por Aí"],
    Signature:["Tudo do Explore","Suporte pré-embarque","Compra de passagens","Reserva de hotéis","Planejamento personalizado","Benefícios exclusivos"],
    Elite:["Tudo do Signature","Concierge durante a viagem","Suporte em tempo real","Experiências premium","Live e grupo","Acesso full à plataforma"],
    Groups:["Experiência para grandes grupos","Avisos do guia","Lista de presença","Subgrupos","Live","Álbum e filme compartilhados"]
  },
  benefits:[
    {id:"exchange",enabled:true,title:"Indo por Aí Exchange",partner:"C6 Bank",sponsorLabel:"Parceiro Oficial",cta:"Ativar benefício"},
    {id:"esim",enabled:true,title:"Internet Internacional",partner:"Airalo",sponsorLabel:"Benefício exclusivo",cta:"Ativar eSIM"},
    {id:"insurance",enabled:false,title:"Seguro Viagem",partner:"Allianz",sponsorLabel:"Parceiro Oficial",cta:"Ver cobertura"},
    {id:"transfer",enabled:true,title:"Transfer Privativo",partner:"Indo por Aí",sponsorLabel:"Exclusivo",cta:"Ver detalhes"}
  ],
  exchange:{requestedEuro:850,buyRate:6.18,sellRate:6.32,status:"Reservado",partner:"C6 Bank"},
  prep:{
    purchase:[
      {label:"Passagens aéreas",done:true},{label:"Hotel no Porto",done:true},{label:"Seguro viagem",done:true},
      {label:"Transfer aeroporto → hotel",done:false},{label:"Passeio Vale do Douro",done:true}
    ],
    documents:[
      {label:"Passaporte válido",done:true},{label:"Seguro viagem",done:true},{label:"Comprovante de hospedagem",done:true},
      {label:"Passagem de retorno",done:true},{label:"Autorização para menor, se aplicável",done:false}
    ],
    checkin:[
      {label:"Check-in voo de ida",done:false},{label:"Assentos confirmados",done:true},
      {label:"Bagagem conferida",done:true},{label:"Cartões de embarque salvos",done:false}
    ],
    luggage:[
      {label:"Casaco leve para noites de 15°C",done:true},{label:"Tênis confortável",done:true},
      {label:"Adaptador de tomada europeu",done:false},{label:"Capa de chuva compacta",done:false},
      {label:"Protetor solar",done:true}
    ]
  },
  ratings:{
    clerigos:{place:"Torre dos Clérigos",score:4.9,count:127,recommend:96,guide:"Suba no fim da tarde para aproveitar a luz e a vista.",tips:["Chegue cedo para evitar fila.","A vista no pôr do sol vale muito a pena."]},
    lello:{place:"Livraria Lello",score:4.8,count:203,recommend:93,guide:"Use o ingresso com horário marcado e chegue 10 minutos antes.",tips:["Evite o meio do dia.","Reserve pelo menos 45 minutos."]},
    ribeira:{place:"Ribeira",score:5.0,count:311,recommend:98,guide:"Caminhe até a Ponte Luís I antes do jantar.",tips:["Ótima no fim da tarde.","Separe tempo para caminhar sem pressa."]},
    taberna:{place:"Taberna dos Mercadores",score:4.9,count:88,recommend:97,guide:"Peça o bacalhau da casa.",tips:["Reserve com antecedência.","Porções muito bem servidas."]}
  }
};
function clone(x){return JSON.parse(JSON.stringify(x))}
function readData(){try{const s=localStorage.getItem("ipa-v2-demo-db");return s?JSON.parse(s):clone(IPA_DEFAULT_DATA)}catch(e){return clone(IPA_DEFAULT_DATA)}}
function writeData(d){localStorage.setItem("ipa-v2-demo-db",JSON.stringify(d))}
window.IPAData={
 getAll(){return readData()},
 reset(){writeData(clone(IPA_DEFAULT_DATA))},
 updateClient(p){const d=readData();d.client={...d.client,...p};writeData(d)},
 setBenefit(id,en){const d=readData();const b=d.benefits.find(x=>x.id===id);if(b)b.enabled=en;writeData(d)},
 updateExchange(p){const d=readData();d.exchange={...d.exchange,...p};writeData(d)},
 togglePrep(section,index){const d=readData();if(d.prep[section]?.[index])d.prep[section][index].done=!d.prep[section][index].done;writeData(d)},
 addRating(id,stars,tip){const d=readData();const r=d.ratings[id];if(!r)return;const total=r.score*r.count+stars;r.count+=1;r.score=Math.round((total/r.count)*10)/10;if(tip)r.tips.unshift(tip);writeData(d)}
};
