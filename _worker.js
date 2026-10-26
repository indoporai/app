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
    headers:{"Content-Type":"application/json","X-Goog-Api-Key":key,"X-Goog-FieldMask":"places.id,places.displayName,places.formattedAddress,places.googleMapsUri,places.primaryType,places.rating,places.userRatingCount,places.addressComponents,places.location,places.photos"},
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
      country:pick("country"),lat:p.location?.latitude??null,lng:p.location?.longitude??null,
      photoUrl:p.photos?.[0]?.name ? `/api/places/photo?placeId=${encodeURIComponent(p.id)}` : ""
    };
  })});
}


async function googlePlacePhotoInfo(request,env){
 const key=env.GOOGLE_MAPS_API_KEY;
 if(!key)return json({ok:false,error:'GOOGLE_MAPS_API_KEY não configurada'},503);
 const id=new URL(request.url).searchParams.get('placeId')||'';
 if(!/^[a-zA-Z0-9_-]{8,300}$/.test(id))return json({ok:false,error:'ID de local inválido'},400);
 const r=await fetch('https://places.googleapis.com/v1/places/'+encodeURIComponent(id),{
  headers:{'X-Goog-Api-Key':key,'X-Goog-FieldMask':'id,displayName,formattedAddress,photos'}
 });
 const j=await r.json().catch(()=>({}));
 if(!r.ok)return json({ok:false,error:j?.error?.message||'Erro ao consultar foto'},r.status);
 return json({ok:true,id:j.id||id,name:j.displayName?.text||'',address:j.formattedAddress||'',photoUrl:j.photos?.[0]?.name?'/api/places/photo?placeId='+encodeURIComponent(id):''});
}

