import { initializeApp } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  isSignInWithEmailLink,
  signInWithEmailLink,
  updatePassword,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  getDoc,
  getDocFromServer,
  setDoc,
  deleteDoc,
  serverTimestamp,
  query,
  where,
  limit,
  addDoc,
  orderBy,
  onSnapshot,
  updateDoc,
  arrayUnion
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyD_EYtJ3h_WDvga2eV8LKEiCpDaT8gSEiM",
  authDomain: "indo-por-ai-app.firebaseapp.com",
  projectId: "indo-por-ai-app",
  storageBucket: "indo-por-ai-app.firebasestorage.app",
  messagingSenderId: "140345034738",
  appId: "1:140345034738:web:6b0dc70f830f56d45ecd6b",
  measurementId: "G-MDCQ5H74KT"
};

const ADMIN_UID = "5dlGX6JlrUQHyjFWSHB9Dye0r1E3";

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const firestore = getFirestore(firebaseApp);
const storage = getStorage(firebaseApp);

await setPersistence(auth, browserLocalPersistence);

let currentUser = null;
let status = "connecting";
let lastError = "";
let syncing = false;
let initialized = false;
let syncTimer = null;

function notify(name="ipa-firebase-state"){
  window.dispatchEvent(new CustomEvent(name,{detail:{user:currentUser,status,error:lastError}}));
}

async function readCollection(name){
  const snap = await getDocs(collection(firestore,name));
  return snap.docs.map(d=>({id:d.id,...d.data()}));
}

// Beta 6.28.1: ambiente persistente. Nenhum reset automático de dados.
async function remoteHasData(){
  const snap = await getDocs(collection(firestore,"clients"));
  return !snap.empty;
}

async function pullAll(){
  const [clients,trips,payments,benefits,itineraryTemplates,paymentPlans,recommendations,tripDocuments,memories,conciergeRequests,placeCatalog,travelLeads] = await Promise.all([
    readCollection("clients"),
    readCollection("trips"),
    readCollection("payments"),
    readCollection("benefits"),
    readCollection("itineraryTemplates"),
    readCollection("paymentPlans"),
    readCollection("recommendations"),
    readCollection("tripDocuments"),
    readCollection("memories"),
    readCollection("conciergeRequests"),
    readCollection("placeCatalog"),
    readCollection("travelLeads")
  ]);

  const settingsSnap = await getDoc(doc(firestore,"settings","main"));
  const settings = settingsSnap.exists() ? settingsSnap.data() : {};

  const cloudData = {
    ...settings,
    clients,
    trips,
    payments,
    benefits,
    itineraryTemplates,
    paymentPlans,
    recommendations,
    tripDocuments,
    memories,
    conciergeRequests,
    placeCatalog,
    hotelCatalog:Array.isArray(settings.hotelCatalog)?settings.hotelCatalog:[],
    travelLeads
  };

  if(window.IPAData?.replaceFromCloud){
    window.IPAData.replaceFromCloud(cloudData);
  }
  return cloudData;
}

async function upsertCollection(name,items){
  for(const item of (items||[])){
    if(!item?.id) continue;
    await setDoc(doc(firestore,name,item.id),{
      ...item,
      updatedAt: serverTimestamp()
    },{merge:true});
  }
}

async function syncAll(data){
  if(!currentUser || currentUser.uid!==ADMIN_UID || syncing || !data) return;
  syncing = true;
  try{
    await Promise.all([
      upsertCollection("clients",data.clients),
      upsertCollection("trips",data.trips),
      upsertCollection("payments",data.payments),
      upsertCollection("benefits",data.benefits),
      upsertCollection("itineraryTemplates",data.itineraryTemplates),
      upsertCollection("paymentPlans",data.paymentPlans),
      upsertCollection("recommendations",data.recommendations),
      upsertCollection("tripDocuments",data.tripDocuments),
      upsertCollection("memories",data.memories),
      upsertCollection("placeCatalog",data.placeCatalog),
      upsertCollection("travelLeads",data.travelLeads)
    ]);

    await setDoc(doc(firestore,"settings","main"),{
      client:data.client||{},
      plans:data.plans||{},
      exchange:data.exchange||{},
      prep:data.prep||{},
      visitReviews:data.visitReviews||{},
      ratings:data.ratings||{},
      hotelCatalog:Array.isArray(data.hotelCatalog)?data.hotelCatalog:[],
      updatedAt:serverTimestamp()
    },{merge:true});

    await setDoc(doc(firestore,"users",currentUser.uid),{
      uid:currentUser.uid,
      email:currentUser.email||"",
      role:"admin",
      updatedAt:serverTimestamp()
    },{merge:true});

    status="connected";
    lastError="";
    notify("ipa-firebase-synced");
  }catch(err){
    console.error("Firebase sync error",err);
    status="error";
    lastError=err?.message||String(err);
    notify();
  }finally{
    syncing=false;
  }
}

function scheduleSync(data){
  clearTimeout(syncTimer);
  syncTimer=setTimeout(()=>syncAll(data),500);
}

window.addEventListener("ipa-data-updated",event=>{
  if(event.detail?.source==="cloud") return;
  if(currentUser?.uid===ADMIN_UID){
    scheduleSync(event.detail?.data);
  }
});




