import { initializeApp } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  serverTimestamp
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
    lastError="Este usuário não possui permissão de administrador.";
    status="unauthorized";
    notify();
    await signOut(auth);
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