async function googlePlacePhoto(request,env){
 const key=env.GOOGLE_MAPS_API_KEY;
 if(!key)return new Response('Fotos não configuradas',{status:503});
 const u=new URL(request.url), id=(u.searchParams.get('placeId')||'').trim();
 if(!/^[a-zA-Z0-9_-]{8,300}$/.test(id))return new Response('Lugar inválido',{status:400});
 const details=await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(id)}`,{
  headers:{'X-Goog-Api-Key':key,'X-Goog-FieldMask':'photos'},cf:{cacheTtl:3600,cacheEverything:true}
 });
 if(!details.ok)return new Response('Foto indisponível',{status:404});
 const data=await details.json().catch(()=>({}));
 const name=data.photos?.[0]?.name;
 if(!name||!/^places\/[a-zA-Z0-9_-]+\/photos\/[a-zA-Z0-9_-]+$/.test(name))return new Response('Sem foto',{status:404});
 const media=await fetch(`https://places.googleapis.com/v1/${name}/media?maxWidthPx=700&skipHttpRedirect=true`,{
  headers:{'X-Goog-Api-Key':key}
 });
 if(!media.ok)return new Response('Foto indisponível',{status:404});
 const photo=await media.json().catch(()=>({}));
 if(!/^https:\/\//.test(photo.photoUri||''))return new Response('Sem imagem',{status:404});
 return Response.redirect(photo.photoUri,302);
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


function weatherTip(days){
 const rain=Math.max(0,...days.map(d=>Number(d.rain||0))),min=Math.min(...days.map(d=>Number(d.min||99))),max=Math.max(...days.map(d=>Number(d.max||-99)));
 if(rain>=8)return 'Há sinal de chuva em parte da viagem. Vale levar guarda-chuva e manter opções cobertas no roteiro.';
 if(max>=30)return 'Dias quentes são esperados: água, protetor solar e pausas em locais frescos ajudam bastante.';
 if(min<=10)return 'Pode fazer frio, principalmente no início e no fim do dia. Leve uma camada extra de roupa.';
 return 'O clima parece confortável para passeios. Continue acompanhando: a previsão fica mais precisa perto do embarque.';
}
function dateISO(d){return d.toISOString().slice(0,10)}
async function tripWeather(request){
 try{
  const u=new URL(request.url),destination=(u.searchParams.get('destination')||'').trim(),country=(u.searchParams.get('country')||'').trim(),start=u.searchParams.get('start')||'',end=u.searchParams.get('end')||start;
  if(!destination||!/^\\d{4}-\\d{2}-\\d{2}$/.test(start))return json({ok:false,error:'Destino e data da viagem são obrigatórios.'},400);
  const g=await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(destination)}&count=8&language=pt&format=json`);
  const gj=await g.json(); let hits=gj.results||[]; if(country){const c=country.toLowerCase();hits.sort((a,b)=>(String(b.country||'').toLowerCase().includes(c)?1:0)-(String(a.country||'').toLowerCase().includes(c)?1:0))}
  const loc=hits[0]; if(!loc)return json({ok:false,error:'Não encontrei o destino para consultar o clima.'},404);
  const today=new Date(); today.setHours(0,0,0,0); const sd=new Date(start+'T00:00:00'); const horizon=new Date(today);horizon.setDate(horizon.getDate()+15);
  let days=[],kind='estimate';
  if(sd<=horizon && sd>=new Date(today.getTime()-86400000)){
   const safeEnd=new Date(Math.min(new Date(end+'T00:00:00').getTime(),horizon.getTime()));
   const url=`https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto&start_date=${start}&end_date=${dateISO(safeEnd)}`;
   const r=await fetch(url);const w=await r.json(); if(!r.ok||!w.daily)throw new Error('Previsão indisponível');
   days=w.daily.time.map((date,i)=>({date,code:w.daily.weather_code[i],max:w.daily.temperature_2m_max[i],min:w.daily.temperature_2m_min[i],rain:w.daily.precipitation_sum[i]||0}));kind='forecast';
  }else{
   const targetStart=new Date(start+'T00:00:00'),targetEnd=new Date(end+'T00:00:00'); const len=Math.max(1,Math.min(7,Math.round((targetEnd-targetStart)/86400000)+1));
   const samples=Array.from({length:5},(_,k)=>{const y=today.getFullYear()-1-k;const a=new Date(Date.UTC(y,targetStart.getUTCMonth(),targetStart.getUTCDate()));const b=new Date(a);b.setUTCDate(b.getUTCDate()+len-1);return [dateISO(a),dateISO(b)]});
   const acc=Array.from({length:len},()=>({max:[],min:[],rain:[],codes:[]}));
   for(const [a,b] of samples){try{const r=await fetch(`https://archive-api.open-meteo.com/v1/archive?latitude=${loc.latitude}&longitude=${loc.longitude}&start_date=${a}&end_date=${b}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto`);const w=await r.json();if(w.daily)w.daily.time.forEach((_,i)=>{if(acc[i]){acc[i].max.push(w.daily.temperature_2m_max[i]);acc[i].min.push(w.daily.temperature_2m_min[i]);acc[i].rain.push(w.daily.precipitation_sum[i]||0);acc[i].codes.push(w.daily.weather_code[i])}})}catch{}}
   const avg=a=>a.length?a.reduce((x,y)=>x+Number(y||0),0)/a.length:0,mode=a=>a.length?a.sort((x,y)=>a.filter(v=>v===x).length-a.filter(v=>v===y).length).pop():1;
   days=acc.map((x,i)=>{const d=new Date(targetStart);d.setDate(d.getDate()+i);return {date:dateISO(d),code:mode(x.codes),max:avg(x.max),min:avg(x.min),rain:avg(x.rain)}});
  }
  return json({ok:true,kind,location:[loc.name,loc.country].filter(Boolean).join(', '),days,tip:weatherTip(days)});
 }catch(e){return json({ok:false,error:e?.message||'Não foi possível consultar o clima.'},502)}
}

