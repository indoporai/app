const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });

function extractPixPayment(payment) {
  const tx = payment?.point_of_interaction?.transaction_data || {};
  return {
    paymentId: String(payment?.id || ""),
    paymentStatus: payment?.status || "",
    paymentStatusDetail: payment?.status_detail || "",
    externalReference: payment?.external_reference || "",
    ticketUrl: tx?.ticket_url || "",
    qrCode: tx?.qr_code || "",
    qrCodeBase64: tx?.qr_code_base64 || "",
    dateOfExpiration: payment?.date_of_expiration || ""
  };
}

async function mercadoPagoFetch(env, path, init = {}) {
  const token = env.MERCADO_PAGO_ACCESS_TOKEN;
  if (!token) {
    return { ok:false, response:json({ok:false,error:"MERCADO_PAGO_ACCESS_TOKEN não configurado no Cloudflare."},500) };
  }
  const response = await fetch(`https://api.mercadopago.com${path}`, {
    ...init,
    headers:{
      "accept":"application/json",
      "content-type":"application/json",
      "authorization":`Bearer ${token}`,
      ...(init.headers || {})
    }
  });
  let body={};
  try { body=await response.json(); } catch { body={message:await response.text()}; }
  if(!response.ok){
    return {ok:false,response:json({ok:false,status:response.status,error:body?.message||body?.error||"Erro Mercado Pago",details:body},response.status)};
  }
  return {ok:true,body};
}

function onlyDigits(value){ return String(value||"").replace(/\D/g,""); }
function validEmail(value){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value||"").trim()); }

