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
  limit
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";

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
  const [clients,trips,payments,benefits,itineraryTemplates] = await Promise.all([
    readCollection("clients"),
    readCollection("trips"),
    readCollection("payments"),
    readCollection("benefits"),
    readCollection("itineraryTemplates")
  ]);

  const settingsSnap = await getDoc(doc(firestore,"settings","main"));
  const settings = settingsSnap.exists() ? settingsSnap.data() : {};

  const cloudData = {
    ...settings,
    clients,
    trips,
    payments,
    benefits,
    itineraryTemplates
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
      upsertCollection("itineraryTemplates",data.itineraryTemplates)
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


async function loadClientExperience(){
  if(!currentUser || currentUser.uid===ADMIN_UID) return null;
  status="syncing";
  notify();

  const normalizedEmail=(currentUser.email||"").trim().toLowerCase();
  const params=new URLSearchParams(window.location.search);
  const invitedClientId=params.get("clientId")||localStorage.getItem("ipa-active-client-id")||"";

  let clientDoc=null;

  // Primeiro acesso: usa o ID que foi embutido no convite.
  // Isso evita depender de consulta por authUid antes de o vínculo existir.
  if(invitedClientId){
    try{
      const snap=await getDoc(doc(firestore,"clients",invitedClientId));
      if(snap.exists()) clientDoc=snap;
    }catch(e){
      console.warn("Não foi possível abrir o clientId do convite",e);
    }
  }

  // Fallback seguro: o e-mail autenticado precisa ser igual ao e-mail do cadastro.
  if(!clientDoc){
    const clientSnap=await getDocs(
      query(collection(firestore,"clients"),where("email","==",normalizedEmail),limit(1))
    );
    if(!clientSnap.empty) clientDoc=clientSnap.docs[0];
  }

  if(!clientDoc){
    status="client-no-profile";
    lastError="Seu acesso existe, mas não encontramos um cadastro de cliente para este e-mail.";
    notify("ipa-client-experience-ready");
    return null;
  }

  const client={id:clientDoc.id,...clientDoc.data()};

  // Validação extra no front-end. As regras do Firestore repetem essa proteção.
  if(String(client.email||"").trim().toLowerCase()!==normalizedEmail){
    status="client-no-profile";
    lastError="Este convite não pertence ao e-mail autenticado.";
    notify("ipa-client-experience-ready");
    return null;
  }

  // Persist the UID back into the client document. Security Rules in this
  // package allow the authenticated owner to claim only their own profile.
  if(!client.authUid){
    await setDoc(doc(firestore,"clients",client.id),{
      authUid:currentUser.uid,
      email:normalizedEmail,
      firstAccessAt:serverTimestamp()
    },{merge:true});
    client.authUid=currentUser.uid;
  }

  const requestedTripId=params.get("tripId")||localStorage.getItem("ipa-trip-id-for-signin")||"";
  let trips=[];

  // Se o convite veio de uma viagem específica, carrega exatamente ela.
  if(requestedTripId){
    try{
      const tripDoc=await getDoc(doc(firestore,"trips",requestedTripId));
      if(tripDoc.exists()){
        const requestedTrip={id:tripDoc.id,...tripDoc.data()};
        if(requestedTrip.clientId===client.id && requestedTrip.published===true){
          trips=[requestedTrip];
        }
      }
    }catch(e){
      console.warn("Não foi possível carregar a viagem do convite",e);
    }
  }

  // Fallback para convites antigos: busca viagens publicadas do cliente.
  if(!trips.length){
    const tripQuery=query(collection(firestore,"trips"),where("clientId","==",client.id));
    const tripSnap=await getDocs(tripQuery);
    trips=tripSnap.docs.map(d=>({id:d.id,...d.data()})).filter(t=>t.published===true);
  }

  let payments=[];
  try{
    const paymentQuery=query(collection(firestore,"payments"),where("clientId","==",client.id));
    const paymentSnap=await getDocs(paymentQuery);
    payments=paymentSnap.docs.map(d=>({id:d.id,...d.data()}));
  }catch(e){
    console.warn("Pagamentos do cliente ainda não vinculados",e);
  }

  let benefits=[];
  try{
    benefits=await readCollection("benefits");
  }catch(e){
    console.warn("Benefícios indisponíveis para cliente",e);
  }

  const today=new Date().toISOString().slice(0,10);
  trips.sort((a,b)=>{
    const aa=String(a.startDate||"9999-12-31"),bb=String(b.startDate||"9999-12-31");
    const aFuture=aa>=today,bFuture=bb>=today;
    if(aFuture!==bFuture) return aFuture?-1:1;
    return aFuture ? aa.localeCompare(bb) : bb.localeCompare(aa);
  });
  const chosenTrip=trips[0]||null;
  const cloudData={
    clients:[client],
    client:{
      id:client.id,
      name:client.name||"Viajante",
      email:client.email||normalizedEmail,
      plan:chosenTrip?.plan||"Explore",
      trip:chosenTrip?.name||"Minha viagem"
    },
    trips,
    payments,
    benefits
  };

  if(window.IPAData?.replaceFromCloud) window.IPAData.replaceFromCloud(cloudData);
  localStorage.setItem("ipa-active-client-id",client.id);
  if(chosenTrip){
    localStorage.setItem("ipa-active-trip-id",chosenTrip.id);
    localStorage.setItem("ipa-trip-id-for-signin",chosenTrip.id);
  }

  // Remove o código de autenticação/convite da barra de endereço sem recarregar.
  try{
    const clean=new URL(window.location.href);
    ["mode","oobCode","apiKey","lang","clientInvite","clientId","tripId"].forEach(k=>clean.searchParams.delete(k));
    history.replaceState({},document.title,clean.pathname+(clean.searchParams.toString()?("?"+clean.searchParams.toString()):""));
  }catch(e){}

  status=chosenTrip ? "client-connected" : "client-no-trip";
  lastError=chosenTrip ? "" : "Seu cadastro foi encontrado, mas ainda não existe uma viagem publicada para você.";
  initialized=true;
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
  get user(){ return currentUser; },
  get status(){ return status; },
  get error(){ return lastError; },
  get initialized(){ return initialized; },
  async login(email,password){
    status="signing-in";
    lastError="";
    notify();
    const credential = await signInWithEmailAndPassword(auth,email,password);
    return credential.user;
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
