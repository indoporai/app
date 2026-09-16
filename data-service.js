
const IPA_PLAN_PRESETS = {
  Explore:{
    itinerary:true, documents:false, luggage:false, checkin:false,
    preboardingSupport:false, bookingSupport:false, exchange:false, concierge:false,
    payments:true, community:false, live:false,
    album:true, movie:true, passport:false, groupManagement:false
  },
  Signature:{
    itinerary:true, documents:true, luggage:true, checkin:true,
    preboardingSupport:true, bookingSupport:true, exchange:false, concierge:false,
    payments:true, community:false, live:false,
    album:true, movie:true, passport:false, groupManagement:false
  },
  Elite:{
    itinerary:true, documents:true, luggage:true, checkin:true,
    preboardingSupport:true, bookingSupport:true, exchange:true, concierge:true,
    payments:true, community:true, live:true,
    album:true, movie:true, passport:true, groupManagement:false
  },
  Groups:{
    itinerary:true, documents:true, luggage:true, checkin:true,
    preboardingSupport:true, bookingSupport:true, exchange:false, concierge:false,
    payments:true, community:true, live:true,
    album:true, movie:true, passport:true, groupManagement:true
  }
};
function ipaPlanModules(plan){
  return {...(IPA_PLAN_PRESETS[plan]||IPA_PLAN_PRESETS.Explore)};
}