async function stableIdempotency(reference){
  const bytes=new TextEncoder().encode(reference);
  const digest=new Uint8Array(await crypto.subtle.digest("SHA-256",bytes));
  const hex=[...digest].map(b=>b.toString(16).padStart(2,"0")).join("").slice(0,32);
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-4${hex.slice(13,16)}-a${hex.slice(17,20)}-${hex.slice(20,32)}`;
}

async function createProductionPix(request, env) {
  let payload={};
  try { payload=await request.json(); } catch { return json({ok:false,error:"JSON inválido."},400); }
  const reference=String(payload.paymentId||"").trim();
  const amount=Number(payload.amount||0);
  const email=String(payload.payerEmail||"").trim().toLowerCase();
  const cpf=onlyDigits(payload.payerCpf);
  const description=String(payload.description||"Cobrança Indo por Aí").trim().slice(0,120);
  if(!reference)return json({ok:false,error:"paymentId obrigatório."},400);
  if(!Number.isFinite(amount)||amount<=0)return json({ok:false,error:"Valor da cobrança inválido."},400);
  if(!validEmail(email))return json({ok:false,error:"Informe um e-mail válido para o pagador."},400);
  if(cpf.length!==11)return json({ok:false,error:"Informe um CPF válido com 11 dígitos."},400);

  const externalReference=`indoporai_${reference}`;
  const idempotency=await stableIdempotency(`${externalReference}|${amount.toFixed(2)}|${email}`);
  const body={
    transaction_amount:Math.round(amount*100)/100,
    description,
    payment_method_id:"pix",
    external_reference:externalReference,
    notification_url:"https://app.indoporaicomagente.com/api/webhooks/mercadopago",
    payer:{email,identification:{type:"CPF",number:cpf}}
  };
  const result=await mercadoPagoFetch(env,"/v1/payments",{
    method:"POST",
    headers:{"X-Idempotency-Key":idempotency},
    body:JSON.stringify(body)
  });
  if(!result.ok)return result.response;
  return json({ok:true,environment:"production",amount,...extractPixPayment(result.body)});
}


function extractCardPayment(payment) {
  return {
    paymentId: String(payment?.id || ""),
    paymentStatus: payment?.status || "",
    paymentStatusDetail: payment?.status_detail || "",
    externalReference: payment?.external_reference || "",
    paymentMethodId: payment?.payment_method_id || "",
    paymentTypeId: payment?.payment_type_id || "",
    installments: Number(payment?.installments || 1)
  };
}

async function createProductionCard(request, env) {
  let payload={};
  try { payload=await request.json(); } catch { return json({ok:false,error:"JSON inválido."},400); }
  const reference=String(payload.paymentId||"").trim();
  const amount=Number(payload.amount||payload.transaction_amount||0);
  const token=String(payload.token||"").trim();
  const paymentMethodId=String(payload.payment_method_id||payload.paymentMethodId||"").trim();
  const issuerId=String(payload.issuer_id||payload.issuerId||"").trim();
  const installments=Math.max(1,Number(payload.installments||1));
  const email=String(payload.payer?.email||payload.payerEmail||"").trim().toLowerCase();
  const identificationType=String(payload.payer?.identification?.type||payload.identificationType||"CPF").trim();
  const identificationNumber=onlyDigits(payload.payer?.identification?.number||payload.identificationNumber);
  const description=String(payload.description||"Cobrança Indo por Aí").trim().slice(0,120);
  if(!reference)return json({ok:false,error:"paymentId obrigatório."},400);
  if(!Number.isFinite(amount)||amount<=0)return json({ok:false,error:"Valor da cobrança inválido."},400);
  if(!token)return json({ok:false,error:"Token do cartão não informado."},400);
  if(!paymentMethodId)return json({ok:false,error:"Meio de pagamento não identificado."},400);
  if(!validEmail(email))return json({ok:false,error:"Informe um e-mail válido para o pagador."},400);
  if(!identificationNumber)return json({ok:false,error:"Documento do pagador não informado."},400);
  const externalReference=`indoporai_${reference}`;
  const idempotency=await stableIdempotency(`${externalReference}|card|${token}`);
  const body={
    transaction_amount:Math.round(amount*100)/100, token, description, installments,
    payment_method_id:paymentMethodId, external_reference:externalReference,
    notification_url:"https://app.indoporaicomagente.com/api/webhooks/mercadopago",
    payer:{email,identification:{type:identificationType,number:identificationNumber}}
  };
  if(issuerId) body.issuer_id=issuerId;
  const result=await mercadoPagoFetch(env,"/v1/payments",{method:"POST",headers:{"X-Idempotency-Key":idempotency},body:JSON.stringify(body)});
  if(!result.ok)return result.response;
  return json({ok:true,environment:"production",amount,...extractCardPayment(result.body)});
}

async function getPixStatus(url, env) {
  const paymentId=url.searchParams.get("paymentId");
  if(!paymentId)return json({ok:false,error:"paymentId obrigatório."},400);
  const result=await mercadoPagoFetch(env,`/v1/payments/${encodeURIComponent(paymentId)}`,{method:"GET"});
  if(!result.ok)return result.response;
  return json({ok:true,environment:"production",...extractPixPayment(result.body)});
}

async function verifyMpWebhook(request,url,env){
  const secret=String(env.MERCADO_PAGO_WEBHOOK_SECRET||"").trim();
  if(!secret)return {ok:true,setup:true};
  const signature=request.headers.get("x-signature")||"";
  const requestId=request.headers.get("x-request-id")||"";
  const parts=Object.fromEntries(signature.split(",").map(x=>x.trim().split("=")));
  const ts=parts.ts||"",v1=parts.v1||"";
  const dataId=String(url.searchParams.get("data.id")||url.searchParams.get("data_id")||"").toLowerCase();
  if(!ts||!v1||!requestId||!dataId)return {ok:false};
  const template=`id:${dataId};request-id:${requestId};ts:${ts};`;
  const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
  const signed=new Uint8Array(await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(template)));
  const hex=[...signed].map(b=>b.toString(16).padStart(2,"0")).join("");
  return {ok:hex===v1};
}

async function mercadoPagoWebhook(request,url,env){
  const verified=await verifyMpWebhook(request,url,env);
  if(!verified.ok)return json({ok:false,error:"Assinatura inválida."},401);
  let body={}; try{body=await request.json()}catch{}
  const type=String(url.searchParams.get("type")||body?.type||"");
  const dataId=String(url.searchParams.get("data.id")||body?.data?.id||"");
  // A fonte de verdade continua sendo a API do Mercado Pago; o app consulta o ID recebido.
  if(type==="payment"&&dataId){
    const result=await mercadoPagoFetch(env,`/v1/payments/${encodeURIComponent(dataId)}`,{method:"GET"});
    if(result.ok){
      const p=extractPixPayment(result.body);
      return json({ok:true,received:true,status:p.paymentStatus,externalReference:p.externalReference,setup:!!verified.setup});
    }
  }
  return json({ok:true,received:true,setup:!!verified.setup});
}


async function dailyFetch(env,path,init={}){
  const key=env.DAILY_API_KEY;
  if(!key)return {ok:false,response:json({ok:false,error:"DAILY_API_KEY não configurada no Cloudflare."},500)};
  const r=await fetch(`https://api.daily.co/v1${path}`,{...init,headers:{"authorization":`Bearer ${key}`,"content-type":"application/json",...(init.headers||{})}});
  let body={};try{body=await r.json()}catch{}
  if(!r.ok)return {ok:false,response:json({ok:false,error:body?.info||body?.error||"Erro Daily",details:body},r.status)};
  return {ok:true,body};
}
async function createLiveRoom(env){
 const now=Math.floor(Date.now()/1000),exp=now+7200,name=`indo-por-ai-${Date.now()}`;
 const rr=await dailyFetch(env,"/rooms",{method:"POST",body:JSON.stringify({name,privacy:"private",properties:{exp,enable_chat:true,enable_prejoin_ui:true}})});
 if(!rr.ok)return rr.response;
 const tr=await dailyFetch(env,"/meeting-tokens",{method:"POST",body:JSON.stringify({properties:{room_name:name,is_owner:true,user_name:"Indo por Aí",exp}})});
 if(!tr.ok)return tr.response;
 return json({ok:true,roomName:name,hostJoinUrl:`${rr.body.url}?t=${encodeURIComponent(tr.body.token)}`});
}
async function joinLiveRoom(request,env){
 let b={};try{b=await request.json()}catch{return json({ok:false,error:"JSON inválido"},400)}
 const name=String(b.roomName||"").trim(),viewer=String(b.viewerName||"Viajante").slice(0,50);
 if(!name)return json({ok:false,error:"Código da transmissão obrigatório."},400);
 const rr=await dailyFetch(env,`/rooms/${encodeURIComponent(name)}`,{method:"GET"});if(!rr.ok)return rr.response;
 const exp=Math.min(rr.body?.config?.exp||Math.floor(Date.now()/1000)+3600,Math.floor(Date.now()/1000)+3600);
 const tr=await dailyFetch(env,"/meeting-tokens",{method:"POST",body:JSON.stringify({properties:{room_name:name,is_owner:false,user_name:viewer,exp,start_video_off:true,start_audio_off:true}})});
 if(!tr.ok)return tr.response;
 return json({ok:true,viewerJoinUrl:`${rr.body.url}?t=${encodeURIComponent(tr.body.token)}`});
}


