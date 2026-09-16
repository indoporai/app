const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });

function extractPix(order) {
  const payment = order?.transactions?.payments?.[0] || {};
  const method = payment?.payment_method || {};
  return {
    orderId: order?.id || "",
    orderStatus: order?.status || "",
    orderStatusDetail: order?.status_detail || "",
    paymentId: payment?.id || "",
    paymentStatus: payment?.status || "",
    paymentStatusDetail: payment?.status_detail || "",
    ticketUrl: method?.ticket_url || "",
    qrCode: method?.qr_code || "",
    qrCodeBase64: method?.qr_code_base64 || method?.qr_code_based64 || ""
  };
}

async function mercadoPagoFetch(env, path, init = {}) {
  const token = env.MERCADO_PAGO_ACCESS_TOKEN;
  if (!token) {
    return {
      ok: false,
      response: json({
        ok: false,
        error: "MERCADO_PAGO_ACCESS_TOKEN não configurado no Cloudflare."
      }, 500)
    };
  }

  const response = await fetch(`https://api.mercadopago.com${path}`, {
    ...init,
    headers: {
      "accept": "application/json",
      "content-type": "application/json",
      "authorization": `Bearer ${token}`,
      ...(init.headers || {})
    }
  });

  let body;
  try { body = await response.json(); }
  catch { body = { message: await response.text() }; }

  if (!response.ok) {
    return {
      ok: false,
      response: json({
        ok: false,
        status: response.status,
        error: body?.message || body?.error || "Erro Mercado Pago",
        details: body
      }, response.status)
    };
  }

  return { ok: true, body };
}

async function createTestPix(request, env) {
  let payload = {};
  try { payload = await request.json(); }
  catch { return json({ ok:false, error:"JSON inválido." }, 400); }

  const reference = String(payload.paymentId || "").trim();
  if (!reference) return json({ ok:false, error:"paymentId obrigatório." }, 400);

  // Mercado Pago exige valores/dados predefinidos no teste de Pix via Orders.
  const amount = "50.00";
  const idempotency = crypto.randomUUID();

  const orderPayload = {
    type: "online",
    external_reference: `indoporai_${reference}_${Date.now()}`,
    total_amount: amount,
    processing_mode: "automatic",
    payer: {
      email: "test_user_br@testuser.com",
      first_name: "APRO"
    },
    transactions: {
      payments: [{
        amount,
        payment_method: {
          id: "pix",
          type: "bank_transfer"
        }
      }]
    }
  };

  const result = await mercadoPagoFetch(env, "/v1/orders", {
    method: "POST",
    headers: { "X-Idempotency-Key": idempotency },
    body: JSON.stringify(orderPayload)
  });

  if (!result.ok) return result.response;

  return json({
    ok: true,
    environment: "test",
    testAmount: 50,
    ...extractPix(result.body)
  });
}

async function getPixStatus(url, env) {
  const orderId = url.searchParams.get("orderId");
  if (!orderId) return json({ ok:false, error:"orderId obrigatório." }, 400);

  const result = await mercadoPagoFetch(
    env,
    `/v1/orders/${encodeURIComponent(orderId)}`,
    { method: "GET" }
  );
  if (!result.ok) return result.response;

  return json({
    ok: true,
    environment: "test",
    ...extractPix(result.body)
  });
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


async function generateClimate(request,env){
 const key=env.OPENAI_API_KEY;
 if(!key)return json({ok:false,needsKey:true,error:"OPENAI_API_KEY não configurada no Cloudflare. Adicione o segredo para ativar o Entre no Clima com IA."},500);
 let b={};try{b=await request.json()}catch{return json({ok:false,error:"JSON inválido"},400)}
 const destination=String(b.destination||"").trim(),country=String(b.country||"").trim();
 if(!destination)return json({ok:false,error:"Destino obrigatório"},400);
 const prompt=`Você é o curador cultural do app de viagens Indo por Aí. Crie o módulo \"Entre no Clima\" para ${destination}${country?`, ${country}`:""}. Pesquise na web quando necessário para evitar invenções. Retorne SOMENTE JSON válido, sem markdown, no formato {\"items\":[...]}. Exatamente 6 itens, nesta ordem e tipos: Filme / série, Playlist, Livro, Expressão local, Prato típico, Curiosidade. Cada item: icon (emoji adequado), type, title, description (1-2 frases em português do Brasil), url (somente se você encontrar um link público confiável e diretamente relacionado; caso contrário string vazia). Para Expressão local, title deve trazer uma expressão realmente usada no idioma/local e description explicar significado/uso. Para prato típico, escolha algo realmente associado ao destino. Não invente títulos, obras, links ou fatos.`;
 const r=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{"content-type":"application/json","authorization":`Bearer ${key}`},body:JSON.stringify({model:"gpt-5.6-luna",tools:[{type:"web_search"}],input:prompt})});
 const body=await r.json().catch(()=>({}));
 if(!r.ok)return json({ok:false,error:body?.error?.message||"Erro ao gerar conteúdo com IA"},r.status);
 let text=body.output_text||"";
 if(!text&&Array.isArray(body.output))for(const o of body.output||[])for(const c of o.content||[])if(c.type==="output_text")text+=c.text||"";
 text=String(text).trim().replace(/^```(?:json)?\s*/i,"").replace(/\s*```$/i,"");
 let parsed;try{parsed=JSON.parse(text)}catch{return json({ok:false,error:"A IA respondeu em formato inesperado. Tente gerar novamente."},502)}
 const items=Array.isArray(parsed?.items)?parsed.items.slice(0,6):[];
 if(items.length!==6)return json({ok:false,error:"Conteúdo incompleto. Tente gerar novamente."},502);
 return json({ok:true,source:"openai-web",items:items.map(x=>({icon:String(x.icon||"✨").slice(0,8),type:String(x.type||"").slice(0,40),title:String(x.title||"").slice(0,160),description:String(x.description||"").slice(0,500),url:/^https?:\/\//i.test(String(x.url||""))?String(x.url):""}))});
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

    if (url.pathname === "/api/pix/create" && request.method === "POST") {
      return createTestPix(request, env);
    }

    if (url.pathname === "/api/pix/status" && request.method === "GET") {
      return getPixStatus(url, env);
    }

    // Mantém todo o aplicativo estático funcionando normalmente.
    return env.ASSETS.fetch(request);
  }
};