function parseInviteFromUrl(rawUrl){
  let clientId="",tripId="";
  const visited=new Set();

  function scan(urlText,depth=0){
    if(!urlText || depth>4 || visited.has(urlText)) return;
    visited.add(urlText);
    let u;
    try{ u=new URL(urlText,window.location.origin); }catch{return;}

    clientId=clientId||u.searchParams.get("clientId")||"";
    tripId=tripId||u.searchParams.get("tripId")||"";
    const payload=u.searchParams.get("ipaInvite")||"";
    if(payload && (!clientId||!tripId)){
      try{
        const obj=JSON.parse(decodeURIComponent(escape(atob(payload))));
        clientId=clientId||obj.clientId||"";
        tripId=tripId||obj.tripId||"";
      }catch(e){}
    }

    // O Firebase/Google pode encapsular a URL original em vários parâmetros.
    for(const key of ["continueUrl","continue_url","link","url","redirectUrl","redirect_url"]){
      const nested=u.searchParams.get(key);
      if(!nested)continue;
      let decoded=nested;
      for(let i=0;i<3;i++){
        try{
          const next=decodeURIComponent(decoded);
          if(next===decoded)break;
          decoded=next;
        }catch{break;}
      }
      scan(decoded,depth+1);
    }
  }

  scan(rawUrl);
  return {clientId,tripId};
}

const BOOT_INVITE_CONTEXT=parseInviteFromUrl(window.location.href);

function readInviteContext(){
  const live=parseInviteFromUrl(window.location.href);
  const clientId=
    live.clientId
    ||BOOT_INVITE_CONTEXT.clientId
    ||localStorage.getItem("ipa-client-id-for-signin")
    ||"";
  const tripId=
    live.tripId
    ||BOOT_INVITE_CONTEXT.tripId
    ||localStorage.getItem("ipa-trip-id-for-signin")
    ||"";

  if(clientId)localStorage.setItem("ipa-client-id-for-signin",clientId);
  if(tripId)localStorage.setItem("ipa-trip-id-for-signin",tripId);

  return {clientId,tripId};
}

