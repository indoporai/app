import { initializeApp } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  query,
  where,
  limit,
  addDoc,
  orderBy,
  onSnapshot
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

async function remoteHasData(){
  const snap = await getDocs(collection(firestore,"clients"));
  return !snap.empty;
}

async function pullAll(){
  const [clients,trips,payments,benefits,itineraryTemplates,paymentPlans,recommendations,tripDocuments,memories,conciergeRequests] = await Promise.all([
    readCollection("clients"),
    readCollection("trips"),
    readCollection("payments"),
    readCollection("benefits"),
    readCollection("itineraryTemplates"),
    readCollection("paymentPlans"),
    readCollection("recommendations"),
    readCollection("tripDocuments"),
    readCollection("memories"),
    readCollection("conciergeRequests")
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
    conciergeRequests
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
      upsertCollection("conciergeRequests",data.conciergeRequests)
    ]);

    await setDoc(doc(firestore,"settings","main"),{
      client:data.client||{},
      plans:data.plans||{},
      exchange:data.exchange||{},
      prep:data.prep||{},
      visitReviews:data.visitReviews||{},
      ratings:data.ratings||{},
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

  // Convite com tripId é estrito: nunca abre uma viagem antiga como fallback.
  if(inviteContext.tripId && !chosenTrip){
    status="client-no-trip";
    lastError="O link desta viagem não é mais válido ou a viagem ainda não foi publicada.";
    notify("ipa-client-experience-ready");
    return null;
  }

  // Sem tripId no link (acesso geral), aí sim usa a viagem ativa.
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

  // Último fallback: qualquer viagem publicada daquele cliente.
  let trips=[];
  if(!chosenTrip){
    try{
      const snap=await getDocs(
        query(collection(firestore,"trips"),where("clientId","==",client.id))
      );
      trips=snap.docs.map(d=>({id:d.id,...d.data()})).filter(t=>t.published===true);
      const today=new Date().toISOString().slice(0,10);
      trips.sort((a,b)=>{
        const aa=String(a.startDate||"9999-12-31"),bb=String(b.startDate||"9999-12-31");
        const af=aa>=today,bf=bb>=today;
        if(af!==bf)return af?-1:1;
        return af?aa.localeCompare(bb):bb.localeCompare(aa);
      });
      chosenTrip=trips[0]||null;
    }catch(e){
      console.warn("Busca de viagens do cliente falhou",e);
    }
  }

  if(chosenTrip)trips=[chosenTrip];

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
  try{const s=await getDocs(query(collection(firestore,"memories"),where("clientId","==",client.id)));memories=s.docs.map(d=>({id:d.id,...d.data()})).filter(x=>x.tripId===chosenTrip.id)}catch(e){}
  try{const s=await getDocs(query(collection(firestore,"tripDocuments"),where("clientId","==",client.id)));tripDocuments=s.docs.map(d=>({id:d.id,...d.data()})).filter(x=>x.tripId===chosenTrip.id)}catch(e){}
  try{const s=await getDocs(query(collection(firestore,"recommendations"),where("tripId","==",chosenTrip.id)));recommendations=s.docs.map(d=>({id:d.id,...d.data()}))}catch(e){}

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
    trips:[chosenTrip],
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
    ["mode","oobCode","apiKey","lang","clientInvite","clientId","tripId","continueUrl","continue_url"]
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
    const exists = await remoteHasData();
    if(exists){
      await pullAll();
    }else{
      const local = window.IPAData?.getAll?.();
      if(local) await syncAll(local);
    }
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
  async uploadMemory(file,clientId,tripId){
    if(!currentUser)throw new Error("Faça login para enviar a memória.");
    const safe=(file.name||"arquivo").replace(/[^a-zA-Z0-9._-]/g,"_");
    const path=`memories/${clientId}/${tripId}/${Date.now()}-${safe}`;
    const snap=await uploadBytes(storageRef(storage,path),file,{contentType:file.type||"application/octet-stream"});
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
      const credential = await signInWithEmailAndPassword(auth,email,password);
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
  async logout(){
    await signOut(auth);
  },
  async sendClientInvite(email,clientId,tripId=""){
    if(!currentUser || currentUser.uid!==ADMIN_UID) throw new Error("Entre como administrador.");
    if(!email) throw new Error("Cliente sem e-mail cadastrado.");
    const url=new URL("https://app-ci8.pages.dev/");
    url.searchParams.set("clientInvite","1");
    if(clientId) url.searchParams.set("clientId",clientId);
    if(tripId) url.searchParams.set("tripId",tripId);
    // redundância simples para facilitar diagnóstico/compatibilidade
    if(clientId||tripId){
      url.searchParams.set("ipaInvite",btoa(unescape(encodeURIComponent(JSON.stringify({clientId:clientId||"",tripId:tripId||""})))));
    }
    const normalizedEmail=email.trim().toLowerCase();
    await sendSignInLinkToEmail(auth,normalizedEmail,{url:url.toString(),handleCodeInApp:true});
    localStorage.setItem("ipa-email-for-signin",normalizedEmail);
    localStorage.setItem("ipa-client-id-for-signin",clientId||"");
    if(tripId) localStorage.setItem("ipa-trip-id-for-signin",tripId);
    return {email:normalizedEmail,clientId:clientId||"",tripId:tripId||"",continueUrl:url.toString()};
  },
  isEmailSignInLink(){ return isSignInWithEmailLink(auth,window.location.href); },
  async completeEmailLink(email){
    if(!isSignInWithEmailLink(auth,window.location.href)) return null;
    const context=readInviteContext();
    if(context.clientId)localStorage.setItem("ipa-client-id-for-signin",context.clientId);
    if(context.tripId)localStorage.setItem("ipa-trip-id-for-signin",context.tripId);
    email=(email||localStorage.getItem("ipa-email-for-signin")||"").trim().toLowerCase();
    if(!email) throw new Error("Confirme o e-mail que recebeu o convite.");
    const user=(await signInWithEmailLink(auth,email,window.location.href)).user;
    localStorage.removeItem("ipa-email-for-signin");
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
  async syncNow(){
    if(!currentUser) throw new Error("Faça login primeiro.");
    return syncAll(window.IPAData?.getAll?.());
  }
};

window.dispatchEvent(new CustomEvent("ipa-firebase-service-loaded"));