const IPA_DEFAULT_DATA = {
  client:{id:"",name:"",plan:"",trip:""},
  plans:{
    Explore:["Roteiros configurados","Acesso ao app","Diário da viagem","Álbum e filme","Passaporte e selos","Comunidade Indo por Aí"],
    Signature:["Tudo do Explore","Suporte pré-embarque","Compra de passagens","Reserva de hotéis","Planejamento personalizado","Benefícios exclusivos"],
    Elite:["Tudo do Signature","Concierge durante a viagem","Suporte em tempo real","Experiências premium","Live e grupo","Acesso full à plataforma"],
    Groups:["Experiência para grandes grupos","Avisos do guia","Lista de presença","Subgrupos","Live","Álbum e filme compartilhados","Gestão de grupos"]
  },
  placeCatalog:[],
  travelLeads:[],
  benefits:[],
  exchange:{requestedEuro:0,buyRate:0,sellRate:0,status:"",partner:""},
  prep:{purchase:[],documents:[],checkin:[],luggage:[]},
  clients:[],
  trips:[],
  itineraryTemplates:[],
  paymentPlans:[],
  recommendations:[],
  tripDocuments:[],
  memories:[],
  journeyPlaces:{},
  conciergeRequests:[],
  payments:[],
  visitReviews:{},
  ratings:{}
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
 saveJourneyPlace(tripId,dayNo,placeId,patch){const d=readData();d.journeyPlaces=d.journeyPlaces||{};const k=[tripId,dayNo,placeId].join(":");d.journeyPlaces[k]={...(d.journeyPlaces[k]||{}),...patch,updatedAt:new Date().toISOString()};writeData(d);return d.journeyPlaces[k]},
 addMemory(memory){const d=readData();d.memories=d.memories||[];memory.id=memory.id||("mem-"+Date.now()+"-"+Math.random().toString(36).slice(2,6));memory.createdAt=memory.createdAt||new Date().toISOString();d.memories.unshift(memory);writeData(d);return memory},
 createConciergeRequest(req){const d=readData();d.conciergeRequests=d.conciergeRequests||[];req.id=req.id||("conc-"+Date.now());req.status=req.status||"Enviado";req.createdAt=new Date().toISOString();d.conciergeRequests.unshift(req);writeData(d);return req},
 addRecommendation(rec){const d=readData();d.recommendations=d.recommendations||[];rec.id=rec.id||("rec-"+Date.now());rec.createdAt=new Date().toISOString();d.recommendations.unshift(rec);writeData(d);return rec},
 addCatalogPlace(place){const d=readData();d.placeCatalog=d.placeCatalog||[];place.id=place.id||("catalog-"+Date.now());place.createdAt=new Date().toISOString();d.placeCatalog.unshift(place);writeData(d);return place},
 addTravelLead(lead){const d=readData();d.travelLeads=d.travelLeads||[];lead.id=lead.id||("lead-"+Date.now());lead.createdAt=new Date().toISOString();d.travelLeads.unshift(lead);writeData(d);return lead},
 updateTravelLead(id,patch){const d=readData();d.travelLeads=d.travelLeads||[];const lead=d.travelLeads.find(x=>x.id===id);if(lead)Object.assign(lead,patch,{updatedAt:new Date().toISOString()});writeData(d);return lead},
 createPaymentPlan(plan){const d=readData();d.paymentPlans=d.paymentPlans||[];plan.id=plan.id||("plan-"+Date.now());plan.installments=Math.max(1,Number(plan.installments)||1);plan.createdAt=new Date().toISOString();d.paymentPlans.unshift(plan);const total=Number(plan.totalAmount)||0;const base=Math.floor((total/plan.installments)*100)/100;const start=new Date((plan.firstDueDate||new Date().toISOString().slice(0,10))+"T12:00:00");for(let i=1;i<=plan.installments;i++){const due=new Date(start);due.setMonth(start.getMonth()+i-1);const amount=i===plan.installments?Math.round((total-base*(plan.installments-1))*100)/100:base;d.payments.unshift({id:"pay-"+Date.now()+"-"+i,paymentPlanId:plan.id,installmentNumber:i,installmentTotal:plan.installments,clientId:plan.clientId,clientName:plan.clientName,tripId:plan.tripId,trip:plan.trip,title:`${i}ª parcela · ${plan.title||"Viagem"}`,description:plan.description||"",amount,dueDate:due.toISOString().slice(0,10),methods:plan.methods||["PIX"],status:"Pendente",createdAt:new Date().toISOString().slice(0,10),paidAt:null})}writeData(d);return plan},
 addTripDocument(docu){const d=readData();d.tripDocuments=d.tripDocuments||[];docu.id=docu.id||("doc-"+Date.now());docu.createdAt=new Date().toISOString();d.tripDocuments.unshift(docu);writeData(d);return docu},
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
 addItineraryPlace(tripId,dayNumber,place){const d=readData();const t=(d.trips||[]).find(x=>x.id===tripId);if(!t)return null;t.itinerary=t.itinerary||[];let day=t.itinerary.find(x=>Number(x.day)===Number(dayNumber));if(!day){day={day:Number(dayNumber),title:"Dia "+dayNumber,date:"",places:[]};t.itinerary.push(day)}day.places=day.places||[];day.places.push({...place,id:place.id&&String(place.id).startsWith('place-')?place.id:("place-"+Date.now()+"-"+Math.random().toString(36).slice(2,6)),name:place.name||"Novo local",address:place.address||"",time:place.time||"",note:place.note||"",placeId:place.placeId||"",mapsUrl:place.mapsUrl||"",category:place.category||"Atração",smartTip:place.smartTip||place.tip||"",networkRecommended:!!place.networkRecommended});writeData(d);return t},
 createItineraryTemplate(template){const d=readData();template.id=template.id||("tpl-"+Date.now());template.days=Number(template.days)||1;template.itinerary=template.itinerary||[];d.itineraryTemplates=d.itineraryTemplates||[];d.itineraryTemplates.push(template);writeData(d);return template},
 markPaymentPaid(id){const d=readData();const p=d.payments.find(x=>x.id===id);if(p){p.status="Pago";p.paidAt=new Date().toISOString().slice(0,10)}writeData(d);return p},
 replaceFromCloud(cloudData){const current=readData();const merged={...current,...cloudData};writeData(merged,"cloud");return merged}
};