async function googlePlaceSearch(request,env){
  const key=env.GOOGLE_MAPS_API_KEY;
  const u=new URL(request.url), q=(u.searchParams.get("q")||"").trim(), destination=(u.searchParams.get("destination")||"").trim();
  if(q.length<2)return json({ok:true,places:[]});
  if(!key)return json({ok:false,needsKey:true,error:"GOOGLE_MAPS_API_KEY não configurada",places:[]},200);
  const text=[q,destination].filter(Boolean).join(", ");
  const r=await fetch("https://places.googleapis.com/v1/places:searchText",{
    method:"POST",
    headers:{"Content-Type":"application/json","X-Goog-Api-Key":key,"X-Goog-FieldMask":"places.id,places.displayName,places.formattedAddress,places.googleMapsUri,places.primaryType,places.rating,places.userRatingCount,places.addressComponents,places.location"},
    body:JSON.stringify({textQuery:text,languageCode:"pt-BR",maxResultCount:6})
  });
  const body=await r.json().catch(()=>({}));
  if(!r.ok)return json({ok:false,error:body?.error?.message||"Erro Google Places",places:[]},r.status);
  return json({ok:true,places:(body.places||[]).map(p=>{
    const comps=p.addressComponents||[];
    const pick=(...types)=>{const c=comps.find(x=>(x.types||[]).some(t=>types.includes(t)));return c?.longText||c?.shortText||""};
    return {
      id:p.id||"",name:p.displayName?.text||"",address:p.formattedAddress||"",mapsUrl:p.googleMapsUri||"",
      category:p.primaryType||"",rating:p.rating||null,reviews:p.userRatingCount||0,
      city:pick("locality","postal_town","administrative_area_level_2","administrative_area_level_1"),
      country:pick("country"),lat:p.location?.latitude??null,lng:p.location?.longitude??null
    };
  })});
}


