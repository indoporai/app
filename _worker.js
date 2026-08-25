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
    headers:{"Content-Type":"application/json","X-Goog-Api-Key":key,"X-Goog-FieldMask":"places.id,places.displayName,places.formattedAddress,places.googleMapsUri,places.primaryType,places.rating,places.userRatingCount"},
    body:JSON.stringify({textQuery:text,languageCode:"pt-BR",maxResultCount:6})
  });
  const body=await r.json().catch(()=>({}));
  if(!r.ok)return json({ok:false,error:body?.error?.message||"Erro Google Places",places:[]},r.status);
  return json({ok:true,places:(body.places||[]).map(p=>({
    id:p.id||"",name:p.displayName?.text||"",address:p.formattedAddress||"",mapsUrl:p.googleMapsUri||"",
    category:p.primaryType||"",rating:p.rating||null,reviews:p.userRatingCount||0
  }))});
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/places/search" && request.method === "GET") return googlePlaceSearch(request,env);
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