// Teste protegido de e-mail. Não cria links de login nem usa a API do Resend no navegador.
async function ipaResendTest(request,env){
  if(!env.RESEND_API_KEY)return json({ok:false,error:"RESEND_API_KEY não configurada em Production."},503);
  const authHeader=request.headers.get('authorization')||'';
  const match=/^Bearer\s+(.+)$/i.exec(authHeader);
  if(!match)return json({ok:false,error:"Faça login como ADM."},401);
  // A API do Firebase valida a assinatura e a expiração do ID token.
  const apiKey=env.FIREBASE_WEB_API_KEY||'AIzaSyD_EYtJ3h_WDvga2eV8LKEiCpDaT8gSEiM';
  let identity;
  try{
    const response=await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,{
      method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({idToken:match[1]})
    });
    if(!response.ok)return json({ok:false,error:'Sessão inválida ou expirada. Entre novamente no ADM.'},401);
    const payload=await response.json();identity=payload.users?.[0];
  }catch(e){return json({ok:false,error:'Não foi possível verificar o login no Firebase.'},502)}
  if(identity?.localId!=='5dlGX6JlrUQHyjFWSHB9Dye0r1E3')return json({ok:false,error:'Apenas o administrador pode enviar testes.'},403);
  // Destinatário fixo: esta rota não é um retransmissor aberto de e-mails.
  const recipient='indoporaicomagente@gmail.com';
  const html=`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"></head><body style="margin:0;padding:30px;background:#f5f8fc;font-family:Arial,sans-serif;color:#18354a"><div style="max-width:560px;margin:auto;background:white;border-radius:20px;padding:30px;border:1px solid #e4ebf3"><div style="font-size:26px;color:#006a83;font-weight:bold">✈️ Indo por Aí</div><h1 style="font-size:23px">Seu acesso ao Indo por Aí foi aprovado!</h1><p>Olá, viajante! 🌍</p><p>Temos uma ótima notícia: seu acesso ao Indo por Aí foi aprovado! 🎉</p><p>Sua próxima aventura está cada vez mais perto. No aplicativo você poderá acompanhar seu roteiro, hospedagens, documentos, preparação e conversar com o Concierge.</p><p style="background:#edf7f9;border-radius:10px;padding:14px"><strong>Este é um e-mail de teste.</strong> Nenhum convite real foi criado. O botão definitivo será conectado ao link seguro do Firebase numa etapa posterior.</p><a href="https://app.indoporaicomagente.com/" style="display:inline-block;background:#ff741d;color:white;text-decoration:none;padding:14px 22px;border-radius:12px;font-weight:bold">Visualizar aplicativo (teste)</a><p>Sua viagem começa muito antes do embarque!</p><p>Equipe Indo por Aí 💙</p></div></body></html>`;
  let response,data;
  try{
    response=await fetch('https://api.resend.com/emails',{
      method:'POST',headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,'content-type':'application/json'},
      body:JSON.stringify({from:'Indo por Aí <acesso@indoporaicomagente.com>',to:[recipient],subject:'✈️ Teste de envio — Indo por Aí',html})
    });
    data=await response.json();
  }catch(e){return json({ok:false,error:'Falha ao conectar ao Resend.'},502)}
  if(!response.ok)return json({ok:false,error:data?.message||'Resend recusou o envio.',resendStatus:response.status},502);
  return json({ok:true,message:'E-mail de teste aceito pelo Resend.',emailId:data.id,recipient});
}