async function computeRoadRoute(request,env){
 const key=env.GOOGLE_MAPS_API_KEY;if(!key)return json({ok:false,error:"GOOGLE_MAPS_API_KEY não configurada"},500);
 let b={};try{b=await request.json()}catch{return json({ok:false,error:"JSON inválido"},400)}
 const points=Array.isArray(b.points)?b.points.filter(p=>Number.isFinite(Number(p.lat))&&Number.isFinite(Number(p.lng))).slice(0,25):[];
 if(points.length<2)return json({ok:false,error:"A rota precisa de pelo menos 2 pontos"},400);
 const waypoint=p=>({location:{latLng:{latitude:Number(p.lat),longitude:Number(p.lng)}}});
 const payload={origin:waypoint(points[0]),destination:waypoint(points[points.length-1]),intermediates:points.slice(1,-1).map(waypoint),travelMode:"DRIVE",routingPreference:"TRAFFIC_AWARE",languageCode:"pt-BR",units:"METRIC"};
 const r=await fetch("https://routes.googleapis.com/directions/v2:computeRoutes",{method:"POST",headers:{"Content-Type":"application/json","X-Goog-Api-Key":key,"X-Goog-FieldMask":"routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline"},body:JSON.stringify(payload)});
 const body=await r.json().catch(()=>({}));if(!r.ok)return json({ok:false,error:body?.error?.message||"Erro Routes API"},r.status);
 const route=body.routes?.[0];if(!route)return json({ok:false,error:"Nenhuma rota encontrada"},404);
 return json({ok:true,distanceMeters:route.distanceMeters||0,duration:route.duration||"",encodedPolyline:route.polyline?.encodedPolyline||""});
}


function whatsappContact(request,env){
  const raw=String(env.WHATSAPP_NUMBER||"").replace(/\D/g,"");
  if(!raw)return json({ok:false,error:"WHATSAPP_NUMBER não configurado no Cloudflare."},500);
  const u=new URL(request.url);
  const custom=(u.searchParams.get("text")||"").slice(0,4000);
  const message=encodeURIComponent(custom||"Olá! Vim pelo app Indo por Aí e quero planejar minha próxima viagem.");
  return json({ok:true,url:`https://wa.me/${raw}?text=${message}`});
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/maps/browser-key" && request.method === "GET") {
      if(!env.GOOGLE_MAPS_BROWSER_KEY)return json({ok:false,error:"GOOGLE_MAPS_BROWSER_KEY não configurada."},500);
      return json({ok:true,key:env.GOOGLE_MAPS_BROWSER_KEY});
    }
    if (url.pathname === "/api/contact/whatsapp" && request.method === "GET") return whatsappContact(request,env);
    if (url.pathname === "/api/places/search" && request.method === "GET") return googlePlaceSearch(request,env);
    if (url.pathname === "/api/routes/compute" && request.method === "POST") return computeRoadRoute(request,env);
    if (url.pathname === "/api/climate/generate" && request.method === "POST") return generateClimate(request,env);
    if (url.pathname === "/api/live/create" && request.method === "POST") return createLiveRoom(env);
    if (url.pathname === "/api/live/join" && request.method === "POST") return joinLiveRoom(request,env);


    if (url.pathname === "/api/payments/public-key" && request.method === "GET") {
      if(!env.MERCADO_PAGO_PUBLIC_KEY)return json({ok:false,error:"MERCADO_PAGO_PUBLIC_KEY não configurada no Cloudflare."},500);
      return json({ok:true,publicKey:env.MERCADO_PAGO_PUBLIC_KEY});
    }

    if (url.pathname === "/api/payments/card" && request.method === "POST") {
      return createProductionCard(request, env);
    }

    if ((url.pathname === "/api/payments/pix" || url.pathname === "/api/pix/create") && request.method === "POST") {
      return createProductionPix(request, env);
    }

    if ((url.pathname === "/api/payments/pix/status" || url.pathname === "/api/pix/status") && request.method === "GET") {
      return getPixStatus(url, env);
    }

    if (url.pathname === "/api/webhooks/mercadopago" && request.method === "POST") {
      return mercadoPagoWebhook(request, url, env);
    }

    // Mantém todo o aplicativo estático funcionando normalmente.
    return env.ASSETS.fetch(request);
  }
};