async function loadClientExperience(){
  if(!currentUser || currentUser.uid===ADMIN_UID) return null;

  status="syncing";
  lastError="";
  const normalizedEmail=(currentUser.email||"").trim().toLowerCase();
  const inviteContext=readInviteContext();

  let clientDoc=null;

  // 1. ID do convite (mais determinístico)
  if(inviteContext.clientId){
    try{
      const snap=await getDoc(doc(firestore,"clients",inviteContext.clientId));
      if(snap.exists())clientDoc=snap;
    }catch(e){
      console.warn("Falha ao ler clientId do convite",e);
    }
  }

  // 2. Cliente já vinculado ao UID em acesso anterior
  if(!clientDoc){
    try{
      const snap=await getDocs(
        query(collection(firestore,"clients"),where("authUid","==",currentUser.uid),limit(1))
      );
      if(!snap.empty)clientDoc=snap.docs[0];
    }catch(e){
      console.warn("Busca por authUid indisponível",e);
    }
  }

  // 3. Primeiro acesso: e-mail
  if(!clientDoc){
    try{
      const snap=await getDocs(
        query(collection(firestore,"clients"),where("email","==",normalizedEmail),limit(1))
      );
      if(!snap.empty)clientDoc=snap.docs[0];
    }catch(e){
      console.warn("Busca por e-mail falhou",e);
    }
  }

  if(!clientDoc){
    status="client-no-profile";
    lastError=`Acesso autenticado como ${normalizedEmail}, mas nenhum cadastro de cliente foi encontrado.`;
    notify("ipa-client-experience-ready");
    return null;
  }

  const client={id:clientDoc.id,...clientDoc.data()};
  const clientEmail=String(client.email||"").trim().toLowerCase();

  if(clientEmail!==normalizedEmail && client.authUid!==currentUser.uid){
    status="client-no-profile";
    lastError="O e-mail autenticado não corresponde ao cliente deste convite.";
    notify("ipa-client-experience-ready");
    return null;
  }

  // Vincula UID no primeiro acesso.
  if(!client.authUid){
    try{
      await setDoc(doc(firestore,"clients",client.id),{
        authUid:currentUser.uid,
        firstAccessAt:serverTimestamp()
      },{merge:true});
      client.authUid=currentUser.uid;
    }catch(e){
      console.warn("Não foi possível registrar authUid",e);
    }
  }

  let chosenTrip=null;

  // A viagem enviada no e-mail é a primeira escolha e NÃO depende de activeTripId.
  if(inviteContext.tripId){
    try{
      const snap=await getDoc(doc(firestore,"trips",inviteContext.tripId));
      if(snap.exists()){
        const trip={id:snap.id,...snap.data()};
        if(trip.clientId===client.id && trip.published===true){
          chosenTrip=trip;
        }else{
          console.warn("tripId do convite não pertence ao cliente ou não está publicado",trip);
        }
      }
    }catch(e){
      console.warn("Não foi possível abrir tripId do convite",e);
    }
  }

  // Se o link trouxer um tripId antigo/inválido, não deixa o cliente em uma tela vazia.
  // A fonte de verdade passa a ser também a viagem ativa vinculada ao cadastro do cliente.
  // Isso é importante quando o acesso foi aprovado antes da viagem final ser criada/publicada.
  if(!chosenTrip){
    const fallbackId=client.activeTripId||client.lastInvitedTripId||"";
    if(fallbackId){
      try{
        const snap=await getDoc(doc(firestore,"trips",fallbackId));
        if(snap.exists()){
          const trip={id:snap.id,...snap.data()};
          if(trip.clientId===client.id && trip.published===true)chosenTrip=trip;
        }
      }catch(e){
        console.warn("Falha no fallback de viagem",e);
      }
    }
  }

  // Sempre carregamos TODAS as viagens publicadas deste cliente.
  // Um convite aponta a viagem inicial, mas não restringe o login a ela.
  let trips=[];
  try{
    const snap=await getDocs(query(collection(firestore,"trips"),where("clientId","==",client.id)));
    trips=snap.docs.map(d=>({id:d.id,...d.data()})).filter(t=>t.published===true);
    const today=new Date().toISOString().slice(0,10);
    trips.sort((a,b)=>{
      const aa=String(a.startDate||"9999-12-31"),bb=String(b.startDate||"9999-12-31");
      const af=aa>=today,bf=bb>=today;
      return af!==bf?(af?-1:1):(af?aa.localeCompare(bb):bb.localeCompare(aa));
    });
  }catch(e){
    console.warn("Não foi possível listar todas as viagens",e);
    // Conserva a experiência de uma viagem caso a consulta falhe.
    
  }
  // A listagem pode falhar por rede/índice. Nunca descartar uma viagem
  // publicada que já foi validada por leitura direta de documento.
  if(chosenTrip && !trips.some(t=>t.id===chosenTrip.id))trips.unshift(chosenTrip);
  const lastSelected=localStorage.getItem("ipa-active-trip-id");
  chosenTrip=trips.find(t=>t.id===lastSelected)
    ||trips.find(t=>t.id===chosenTrip?.id)
    ||trips[0]||null;

  if(!chosenTrip){
    status="client-no-trip";
    lastError=`Cliente encontrado (${client.name||client.id}), mas nenhuma viagem publicada pôde ser aberta. Convite: ${inviteContext.tripId||"sem tripId"}.`;
    notify("ipa-client-experience-ready");
    return null;
  }

  let payments=[];
  try{
    const snap=await getDocs(
      query(collection(firestore,"payments"),where("clientId","==",client.id))
    );
    payments=snap.docs.map(d=>({id:d.id,...d.data()}));
  }catch(e){console.warn("Pagamentos indisponíveis",e);}

  let benefits=[];
  try{benefits=await readCollection("benefits");}
  catch(e){console.warn("Benefícios indisponíveis",e);}

  let memories=[],tripDocuments=[],recommendations=[];
  window.ipaMemoryCloudLoadError = false;
  try{
    const s=await getDocs(query(collection(firestore,"memories"),where("clientId","==",client.id)));
    memories=s.docs.map(d=>({id:d.id,...d.data()})).filter(x=>trips.some(t=>t.id===x.tripId));
  }catch(e){
    window.ipaMemoryCloudLoadError=true;
    console.warn("Não foi possível carregar as memórias da nuvem",e);
  }
  try{const s=await getDocs(query(collection(firestore,"tripDocuments"),where("clientId","==",client.id)));tripDocuments=s.docs.map(d=>({id:d.id,...d.data()})).filter(x=>trips.some(t=>t.id===x.tripId))}catch(e){}
  for(const trip of trips){
    try{const s=await getDocs(query(collection(firestore,"recommendations"),where("tripId","==",trip.id)));
      recommendations.push(...s.docs.map(d=>({id:d.id,...d.data()})));
    }catch(e){console.warn("Recomendações indisponíveis para a viagem",trip.id,e)}
  }

  const cloudData={
    activeClientId:client.id,
    activeTripId:chosenTrip.id,
    clients:[client],
    client:{
      id:client.id,
      name:client.name||"Viajante",
      email:client.email||normalizedEmail,
      plan:chosenTrip.plan||"Explore",
      trip:chosenTrip.name||"Minha viagem"
    },
    trips,
    payments,
    benefits,
    memories,
    tripDocuments,
    recommendations
  };

  if(window.IPAData?.replaceFromCloud)window.IPAData.replaceFromCloud(cloudData);

  localStorage.setItem("ipa-active-client-id",client.id);
  localStorage.setItem("ipa-active-trip-id",chosenTrip.id);
  localStorage.setItem("ipa-client-id-for-signin",client.id);
  localStorage.setItem("ipa-trip-id-for-signin",chosenTrip.id);

  status="client-connected";
  lastError="";
  initialized=true;

  // Limpa a URL somente DEPOIS de a viagem ter sido resolvida.
  try{
    const clean=new URL(window.location.href);
    ["mode","oobCode","apiKey","lang","clientInvite","clientId","tripId","ipaInvite","continueUrl","continue_url"]
      .forEach(k=>clean.searchParams.delete(k));
    history.replaceState({},document.title,clean.pathname+(clean.searchParams.toString()?("?"+clean.searchParams.toString()):""));
  }catch(e){}

  notify("ipa-client-experience-ready");
  return cloudData;
}

async function bootstrapAfterLogin(){
  status="syncing";
  notify();
  try{
    // Beta 6.29.4: Firestore is the source of truth after admin login.
    // An intentionally empty cloud database must stay empty; never repopulate
    // it automatically from stale browser/localStorage data.
    await pullAll();
    initialized=true;
    status="connected";
    lastError="";
    notify("ipa-firebase-ready");
  }catch(err){
    console.error("Firebase bootstrap error",err);
    status="error";
    lastError=err?.message||String(err);
    notify();
  }
}

