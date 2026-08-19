
const IPA_PLAN_PRESETS = {
  Explore:{
    itinerary:true, documents:false, luggage:false, checkin:false,
    preboardingSupport:false, bookingSupport:false, exchange:false,
    payments:true, community:false, live:false,
    album:true, movie:true, passport:false, groupManagement:false
  },
  Signature:{
    itinerary:true, documents:true, luggage:true, checkin:true,
    preboardingSupport:true, bookingSupport:true, exchange:false,
    payments:true, community:false, live:false,
    album:true, movie:true, passport:false, groupManagement:false
  },
  Elite:{
    itinerary:true, documents:true, luggage:true, checkin:true,
    preboardingSupport:true, bookingSupport:true, exchange:true,
    payments:true, community:true, live:true,
    album:true, movie:true, passport:true, groupManagement:false
  },
  Groups:{
    itinerary:true, documents:true, luggage:true, checkin:true,
    preboardingSupport:true, bookingSupport:true, exchange:false,
    payments:true, community:true, live:true,
    album:true, movie:true, passport:true, groupManagement:true
  }
};
function ipaPlanModules(plan){
  return {...(IPA_PLAN_PRESETS[plan]||IPA_PLAN_PRESETS.Explore)};
}

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
  clients:[
    {id:"cli-renato",name:"Renato",email:"renato@demo.com",phone:"(11) 99999-9999",status:"Ativo"}
  ],
  trips:[
    {id:"trip-portugal-2026",clientId:"cli-renato",name:"Portugal 2026",destination:"Porto",country:"Portugal",startDate:"2026-09-05",endDate:"2026-09-12",travelers:2,plan:"Signature",status:"Em preparação",published:true,
     modules:{itinerary:true,documents:true,luggage:true,checkin:true,exchange:true,payments:true,community:true,live:false,album:true,movie:true,passport:true},
     templateId:"tpl-porto-7",
     itinerary:[
       {day:1,title:"Chegada ao Porto",places:["Check-in no hotel","Ribeira ao pôr do sol"]},
       {day:2,title:"Porto histórico",places:["Torre dos Clérigos","Livraria Lello","Avenida dos Aliados"]},
       {day:3,title:"Sabores do Porto",places:["Mercado do Bolhão","Taberna dos Mercadores"]},
       {day:4,title:"Vale do Douro",places:["Quinta da Pacheca","Passeio de barco no Douro"]}
     ]}
  ],
  itineraryTemplates:[
    {id:"tpl-porto-7",name:"Porto Essencial · 7 dias",destination:"Porto, Portugal",days:7,description:"Base pronta com centro histórico, gastronomia e Douro."},
    {id:"tpl-lisboa-5",name:"Lisboa Essencial · 5 dias",destination:"Lisboa, Portugal",days:5,description:"Belém, Alfama, Baixa, Sintra e gastronomia."},
    {id:"tpl-paris-6",name:"Paris Clássica · 6 dias",destination:"Paris, França",days:6,description:"Principais ícones, bairros e experiências gastronômicas."}
  ],
  payments:[
    {id:"pay-001",trip:"Portugal 2026",title:"Parcela da viagem",description:"2ª parcela do pacote Signature",amount:1500,dueDate:"2026-08-15",status:"Pendente",methods:["PIX","Cartão"],createdAt:"2026-08-10",paidAt:null},
    {id:"pay-002",trip:"Portugal 2026",title:"Passeio Vale do Douro",description:"Experiência adicional",amount:450,dueDate:"2026-08-20",status:"Pago",methods:["PIX","Cartão"],createdAt:"2026-08-09",paidAt:"2026-08-09"},
    {id:"pay-003",trip:"Portugal 2026",title:"Saldo final da viagem",description:"Última parcela antes do embarque",amount:3350,dueDate:"2026-08-30",status:"Pendente",methods:["PIX","Cartão"],createdAt:"2026-08-10",paidAt:null}
  ],
  visitReviews:{
    clerigos:{visited:false,stars:0,note:""},
    lello:{visited:false,stars:0,note:""},
    ribeira:{visited:false,stars:0,note:""},
    taberna:{visited:false,stars:0,note:""}
  },
  ratings:{
    clerigos:{place:"Torre dos Clérigos",score:4.9,count:127,recommend:96,guide:"Suba no fim da tarde para aproveitar a luz e a vista.",tips:["Chegue cedo para evitar fila.","A vista no pôr do sol vale muito a pena."]},
    lello:{place:"Livraria Lello",score:4.8,count:203,recommend:93,guide:"Use o ingresso com horário marcado e chegue 10 minutos antes.",tips:["Evite o meio do dia.","Reserve pelo menos 45 minutos."]},
    ribeira:{place:"Ribeira",score:5.0,count:311,recommend:98,guide:"Caminhe até a Ponte Luís I antes do jantar.",tips:["Ótima no fim da tarde.","Separe tempo para caminhar sem pressa."]},
    taberna:{place:"Taberna dos Mercadores",score:4.9,count:88,recommend:97,guide:"Peça o bacalhau da casa.",tips:["Reserve com antecedência.","Porções muito bem servidas."]}
  }
};
function clone(x){return JSON.parse(JSON.stringify(x))}
function readData(){
 try{
   const s=localStorage.getItem("ipa-v2-demo-db");
   if(!s)return clone(IPA_DEFAULT_DATA);
   const saved=JSON.parse(s);
   const defaults=clone(IPA_DEFAULT_DATA);
   return {
     ...defaults,
     ...saved,
     client:{...defaults.client,...(saved.client||{})},
     plans:{...defaults.plans,...(saved.plans||{})},
     exchange:{...defaults.exchange,...(saved.exchange||{})},
     prep:{...defaults.prep,...(saved.prep||{})},
     benefits:Array.isArray(saved.benefits)?saved.benefits:defaults.benefits,
     payments:Array.isArray(saved.payments)?saved.payments:defaults.payments,
     visitReviews:{...defaults.visitReviews,...(saved.visitReviews||{})},
     ratings:{...defaults.ratings,...(saved.ratings||{})},
     clients:Array.isArray(saved.clients)&&saved.clients.length?saved.clients:defaults.clients,
     trips:Array.isArray(saved.trips)&&saved.trips.length?saved.trips:defaults.trips,
     itineraryTemplates:Array.isArray(saved.itineraryTemplates)&&saved.itineraryTemplates.length?saved.itineraryTemplates:defaults.itineraryTemplates
   };
 }catch(e){return clone(IPA_DEFAULT_DATA)}
}
function writeData(d,source="local"){
 localStorage.setItem("ipa-v2-demo-db",JSON.stringify(d));
 window.dispatchEvent(new CustomEvent("ipa-data-updated",{detail:{data:d,source}}));
}
window.IPAData={
 getAll(){return readData()},
 reset(){writeData(clone(IPA_DEFAULT_DATA))},
 updateClient(p){const d=readData();d.client={...d.client,...p};writeData(d)},
 setBenefit(id,en){const d=readData();const b=d.benefits.find(x=>x.id===id);if(b)b.enabled=en;writeData(d)},
 updateExchange(p){const d=readData();d.exchange={...d.exchange,...p};writeData(d)},
 togglePrep(section,index){const d=readData();if(d.prep[section]?.[index])d.prep[section][index].done=!d.prep[section][index].done;writeData(d)},
 saveVisitReview(id,patch){const d=readData();if(!d.visitReviews)d.visitReviews={};d.visitReviews[id]={...(d.visitReviews[id]||{visited:false,stars:0,note:""}),...patch};writeData(d);return d.visitReviews[id]},
 addRating(id,stars,tip){const d=readData();const r=d.ratings[id];if(!r)return;const total=r.score*r.count+stars;r.count+=1;r.score=Math.round((total/r.count)*10)/10;if(tip)r.tips.unshift(tip);writeData(d)},
 createPayment(payment){const d=readData();payment.id=payment.id||("pay-"+Date.now());payment.status=payment.status||"Pendente";payment.createdAt=new Date().toISOString().slice(0,10);payment.paidAt=null;d.payments.unshift(payment);writeData(d);return payment},
 updatePayment(id,patch){const d=readData();const p=d.payments.find(x=>x.id===id);if(p)Object.assign(p,patch);writeData(d);return p},
 createClient(client){const d=readData();client.id=client.id||("cli-"+Date.now());client.status=client.status||"Ativo";d.clients=d.clients||[];d.clients.push(client);writeData(d);return client},
 updateClientById(id,patch){const d=readData();const c=(d.clients||[]).find(x=>x.id===id);if(c)Object.assign(c,patch);writeData(d);return c},
 createTrip(trip){const d=readData();trip.id=trip.id||("trip-"+Date.now());trip.status=trip.status||"Em preparação";trip.published=false;trip.country=trip.country||"";trip.plan=trip.plan||"Explore";trip.modules=trip.modules||ipaPlanModules(trip.plan);trip.itinerary=trip.itinerary||[];d.trips=d.trips||[];d.trips.push(trip);writeData(d);return trip},
 applyPlanPreset(id,plan){const d=readData();const t=(d.trips||[]).find(x=>x.id===id);if(!t)return null;t.plan=plan;t.modules=ipaPlanModules(plan);writeData(d);return t},
 updateTrip(id,patch){const d=readData();const t=(d.trips||[]).find(x=>x.id===id);if(t)Object.assign(t,patch);writeData(d);return t},
 toggleTripModule(tripId,module,enabled){const d=readData();const t=(d.trips||[]).find(x=>x.id===tripId);if(t){t.modules=t.modules||{};t.modules[module]=enabled}writeData(d);return t},
 publishTrip(id,published=true){return this.updateTrip(id,{published,status:published?"Publicado":"Em preparação"})},
 applyTemplate(tripId,templateId){const d=readData();const t=(d.trips||[]).find(x=>x.id===tripId);const tpl=(d.itineraryTemplates||[]).find(x=>x.id===templateId);if(t&&tpl){t.templateId=templateId;t.itinerary=t.itinerary?.length?t.itinerary:[
   {day:1,title:"Chegada e ambientação",places:["Check-in","Passeio de boas-vindas"]},
   {day:2,title:"Centro histórico",places:["Principais atrações","Experiência local"]},
   {day:3,title:"Gastronomia e cultura",places:["Mercado local","Restaurante recomendado"]}
 ]}writeData(d);return t},
 addItineraryDay(tripId,dayData){const d=readData();const t=(d.trips||[]).find(x=>x.id===tripId);if(!t)return null;t.itinerary=t.itinerary||[];const next=Math.max(0,...t.itinerary.map(x=>Number(x.day)||0))+1;t.itinerary.push({day:dayData.day||next,title:dayData.title||("Dia "+next),date:dayData.date||"",places:[]});writeData(d);return t},
 addItineraryPlace(tripId,dayNumber,place){const d=readData();const t=(d.trips||[]).find(x=>x.id===tripId);if(!t)return null;t.itinerary=t.itinerary||[];let day=t.itinerary.find(x=>Number(x.day)===Number(dayNumber));if(!day){day={day:Number(dayNumber),title:"Dia "+dayNumber,date:"",places:[]};t.itinerary.push(day)}day.places=day.places||[];day.places.push({id:place.id||("place-"+Date.now()),name:place.name||"Novo local",address:place.address||"",time:place.time||"",note:place.note||"",placeId:place.placeId||""});writeData(d);return t},
 createItineraryTemplate(template){const d=readData();template.id=template.id||("tpl-"+Date.now());template.days=Number(template.days)||1;template.itinerary=template.itinerary||[];d.itineraryTemplates=d.itineraryTemplates||[];d.itineraryTemplates.push(template);writeData(d);return template},
 markPaymentPaid(id){const d=readData();const p=d.payments.find(x=>x.id===id);if(p){p.status="Pago";p.paidAt=new Date().toISOString().slice(0,10)}writeData(d);return p},
 replaceFromCloud(cloudData){const current=readData();const merged={...current,...cloudData};writeData(merged,"cloud");return merged}
};