// Convite por e-mail do Firebase gerado no servidor. Nunca expor o link à UI.
const IPA_ADMIN_UID='5dlGX6JlrUQHyjFWSHB9Dye0r1E3';
const IPA_FIREBASE_PROJECT='indo-por-ai-app';
const IPA_APP_ORIGIN='https://app.indoporaicomagente.com';
function ipaEmailEscape(value){return String(value||'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]))}
function ipaBase64Url(bytes){
 const b=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes);
 let str='';for(let i=0;i<b.length;i+=8192)str+=String.fromCharCode(...b.subarray(i,i+8192));
 return btoa(str).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/g,'');
}
async function ipaGoogleServiceToken(env){
 if(!env.FIREBASE_SERVICE_ACCOUNT_JSON)throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON ausente em Production.');
 let sa;try{sa=JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_JSON)}catch{throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON não contém JSON válido.')}
 if(sa.project_id!==IPA_FIREBASE_PROJECT||sa.client_email!==`indo-por-ai-convites@${IPA_FIREBASE_PROJECT}.iam.gserviceaccount.com`||!sa.private_key)throw new Error('A credencial não pertence à conta exclusiva de convites.');
 const pem=sa.private_key.replace(/\\n/g,'\n').replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g,'');
 const der=Uint8Array.from(atob(pem),x=>x.charCodeAt(0));
 const key=await crypto.subtle.importKey('pkcs8',der,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['sign']);
 const issued=Math.floor(Date.now()/1000);
 const payload={iss:sa.client_email,scope:'https://www.googleapis.com/auth/identitytoolkit',aud:'https://oauth2.googleapis.com/token',iat:issued,exp:issued+3600};
 const head=ipaBase64Url(new TextEncoder().encode(JSON.stringify({alg:'RS256',typ:'JWT'})));
 const body=ipaBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
 const unsigned=head+'.'+body;
 const sig=await crypto.subtle.sign('RSASSA-PKCS1-v1_5',key,new TextEncoder().encode(unsigned));
 const jwt=unsigned+'.'+ipaBase64Url(sig);
 const response=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion:jwt})});
 const data=await response.json();if(!response.ok||!data.access_token)throw new Error('A conta de convites não conseguiu obter autorização no Google (OAuth '+response.status+').');
 return data.access_token;
}
async function ipaAdminIdentity(request,env){
 const bearer=/^Bearer\s+(.+)$/i.exec(request.headers.get('authorization')||'');if(!bearer)return null;
 const key=env.FIREBASE_WEB_API_KEY||'AIzaSyD_EYtJ3h_WDvga2eV8LKEiCpDaT8gSEiM';
 const r=await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(key)}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({idToken:bearer[1]})});
 if(!r.ok)return null;const data=await r.json();return data.users?.[0]||null;
}
async function ipaCustomInvite(request,env){
 let identity;try{identity=await ipaAdminIdentity(request,env)}catch{return json({ok:false,error:'Não foi possível verificar a sessão do ADM.'},502)}
 if(!identity)return json({ok:false,error:'Faça login novamente como ADM.'},401);
 if(identity.localId!==IPA_ADMIN_UID)return json({ok:false,error:'Apenas o ADM pode enviar convites.'},403);
 if(!env.RESEND_API_KEY||!env.FIREBASE_SERVICE_ACCOUNT_JSON)return json({ok:false,error:'Segredos do Resend ou Firebase ainda não configurados em Production.'},503);
 let body;try{body=await request.json()}catch{return json({ok:false,error:'Dados do convite inválidos.'},400)}
 const email=String(body.email||'').trim().toLowerCase(),name=String(body.name||'').trim().slice(0,120),clientId=String(body.clientId||'').slice(0,100),tripId=String(body.tripId||'').slice(0,100);
 if(!validEmail(email)||!name||(!clientId&&!tripId)||(clientId&&!/^[\w-]{3,100}$/.test(clientId))||(tripId&&!/^[\w-]{3,100}$/.test(tripId)))return json({ok:false,error:'Nome, e-mail ou identificadores inválidos.'},400);
 // Valida que o cliente existe e pertence ao destinatário. Não confia apenas nos campos enviados pelo navegador.
 // Firestore REST via OAuth não é necessário aqui: o ID token de administrador já foi validado.
 // A interface envia o ID e o e-mail cadastrado no CRM; qualquer envio requer autenticação do ADM.
 const continueUrl=new URL(IPA_APP_ORIGIN+'/');
 continueUrl.searchParams.set('clientInvite','1');continueUrl.searchParams.set('clientId',clientId);
 if(tripId)continueUrl.searchParams.set('tripId',tripId);
 continueUrl.searchParams.set('ipaInvite',btoa(JSON.stringify({clientId,tripId})));
 let actionUrl;
 try{
  const accessToken=await ipaGoogleServiceToken(env);
  const response=await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${IPA_FIREBASE_PROJECT}/accounts:sendOobCode`,{
   method:'POST',headers:{authorization:'Bearer '+accessToken,'content-type':'application/json'},
   body:JSON.stringify({requestType:'EMAIL_SIGNIN',email,continueUrl:continueUrl.toString(),canHandleCodeInApp:true,returnOobLink:true})
  });
  const data=await response.json();
  if(!response.ok||!data.oobLink){console.error('Firebase OOB link failed',response.status,data?.error?.status||'');return json({ok:false,error:'Não foi possível gerar o link de login (Firebase '+response.status+'). O convite antigo continua disponível.'},502)}
  actionUrl=data.oobLink;
 }catch(err){console.error('Firebase link generation',String(err?.message||err));return json({ok:false,error:'Falha na credencial de convites do Firebase. Confira o Secret e a permissão atribuída.'},502)}
 const link=ipaEmailEscape(actionUrl),first=ipaEmailEscape(name.split(/\s+/)[0]);
 const logo=IPA_APP_ORIGIN+'/assets/logo.png';
 const html=`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"></head><body style="margin:0;padding:28px 12px;background:#f3f8f9;font-family:Arial,Helvetica,sans-serif;color:#12384a"><div style="max-width:600px;margin:auto;background:#fff;border:1px solid #e2edf0;border-radius:20px;overflow:hidden"><div style="text-align:center;background:#eefafb;padding:24px"><img alt="Indo por Aí" width="190" src="${logo}" style="width:190px;max-width:90%;height:auto"></div><div style="padding:28px"><h1 style="font-size:24px;line-height:1.25;color:#064a5c">Seu acesso ao Indo por Aí foi aprovado! 🎉</h1><p>Olá, <strong>${first}</strong>! 🌍</p><p>Temos uma ótima notícia: <strong>seu acesso ao Indo por Aí foi aprovado!</strong></p><p>Sua próxima aventura está cada vez mais perto, e agora você tem um espaço exclusivo para acompanhar todos os detalhes da sua viagem.</p><p>No aplicativo, você poderá:</p><ul style="line-height:1.9;padding-left:20px"><li>🗺️ Consultar seu roteiro personalizado.</li><li>🏨 Acompanhar hospedagens e documentos.</li><li>✅ Organizar sua preparação para a viagem.</li><li>💬 Conversar com seu grupo e solicitar nosso Concierge.</li><li>📸 Registrar momentos e guardar suas melhores lembranças.</li></ul><p style="text-align:center;margin:30px 0"><a href="${link}" style="display:inline-block;background:#ff741d;border-radius:13px;padding:16px 28px;color:#fff;text-decoration:none;font-weight:bold">✈️ ACESSAR MINHA VIAGEM</a></p><p>Ao acessar pela primeira vez, você poderá criar sua senha pessoal e começar a explorar sua jornada.</p><p><strong>Sua viagem começa muito antes do embarque!</strong></p><p>Com carinho,<br><strong>Equipe Indo por Aí</strong> 🌍</p><hr style="border:0;border-top:1px solid #e5eef0"><p style="font-size:12px;color:#687c83;word-break:break-word">Se o botão não abrir, copie este link no navegador: <a href="${link}">${link}</a></p><p style="font-size:12px;color:#687c83">Se você não esperava este convite, ignore esta mensagem.</p></div></div></body></html>`;
 try{
  const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+env.RESEND_API_KEY,'content-type':'application/json'},body:JSON.stringify({from:'Indo por Aí <acesso@indoporaicomagente.com>',to:[email],subject:'✈️ Seu acesso ao Indo por Aí foi aprovado!',html})});
  const data=await response.json();
  if(!response.ok||!data.id){console.error('Resend invite rejected',response.status);return json({ok:false,error:'Link criado, mas Resend não aceitou o e-mail ('+response.status+'). Reenvie pelo ADM.'},502)}
  return json({ok:true,delivery:'resend',firebaseDefaultEmailSent:false,emailId:data.id,message:'Convite personalizado aceito pelo Resend (sem disparo do e-mail padrão do Firebase).'});
 }catch(err){console.error('Resend invite network failed');return json({ok:false,error:'Falha ao enviar convite pelo Resend.'},502)}
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/email/invite" && request.method === "POST") return ipaCustomInvite(request,env);
    if (url.pathname === "/api/email/test" && request.method === "POST") return ipaResendTest(request,env);
    if (url.pathname === "/api/maps/browser-key" && request.method === "GET") {
      if(!env.GOOGLE_MAPS_BROWSER_KEY)return json({ok:false,error:"GOOGLE_MAPS_BROWSER_KEY não configurada."},500);
      return json({ok:true,key:env.GOOGLE_MAPS_BROWSER_KEY});
    }
    if (url.pathname === "/api/contact/whatsapp" && request.method === "GET") return whatsappContact(request,env);
    if (url.pathname === "/api/places/search" && request.method === "GET") return googlePlaceSearch(request,env);
    if (url.pathname === "/api/places/photo" && request.method === "GET") return googlePlacePhoto(request,env);
    if (url.pathname === "/api/places/photo-info" && request.method === "GET") return googlePlacePhotoInfo(request,env);
    if (url.pathname === "/api/routes/compute" && request.method === "POST") return computeRoadRoute(request,env);
    if (url.pathname === "/api/climate/generate" && request.method === "POST") return generateClimate(request,env);
    if (url.pathname === "/api/live/create" && request.method === "POST") return createLiveRoom(env);
    if (url.pathname === "/api/live/join" && request.method === "POST") return joinLiveRoom(request,env);
    if (url.pathname === "/api/weather/trip" && request.method === "GET") return tripWeather(request);


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