onAuthStateChanged(auth,async user=>{
  currentUser=user||null;
  if(!user){
    status="signed-out";
    initialized=false;
    notify("ipa-firebase-ready");
    return;
  }

  if(user.uid!==ADMIN_UID){
    // No primeiro acesso pelo convite, o cliente precisa criar uma senha
    // antes de entrar definitivamente na experiência.
    if(isSignInWithEmailLink(auth,window.location.href) || sessionStorage.getItem("ipa-client-password-setup")==="1"){
      status="client-password-setup";
      lastError="";
      notify("ipa-client-password-setup");
      return;
    }
    try{
      await loadClientExperience();
      notify("ipa-firebase-ready");
    }catch(err){
      console.error("Client experience error",err);
      status="error";
      lastError=err?.message||String(err);
      notify("ipa-client-experience-ready");
    }
    return;
  }

  await bootstrapAfterLogin();
});

window.IPAFirebase = {
  async submitConciergeRequest(request){
    if(!currentUser || currentUser.uid===ADMIN_UID)throw new Error('Entre com o login do viajante.');
    if(!request?.tripId || !String(request.text||'').trim())throw new Error('Informe a viagem e os detalhes do pedido.');
    const item={id:'conc-'+currentUser.uid+'-'+Date.now(),tripId:String(request.tripId),clientId:String(request.clientId||''),type:String(request.type||'Outro').slice(0,80),text:String(request.text).trim().slice(0,3000),requesterUid:currentUser.uid,requesterEmail:currentUser.email||'',requesterName:String(request.requesterName||currentUser.displayName||currentUser.email?.split('@')[0]||'Viajante').slice(0,120),status:'Enviado',createdAt:new Date().toISOString(),messages:[{sender:'client',text:String(request.text).trim().slice(0,3000),createdAt:new Date().toISOString()}]};
    await setDoc(doc(firestore,'conciergeRequests',item.id),item);
    return item;
  },
  listenAdminConciergeRequests(onChange,onError){
    if(!currentUser || currentUser.uid!==ADMIN_UID)return ()=>{};
    return onSnapshot(collection(firestore,'conciergeRequests'),snap=>{
      onChange?.(snap.docs.map(d=>({id:d.id,...d.data()})));
    },err=>onError?.(err));
  },
  async getConciergeRequests(){
    if(!currentUser || currentUser.uid!==ADMIN_UID)throw new Error('Somente o ADM pode consultar pedidos.');
    return readCollection('conciergeRequests');
  },
  async deleteConciergeRequest(id){
    if(!currentUser || currentUser.uid!==ADMIN_UID)throw new Error('Somente o ADM pode excluir atendimentos.');
    const ref=doc(firestore,'conciergeRequests',String(id));
    await deleteDoc(ref);
    const check=await getDoc(ref);
    if(check.exists())throw new Error('O atendimento ainda consta no Firebase.');
  },
  async updateConciergeRequest(id,fields){
    if(!currentUser || currentUser.uid!==ADMIN_UID)throw new Error('Somente o ADM pode atualizar pedidos.');
    await setDoc(doc(firestore,'conciergeRequests',id),{status:fields.status||'Em análise',adminReply:String(fields.adminReply||'').slice(0,3000),answeredAt:new Date().toISOString()},{merge:true});
  },
  listenConciergeRequest(id,onChange,onError){
    if(!currentUser||!id)return ()=>{};
    return onSnapshot(doc(firestore,'conciergeRequests',String(id)),snap=>onChange?.(snap.exists()?{id:snap.id,...snap.data()}:null),err=>onError?.(err));
  },
  async getMyConciergeRequests(tripId){
    if(!currentUser||currentUser.uid===ADMIN_UID)throw new Error('Entre como viajante.');
    const q=query(collection(firestore,'conciergeRequests'),where('requesterUid','==',currentUser.uid),limit(100));
    const snap=await getDocs(q);
    return snap.docs.map(d=>({id:d.id,...d.data()})).filter(r=>String(r.tripId)===String(tripId)).sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||'')));
  },
  async sendConciergeMessage(id,text){
    if(!currentUser)throw new Error('Faça login.');
    const clean=String(text||'').trim();if(!clean)throw new Error('Digite uma mensagem.');
    const ref=doc(firestore,'conciergeRequests',String(id));
    const snap=await getDoc(ref);if(!snap.exists())throw new Error('Atendimento não encontrado.');
    const item=snap.data();
    if(currentUser.uid!==ADMIN_UID && item.requesterUid!==currentUser.uid)throw new Error('Sem acesso a este atendimento.');
    const sender=currentUser.uid===ADMIN_UID?'admin':'client';
    await updateDoc(ref,{messages:arrayUnion({sender,text:clean.slice(0,3000),createdAt:new Date().toISOString(),uid:currentUser.uid}),status:sender==='admin'?'Respondido':'Em análise',updatedAt:new Date().toISOString()});
  },
  async submitProspectRequest(lead,client){
    if(!lead?.id || !client?.id) throw new Error("Pedido inválido.");
    // Grava somente os dois documentos necessários. As regras do Firestore 6.28.1
    // permitem CREATE público validado, mas leitura/alteração continuam exclusivas do ADM.
    await setDoc(doc(firestore,"travelLeads",lead.id),{...lead,createdAt:lead.createdAt||new Date().toISOString()},{merge:false});
    await setDoc(doc(firestore,"clients",client.id),{...client,createdAt:client.createdAt||new Date().toISOString()},{merge:false});
    return {leadId:lead.id,clientId:client.id};
  },
  listenTripMessages(tripId,onChange,onError){
    if(!tripId)return ()=>{};
    const q=query(collection(firestore,"tripMessages"),where("tripId","==",tripId),orderBy("createdAt","asc"),limit(200));
    return onSnapshot(q,snap=>onChange&&onChange(snap.docs.map(d=>({id:d.id,...d.data()}))),err=>{console.error("Trip messages listener",err);onError&&onError(err)});
  },
  async sendTripMessage({tripId,text,participantId="",participantName=""}){
    if(!currentUser)throw new Error("Faça login para enviar mensagens.");
    const clean=String(text||"").trim();
    if(!tripId||!clean)throw new Error("Mensagem inválida.");
    const ref=await addDoc(collection(firestore,"tripMessages"),{
      tripId,text:clean.slice(0,2000),participantId,
      participantName:participantName||currentUser.displayName||currentUser.email||"Viajante",
      userUid:currentUser.uid,userEmail:currentUser.email||"",createdAt:serverTimestamp()
    });
    return ref.id;
  },
  async saveMemory(record){
    if(!currentUser)throw new Error("Entre na sua conta para sincronizar a memória.");
    if(!record?.id||!record?.tripId||!record?.clientId||!record?.url)throw new Error("Memória incompleta: viagem ou arquivo não identificado.");
    if(!String(record.url).startsWith("https://"))throw new Error("Arquivo ainda não está salvo na nuvem.");
    const payload={...record,updatedAt:new Date().toISOString()};
    await setDoc(doc(firestore,"memories",record.id),payload);
    const checked=await getDocFromServer(doc(firestore,"memories",record.id));
    if(!checked.exists())throw new Error("Não foi possível confirmar a memória no Firebase.");
    return record.id;
  },
  async uploadMemory(file,clientId,tripId){
    if(!currentUser)throw new Error("Faça login para enviar a memória.");
    const safe=(file.name||"arquivo").replace(/[^a-zA-Z0-9._-]/g,"_");
    const path=`memories/${clientId}/${tripId}/${Date.now()}-${safe}`;
    const snap=await uploadBytes(storageRef(storage,path),file,{contentType:file.type||"application/octet-stream"});
    return {url:await getDownloadURL(snap.ref),path};
  },
  async saveTripDocument(record){
    if(!currentUser || currentUser.uid!==ADMIN_UID)throw new Error("Somente o ADM pode salvar documentos.");
    if(!record?.id||!record.tripId||!record.clientId)throw new Error("Viagem ou cliente não identificado.");
    await setDoc(doc(firestore,"tripDocuments",record.id),{...record,updatedAt:serverTimestamp()});
    return record.id;
  },
  async uploadHotelPhoto(file,hotelId){
    if(!currentUser || currentUser.uid!==ADMIN_UID)throw new Error("Somente o ADM pode enviar fotos de hospedagens.");
    if(!file || !["image/jpeg","image/png","image/webp"].includes(file.type) || file.size>8*1024*1024)throw new Error("Use JPG, PNG ou WebP de até 8 MB.");
    const safe=(file.name||"foto.jpg").replace(/[^a-zA-Z0-9._-]/g,"_");
    const path=`hotels/${String(hotelId).replace(/[^a-zA-Z0-9_-]/g,"_")}/${Date.now()}-${safe}`;
    const snap=await uploadBytes(storageRef(storage,path),file,{contentType:file.type});
    return {url:await getDownloadURL(snap.ref),path};
  },
  async uploadTripDocument(file,clientId,tripId){
    if(!currentUser || currentUser.uid!==ADMIN_UID)throw new Error("Somente o ADM pode enviar documentos.");
    const safe=(file.name||"documento").replace(/[^a-zA-Z0-9._-]/g,"_");
    const path=`documents/${clientId}/${tripId}/${Date.now()}-${safe}`;
    const snap=await uploadBytes(storageRef(storage,path),file,{contentType:file.type||"application/octet-stream"});
    return {url:await getDownloadURL(snap.ref),path};
  },

  get user(){ return currentUser; },
  get status(){ return status; },
  get error(){ return lastError; },
  get initialized(){ return initialized; },
  async login(email,password){
    status="signing-in";
    lastError="";
    // IMPORTANTE: não dispara notify() aqui.
    // O notify anterior fazia o app re-renderizar o formulário no meio do login,
    // recriando o botão "Entrando..." e causando o looping visual.
    try{
      const credential = await signInWithEmailAndPassword(auth,String(email||"").trim().toLowerCase(),password);
      currentUser=credential.user;

      if(currentUser.uid!==ADMIN_UID){
        await signOut(auth);
        currentUser=null;
        status="unauthorized";
        lastError="Este usuário não é o administrador autorizado.";
        notify("ipa-firebase-ready");
        throw new Error(lastError);
      }

      // Libera o painel imediatamente.
      status="connected";
      lastError="";
      notify("ipa-admin-login-success");

      // A sincronização completa continua pelo onAuthStateChanged.
      return credential.user;
    }catch(err){
      if(status!=="unauthorized"){
        currentUser=null;
        status="signed-out";
        lastError=err?.message||String(err);
        notify("ipa-admin-login-error");
      }
      throw err;
    }
  },
  async clientLogin(email,password){
    status="client-signing-in"; lastError="";
    const credential=await signInWithEmailAndPassword(auth,String(email||"").trim().toLowerCase(),password);
    currentUser=credential.user;
    if(currentUser.uid===ADMIN_UID){
      await signOut(auth); currentUser=null;
      throw new Error("Use o acesso ADM para esta conta.");
    }
    await loadClientExperience();
    return credential.user;
  },
  async setClientPassword(password){
    if(!currentUser || currentUser.uid===ADMIN_UID) throw new Error("Acesso de cliente não autenticado.");
    if(String(password||"").length<6) throw new Error("A senha precisa ter pelo menos 6 caracteres.");
    // A operação de senha é independente do carregamento dos dados de viagem.
    // Depois do sucesso, nunca pedir para o cliente cadastrar a senha novamente
    // só porque uma consulta ao Firestore falhou.
    await updatePassword(currentUser,password);
    sessionStorage.removeItem("ipa-client-password-setup");
    history.replaceState({},document.title,window.location.pathname);
    try{
      await loadClientExperience();
    }catch(err){
      console.error('Senha salva; falha ao carregar experiência:',err);
      status='client-load-error';
      lastError=err?.message||'Falha ao carregar os dados da viagem.';
      notify('ipa-client-experience-ready');
      return {passwordSaved:true,experienceLoaded:false,status,error:lastError};
    }
    notify('ipa-client-experience-ready');
    return {passwordSaved:true,experienceLoaded:status==='client-connected',status,error:lastError};
  },
  async resetClientPassword(email){
    const normalized=String(email||"").trim().toLowerCase();
    if(!normalized) throw new Error("Informe seu e-mail.");
    await sendPasswordResetEmail(auth,normalized,{url:"https://app.indoporaicomagente.com/"});
    return true;
  },
  async logout(){
    await signOut(auth);
  },
  async sendCustomClientInvite(email,clientId,tripId="",name=""){
    if(!currentUser||currentUser.uid!==ADMIN_UID)throw new Error("Entre como ADM para enviar o convite.");
    const response=await fetch('/api/email/invite',{method:'POST',headers:{'authorization':'Bearer '+await currentUser.getIdToken(),'content-type':'application/json'},body:JSON.stringify({email,clientId,tripId,name})});
    let data={};try{data=await response.json()}catch{}
    if(!response.ok||!data.ok)throw new Error(data.error||'Falha no envio personalizado.');
    return data;
  },
  // Compatibilidade: qualquer fluxo antigo de convites também usa somente o Resend.
  // Nunca chamar sendSignInLinkToEmail aqui, pois ele dispara o email genérico do Firebase.
  async sendClientInvite(email,clientId,tripId="",name="Viajante"){
    return this.sendCustomClientInvite(email,clientId,tripId,name);
  },
  isEmailSignInLink(){ return isSignInWithEmailLink(auth,window.location.href); },
  async completeEmailLink(email){
    if(!isSignInWithEmailLink(auth,window.location.href)) return null;
    const context=readInviteContext();
    if(context.clientId)localStorage.setItem("ipa-client-id-for-signin",context.clientId);
    if(context.tripId)localStorage.setItem("ipa-trip-id-for-signin",context.tripId);
    email=(email||localStorage.getItem("ipa-email-for-signin")||"").trim().toLowerCase();
    if(!email) throw new Error("Confirme o e-mail que recebeu o convite.");
    sessionStorage.setItem("ipa-client-password-setup","1");
    const user=(await signInWithEmailLink(auth,email,window.location.href)).user;
    localStorage.removeItem("ipa-email-for-signin");
    status="client-password-setup";
    notify("ipa-client-password-setup");
    return user;
  },
  async loadClientExperience(){
    if(!currentUser) throw new Error("Faça login primeiro.");
    return loadClientExperience();
  },
  async refresh(){
    if(!currentUser) throw new Error("Faça login primeiro.");
    return pullAll();
  },
  async deleteTrip(id){
    if(!currentUser || currentUser.uid!==ADMIN_UID)throw new Error('Somente o ADM pode excluir viagens.');
    if(!id)throw new Error('Viagem inválida.');
    await deleteDoc(doc(firestore,'trips',id));
    return true;
  },
  async deleteTripDocument(id){
    if(!currentUser || currentUser.uid!==ADMIN_UID) throw new Error("Somente o ADM pode excluir documentos.");
    if(!id) throw new Error("Documento inválido.");
    await deleteDoc(doc(firestore,"tripDocuments",id));
    return true;
  },
  async createCatalogPlace(place){
    if(!currentUser || currentUser.uid!==ADMIN_UID)throw new Error('Somente o ADM pode cadastrar lugares. Faça login administrativo novamente.');
    if(!place?.id || !place?.name || !place?.city || !place?.country)throw new Error('Informe nome, cidade e país.');
    const ref=doc(firestore,'placeCatalog',String(place.id));
    const exists=await getDoc(ref);
    if(exists.exists())throw new Error('Já existe um lugar com este identificador. Tente novamente.');
    await setDoc(ref,place);
    const confirmed=await getDoc(ref);
    if(!confirmed.exists() || confirmed.data().name!==place.name)throw new Error('O Firebase não confirmou o cadastro.');
    return confirmed.data();
  },
  async saveCatalogPhoto(id,patch){
    if(!currentUser || currentUser.uid!==ADMIN_UID)throw new Error('Apenas o ADM pode atualizar o catálogo.');
    const ref=doc(firestore,'placeCatalog',String(id));
    const before=await getDoc(ref);
    if(!before.exists())throw new Error('Lugar não encontrado no Firebase.');
    if(before.data().photoUrl)return false;
    await updateDoc(ref,{...patch,updatedAt:serverTimestamp()});
    const after=await getDoc(ref);
    if(after.data()?.photoUrl!==patch.photoUrl)throw new Error('A foto não foi confirmada no Firebase.');
    return true;
  },
  async saveTripItineraryPhotos(tripId,itinerary){
    if(!currentUser || currentUser.uid!==ADMIN_UID)throw new Error('Apenas o ADM pode atualizar roteiros.');
    const ref=doc(firestore,'trips',String(tripId));
    await updateDoc(ref,{itinerary,updatedAt:serverTimestamp()});
    const verified=await getDoc(ref);
    if(!verified.exists())throw new Error('Viagem não encontrada após salvar.');
    const saved=verified.data().itinerary||[];
    const expected=itinerary.flatMap(d=>(d.places||[]).filter(p=>p&&p.photoUrl).map(p=>({day:d.day,id:p.id,name:p.name,photoUrl:p.photoUrl})));
    for(const pic of expected){
      const day=saved.find(d=>String(d.day)===String(pic.day));
      const found=(day?.places||[]).find(p=>pic.id?String(p.id)===String(pic.id):p.name===pic.name);
      if(!found||found.photoUrl!==pic.photoUrl)throw new Error('Foto não confirmada na viagem.');
    }
  },
  async deleteCatalogPlace(id){
    if(!currentUser || currentUser.uid!==ADMIN_UID) throw new Error("Somente o ADM pode excluir lugares.");
    if(!id) throw new Error("Lugar inválido.");
    await deleteDoc(doc(firestore,"placeCatalog",id));
    return true;
  },
  async saveHotelPhotosToTrips(updates){
    if(!currentUser || currentUser.uid!==ADMIN_UID) throw new Error("Somente o ADM pode atualizar as fotos das viagens.");
    const results=[];
    for(const item of updates){
      if(!item.tripId || !Array.isArray(item.hotelBookings)) continue;
      const tripRef=doc(firestore,"trips",String(item.tripId));
      await setDoc(tripRef,{hotelBookings:item.hotelBookings},{merge:true});
      const confirmed=await getDoc(tripRef);
      if(!confirmed.exists()) throw new Error("Viagem não encontrada após salvar: "+item.tripId);
      const stored=confirmed.data().hotelBookings||[];
      for(const booking of item.hotelBookings){
        if(!booking.photoUrl) continue;
        const found=stored.find(x=>String(x.id)===String(booking.id));
        if(!found || found.photoUrl!==booking.photoUrl)throw new Error("A URL da foto não foi confirmada na viagem "+item.tripId);
      }
      results.push(item.tripId);
    }
    return results;
  },
  async confirmClientTripPublication(clientId,tripId,approveClient=true){
    if(!currentUser || currentUser.uid!==ADMIN_UID)throw new Error('Entre no ADM autorizado.');
    if(!clientId||!tripId)throw new Error('Selecione cliente e viagem.');
    const local=window.IPAData?.getAll?.()||{};
    const c=(local.clients||[]).find(x=>x.id===clientId);
    const t=(local.trips||[]).find(x=>x.id===tripId);
    if(!c||!t)throw new Error('Cadastro ou viagem não encontrado.');
    if(t.clientId && t.clientId!==clientId)throw new Error('A viagem está vinculada a outro cliente.');
    if(!String(c.email||'').trim())throw new Error('Cliente sem e-mail.');
    const now=new Date().toISOString();
    // As gravações são explícitas: syncNow pode estar em andamento e não
    // confirma os documentos individuais.
    await setDoc(doc(firestore,'clients',clientId),{
      ...c,...(approveClient?{approvalStatus:'Aprovado',accessApproved:true,approvedAt:c.approvedAt||now}:{}),
      activeTripId:tripId,lastInvitedTripId:tripId,updatedAt:serverTimestamp()
    },{merge:true});
    await setDoc(doc(firestore,'trips',tripId),{
      ...t,clientId,published:true,status:'Publicado',publishedAt:t.publishedAt||now,
      updatedAt:serverTimestamp()
    },{merge:true});
    const [clientCheck,tripCheck]=await Promise.all([
      getDoc(doc(firestore,'clients',clientId)),getDoc(doc(firestore,'trips',tripId))
    ]);
    if(!clientCheck.exists()||!tripCheck.exists()||
      clientCheck.data().activeTripId!==tripId||
      (approveClient && clientCheck.data().approvalStatus!=='Aprovado')||
      tripCheck.data().clientId!==clientId||tripCheck.data().published!==true){
      throw new Error('A publicação não foi confirmada no Firebase. O convite não foi enviado.');
    }
    return {clientId,tripId};
  },
  async saveClientPublicationNotice(clientId,tripId,{channel,sentAt}){
    if(!currentUser||currentUser.uid!==ADMIN_UID)throw Error('Entre como ADM.');
    if(!clientId||!tripId||!sentAt)throw Error('Dados do convite incompletos.');
    await Promise.all([
      setDoc(doc(firestore,'clients',String(clientId)),{inviteStatus:'sent',inviteSentAt:sentAt,updatedAt:serverTimestamp()},{merge:true}),
      setDoc(doc(firestore,'trips',String(tripId)),{publicationInviteSentAt:sentAt,publicationInviteError:'',notificationChannel:channel,updatedAt:serverTimestamp()},{merge:true})
    ]);
    return true;
  },
  // Atualização pontual: não depende de syncAll (que pode estar em andamento).
  async saveTripClimateConfirmed(tripId,climateContent,editedAt){
    if(!currentUser||currentUser.uid!==ADMIN_UID)throw new Error('Entre como administrador para salvar.');
    if(!tripId||!Array.isArray(climateContent))throw new Error('Dados da recomendação incompletos.');
    const target=doc(firestore,'trips',String(tripId));
    // Elimina valores undefined internos rejeitados pelo Firestore e diferenças de serialização.
    const cleaned=JSON.parse(JSON.stringify(climateContent));
    const write=setDoc(target,{climateContent:cleaned,climateEditedAt:editedAt,updatedAt:serverTimestamp()},{merge:true});
    // Não considere a ausência de resposta como falha confirmada: a gravação ainda pode concluir.
    let writeTimeout;
    try{
      await Promise.race([write,new Promise((_,reject)=>{writeTimeout=setTimeout(()=>reject(new Error('O Firebase não respondeu em 25 segundos. O resultado é incerto: reabra a viagem e confira o link antes de tentar novamente.')),25000)})]);
    }finally{clearTimeout(writeTimeout)}
    const snapshot=await getDocFromServer(target);
    if(!snapshot.exists())throw new Error('A viagem não foi encontrada após salvar.');
    const saved=snapshot.data();
    if(saved.climateEditedAt!==editedAt)throw new Error('A confirmação ainda não apareceu no servidor. Reabra a viagem para conferir.');
    // Confere especificamente os links por plataforma (não os demais campos antigos do roteiro).
    for(let i=0;i<cleaned.length;i++){
      const expected=cleaned[i]?.links||{},actual=saved.climateContent?.[i]?.links||{};
      for(const [platform,url] of Object.entries(expected))if(actual[platform]!==url)
        throw new Error('Link de '+platform+' não foi confirmado no servidor.');
    }
    return true;
  },
  // Salva a ordem escolhida pelo ADM sem depender de sincronização global.
  async saveLeadSuggestionConfirmed(leadId){
    if(!currentUser||currentUser.uid!==ADMIN_UID)throw new Error('Entre como ADM para salvar a ordem.');
    const lead=(window.IPAData?.getAll?.().travelLeads||[]).find(l=>String(l.id)===String(leadId));
    if(!lead)throw new Error('Pedido não encontrado.');
    const ref=doc(firestore,'travelLeads',String(leadId));
    await setDoc(ref,{adminSuggestion:lead.adminSuggestion,updatedAt:serverTimestamp()},{merge:true});
    const check=await getDoc(ref);
    if(!check.exists()||!check.data().adminSuggestion)throw new Error('A ordem não foi confirmada no Firebase.');
    return true;
  },
  // Beta 6.29.84: gravação confirmada do fluxo Pedidos → Viagens.
  // Não depende de syncAll, que pode retornar durante outra sincronização.
  async saveLeadTripConfirmed({tripId,clientId,leadId,onProgress}){
    const progress=typeof onProgress==='function'?onProgress:()=>{};
    if(!currentUser || currentUser.uid!==ADMIN_UID)throw new Error('Entre com a conta ADM para salvar.');
    const d=window.IPAData?.getAll?.()||{};
    const trip=(d.trips||[]).find(t=>String(t.id)===String(tripId));
    const client=(d.clients||[]).find(c=>String(c.id)===String(clientId));
    const lead=(d.travelLeads||[]).find(l=>String(l.id)===String(leadId));
    if(!trip||!client||!lead)throw new Error('Não foi possível localizar o pedido, a viagem ou o cliente.');
    if(String(trip.clientId)!==String(clientId))throw new Error('A viagem não está vinculada ao cliente selecionado.');
    if(!Array.isArray(trip.itinerary)||!trip.itinerary.length)throw new Error('O roteiro precisa ter ao menos um dia.');
    // Evita criar uma segunda viagem quando o ADM precisar tentar outra vez.
    clearTimeout(syncTimer);
    const tripRef=doc(firestore,'trips',String(tripId));
    const clientRef=doc(firestore,'clients',String(clientId));
    const leadRef=doc(firestore,'travelLeads',String(leadId));
    const steps=[
      {name:'Gravando viagem...',ref:tripRef,data:{...trip,sourceLeadId:leadId,updatedAt:serverTimestamp()}},
      {name:'Vinculando cliente...',ref:clientRef,data:{...client,activeTripId:tripId,lastConfiguredTripId:tripId,updatedAt:serverTimestamp()}},
      {name:'Atualizando pedido...',ref:leadRef,data:{...lead,tripId,status:'Roteiro aprovado',updatedAt:serverTimestamp()}}
    ];
    for(const step of steps){
      progress(step.name);
      try{await setDoc(step.ref,step.data,{merge:true})}
      catch(e){throw new Error(`${step.name.replace('...','')} falhou: ${e?.code||e?.message||'erro desconhecido'}`)}
    }
    progress('Conferindo dados no Firebase...');
    const [savedTrip,savedClient,savedLead]=await Promise.all([getDoc(tripRef),getDoc(clientRef),getDoc(leadRef)]);
    if(!savedTrip.exists()||!savedClient.exists()||!savedLead.exists()||
      String(savedTrip.data().clientId)!==String(clientId)||
      String(savedClient.data().activeTripId)!==String(tripId)||
      String(savedLead.data().tripId)!==String(tripId)){
      throw new Error('A verificação não confirmou os vínculos entre pedido, cliente e viagem.');
    }
    return {tripId,clientId,leadId};
  },
  async syncNow(){
    if(!currentUser) throw new Error("Faça login primeiro.");
    return syncAll(window.IPAData?.getAll?.());
  }
};

window.dispatchEvent(new CustomEvent("ipa-firebase-service-loaded"));
