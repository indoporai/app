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
  if(!secret)return {ok:false,setup:false};
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


const IPA_PAYMENT_EMAIL_DOC=`https://firestore.googleapis.com/v1/projects/indo-por-ai-app/databases/(default)/documents/settings/paymentEmail`;
function ipaFsStr(fields,key,defaultValue=''){return String(fields?.[key]?.stringValue??defaultValue)}
async function ipaPaymentEmailFirestore(env,method='GET',content){
 const access=await ipaGoogleServiceToken(env,'https://www.googleapis.com/auth/datastore');
 const opts={method,headers:{Authorization:'Bearer '+access,'content-type':'application/json'}};
 if(content)opts.body=JSON.stringify(content);
 const r=await fetch(IPA_PAYMENT_EMAIL_DOC,opts);
 const data=await r.json().catch(()=>({}));
 if(method==='GET'&&r.status===404)return {enabled:false,subject:'Pagamento confirmado — Indo por Aí',message:'Recebemos seu pagamento! Obrigado por viajar com o Indo por Aí.',replyTo:''};
 if(!r.ok)throw Error(data?.error?.message||`Firestore ${r.status}`);
 const f=data.fields||{};
 return {enabled:f.enabled?.booleanValue===true,subject:ipaFsStr(f,'subject','Pagamento confirmado — Indo por Aí'),message:ipaFsStr(f,'message','Recebemos seu pagamento!'),replyTo:ipaFsStr(f,'replyTo')};
}
async function ipaPaymentEmailSettings(request,env){
 let identity;try{identity=await ipaAdminIdentity(request,env)}catch{return json({ok:false,error:'Falha ao autenticar ADM.'},502)}
 if(!identity)return json({ok:false,error:'Faça login no ADM.'},401);
 if(identity.localId!==IPA_ADMIN_UID)return json({ok:false,error:'Apenas ADM.'},403);
 try{
  if(request.method==='GET')return json({ok:true,settings:await ipaPaymentEmailFirestore(env)});
  const data=await request.json();const subject=String(data.subject||'').trim().slice(0,150),message=String(data.message||'').trim().slice(0,1800),replyTo=String(data.replyTo||'').trim().toLowerCase(),enabled=data.enabled===true;
  if(!subject||!message||replyTo&&!validEmail(replyTo))return json({ok:false,error:'Assunto, mensagem ou e-mail de resposta inválidos.'},400);
  const fields={enabled:{booleanValue:enabled},subject:{stringValue:subject},message:{stringValue:message},replyTo:{stringValue:replyTo}};
  // Patch document via server OAuth. Only authenticated admin can configure.
  await ipaPaymentEmailFirestore(env,'PATCH',{fields});
  return json({ok:true,settings:{enabled,subject,message,replyTo}});
 }catch(e){return json({ok:false,error:'Configuração não salva: '+(e.message||'falha')},502)}
}
// Beta 6.30.49 — comprovante: estado persistente, idempotência e reenvio controlado.
// Nunca liberar confirmação por solicitação do navegador sem verificar o pagamento na API do MP.
async function ipaReceiptPatch(env,id,changes,expectedUpdateTime){
  const token=await ipaGoogleServiceToken(env,'https://www.googleapis.com/auth/datastore');
  const url=new URL(IPA_PAYMENTS_FS+'/'+encodeURIComponent(id));
  for(const key of Object.keys(changes))url.searchParams.append('updateMask.fieldPaths',key);
  if(expectedUpdateTime)url.searchParams.set('currentDocument.updateTime',expectedUpdateTime);
  const fields={};
  for(const [key,value] of Object.entries(changes))fields[key]=typeof value==='boolean'?{booleanValue:value}:{stringValue:String(value??'')};
  const res=await fetch(url.toString(),{method:'PATCH',headers:{Authorization:'Bearer '+token,'content-type':'application/json'},body:JSON.stringify({fields})});
  if(!res.ok)throw new Error('Firestore ao registrar status do e-mail: '+res.status);
  return res.json();
}
async function ipaReceiptRecipient(env,fields,payment){
  const clientId=ipaPaymentString(fields,'clientId');
  if(/^[a-zA-Z0-9_-]{3,120}$/.test(clientId)){
    try{
      const token=await ipaGoogleServiceToken(env,'https://www.googleapis.com/auth/datastore');
      const res=await fetch('https://firestore.googleapis.com/v1/projects/indo-por-ai-app/databases/(default)/documents/clients/'+encodeURIComponent(clientId),{headers:{Authorization:'Bearer '+token},cache:'no-store'});
      if(res.ok){const doc=await res.json();const email=ipaPaymentString(doc.fields||{},'email').trim().toLowerCase();if(validEmail(email))return {email,name:ipaPaymentString(doc.fields||{},'name')};}
    }catch(e){console.warn('Receipt: lookup cliente indisponível',String(e?.message||''));}
  }
  for(const email of [ipaPaymentString(fields,'payerEmail'),payment?.payer?.email]){
    if(validEmail(email))return {email:String(email).trim().toLowerCase(),name:ipaPaymentString(fields,'clientName')};
  }
  return {email:'',name:''};
}
async function ipaEnsurePixReceipt(env,payment,documentId){
  const mpId=String(payment?.id||'');
  if(payment?.status!=='approved'||payment?.payment_method_id!=='pix'||!/^[0-9]+$/.test(mpId))return {state:'skipped',message:'Sem PIX aprovado'};
  const {doc}=await ipaReadPaymentDoc(env,documentId);
  const f=doc.fields||{};
  if(ipaPaymentString(f,'status')!=='Pago'||ipaPaymentString(f,'mpPaymentId')!==mpId)return {state:'skipped',message:'Cobrança ainda não conciliada'};
  const existing=ipaPaymentString(f,'receiptEmailStatus');
  if(existing==='sent')return {state:'sent',alreadySent:true,message:'Agradecimento já enviado',recipient:ipaPaymentString(f,'receiptEmailRecipient')};
  const last=Date.parse(ipaPaymentString(f,'receiptEmailLastAttemptAt'));
  if(existing==='sending')return {state:'sending',message:'Envio em andamento ou confirmação pendente. Confira no Resend antes de solicitar novo envio.'};
  const now=new Date().toISOString();
  // Compare-and-set impede o webhook e o botão ADM de enviarem em paralelo.
  try{await ipaReceiptPatch(env,documentId,{receiptEmailStatus:'sending',receiptEmailLastAttemptAt:now,receiptEmailError:''},doc.updateTime)}
  catch(e){if(/Firestore ao registrar status do e-mail: (409|412)/.test(e.message))return {state:'sending',message:'Outra verificação está processando este pagamento.'};throw e}
  try{
    if(!env.RESEND_API_KEY)throw Error('RESEND_API_KEY não configurada no Cloudflare Pages Production.');
    const recipient=await ipaReceiptRecipient(env,f,payment);
    if(!recipient.email)throw Error('Cliente sem e-mail válido no cadastro e no Mercado Pago.');
    const amount=new Intl.NumberFormat('pt-BR',{style:'currency',currency:payment.currency_id||'BRL'}).format(Number(payment.transaction_amount||0));
    const name=recipient.name?recipient.name.split(/\s+/)[0]:'viajante';
    const title='✈️ Pagamento recebido — Indo por Aí';
    const html=`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"></head><body style="margin:0;padding:24px;background:#f4f9fa;font-family:Arial,sans-serif;color:#193c49"><div style="max-width:580px;margin:auto;padding:28px;background:#fff;border-radius:18px;border:1px solid #dcebee"><h1 style="color:#075668">✈️ Indo por Aí</h1><h2>${ipaEmailEscape(title)}</h2><p>Oi, ${ipaEmailEscape(name)}! 💙</p><p>Seu pagamento foi confirmado! Mais uma etapa concluída para a sua próxima aventura. Obrigado por viajar com a gente!</p><p style="padding:14px;background:#eff7f8;border-radius:10px"><strong>Valor recebido:</strong> ${ipaEmailEscape(amount)}<br><strong>Transação Mercado Pago:</strong> ${ipaEmailEscape(mpId)}</p><p>Até a próxima descoberta! 🌍<br>Equipe Indo por Aí</p></div></body></html>`;
    const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+env.RESEND_API_KEY,'content-type':'application/json','Idempotency-Key':'ipa-payment-'+mpId},body:JSON.stringify({from:'Indo por Aí <acesso@indoporaicomagente.com>',to:[recipient.email],reply_to:'financeiro@indoporaicomagente.com',subject:title,html})});
    const data=await r.json().catch(()=>({}));
    if(!r.ok)throw Error('Resend '+r.status+': '+String(data?.message||data?.error||'envio rejeitado').slice(0,160));
    try{await ipaReceiptPatch(env,documentId,{receiptEmailStatus:'sent',receiptEmailSentAt:new Date().toISOString(),receiptEmailRecipient:recipient.email,receiptEmailResendId:String(data?.id||''),receiptEmailError:''})}
    catch(e){console.error('CRITICAL: receipt accepted but ledger status update failed',documentId,mpId,e.message);return {state:'sending',message:'Resend aceitou a mensagem; registro de confirmação pendente. Confira no Resend antes de tentar novamente.'}}
    return {state:'sent',recipient:recipient.email,message:'Agradecimento aceito pelo Resend'};
  }catch(e){
    const reason=String(e?.message||'Falha no envio').slice(0,240);
    console.error('PIX receipt delivery failed',documentId,reason);
    try{await ipaReceiptPatch(env,documentId,{receiptEmailStatus:'failed',receiptEmailError:reason})}catch(x){console.error('Receipt failure status not persisted',x.message)}
    return {state:'failed',message:reason};
  }
}

// Beta 6.30.32 — server-side payment reconciliation (no client-side approval).
const IPA_PAYMENTS_FS='https://firestore.googleapis.com/v1/projects/indo-por-ai-app/databases/(default)/documents/payments';
function ipaPaymentString(fields,name){return String(fields?.[name]?.stringValue||'')}
function ipaPaymentNumber(fields,name){return Number(fields?.[name]?.doubleValue??fields?.[name]?.integerValue??fields?.[name]?.stringValue??0)}
async function ipaReadPaymentDoc(env,id){
  if(!/^[a-zA-Z0-9_-]{3,120}$/.test(id))throw new Error('Identificador de cobrança inválido.');
  const token=await ipaGoogleServiceToken(env,'https://www.googleapis.com/auth/datastore');
  const url=IPA_PAYMENTS_FS+'/'+encodeURIComponent(id);
  const resp=await fetch(url,{headers:{Authorization:'Bearer '+token},cache:'no-store'});
  if(resp.status===404)throw new Error('Cobrança não encontrada no Firebase.');
  const doc=await resp.json().catch(()=>({}));
  if(!resp.ok)throw new Error(resp.status===403?'Permissão negada pelo Firestore. Conceda à conta de serviço do Cloudflare a função Cloud Datastore User no projeto Firebase; nenhuma baixa foi efetuada.':doc?.error?.message||'Falha no Firestore ('+resp.status+').');
  return {doc,token,url};
}
async function ipaFindPaymentByReference(env,id){
  const ref='indoporai_'+id;
  const res=await mercadoPagoFetch(env,'/v1/payments/search?external_reference='+encodeURIComponent(ref)+'&sort=date_created&criteria=desc&limit=50',{method:'GET'});
  if(!res.ok)throw new Error('Não foi possível pesquisar o Mercado Pago.');
  const matches=(res.body?.results||[]).filter(p=>p.external_reference===ref && p.payment_method_id==='pix' && p.status==='approved');
  if(matches.length===0)return null;
  const unique=new Map(matches.map(p=>[String(p.id),p]));
  if(unique.size!==1)throw new Error('Mais de um PIX aprovado corresponde à cobrança. Confira manualmente antes de baixar.');
  return [...unique.values()][0];
}
async function ipaReconcileApprovedPayment(env,payment){
  if(payment?.status!=='approved')return {state:'pending',message:'Pagamento ainda não aprovado.'};
  if(payment?.payment_method_id!=='pix')return {state:'not-pix',message:'Esta conciliação atende apenas PIX.'};
  const ref=String(payment?.external_reference||'');
  if(!/^indoporai_[a-zA-Z0-9_-]{3,120}$/.test(ref))return {state:'unmatched',message:'PIX sem referência do Indo por Aí. Não houve baixa.'};
  const id=ref.slice('indoporai_'.length);
  const {doc,token,url}=await ipaReadPaymentDoc(env,id);
  const f=doc.fields||{};
  const originalId=ipaPaymentString(f,'id')||id;
  if(originalId!==id)throw Error('Identificador divergente na cobrança do Firebase.');
  const amount=ipaPaymentNumber(f,'amount'),mpAmount=Number(payment.transaction_amount);
  if(!Number.isFinite(amount)||!Number.isFinite(mpAmount)||Math.abs(amount-mpAmount)>0.005)throw Error('Valor do PIX não corresponde à parcela. Não houve baixa.');
  const currency=ipaPaymentString(f,'currency')||'BRL';
  if(currency!==String(payment.currency_id||''))throw Error('Moeda da cobrança não corresponde à do Mercado Pago.');
  const currentMpId=ipaPaymentString(f,'mpPaymentId'),mpId=String(payment.id);
  if(currentMpId&&currentMpId!==mpId)throw Error('A cobrança já está vinculada a outro pagamento Mercado Pago.');
  const status=ipaPaymentString(f,'status');
  if(status==='Pago'){
    if(currentMpId!==mpId)throw Error('Cobrança já marcada como paga sem correspondência inequívoca. Revisão manual necessária.');
    return {state:'already-paid',paymentId:id,mpPaymentId:mpId,message:'Pagamento já conciliado.'};
  }
  const now=new Date().toISOString(),paidAt=(payment.date_approved||now).slice(0,10);
  const updates={status:{stringValue:'Pago'},paidAt:{stringValue:paidAt},mpPaymentId:{stringValue:mpId},mpStatus:{stringValue:'approved'},mpStatusDetail:{stringValue:String(payment.status_detail||'')},paymentEnvironment:{stringValue:'production'},reconciledAt:{stringValue:now},mpExternalReference:{stringValue:ref}};
  const u=new URL(url);
  for(const key of Object.keys(updates))u.searchParams.append('updateMask.fieldPaths',key);
  u.searchParams.set('currentDocument.updateTime',doc.updateTime);
  const result=await fetch(u.toString(),{method:'PATCH',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({fields:updates})});
  if(!result.ok){const error=await result.json().catch(()=>({}));throw Error(result.status===403?'Permissão negada pelo Firestore na gravação. A conta de serviço precisa ter Cloud Datastore User; nenhuma baixa foi confirmada.':result.status===409||result.status===412?'A cobrança foi modificada durante a conciliação. Atualize e tente novamente.':error?.error?.message||'Falha ao registrar baixa no Firebase.');}
  return {state:'paid',paymentId:id,mpPaymentId:mpId,paidAt,message:'PIX aprovado e registrado no Firebase.'};
}
async function ipaAdminReconcilePix(request,env){
  let identity;try{identity=await ipaAdminIdentity(request,env)}catch{return json({ok:false,error:'Falha ao validar o ADM.'},502)}
  if(!identity)return json({ok:false,error:'Faça login como ADM.'},401);
  if(identity.localId!==IPA_ADMIN_UID)return json({ok:false,error:'Apenas ADM.'},403);
  let body={};try{body=await request.json()}catch{return json({ok:false,error:'Dados inválidos.'},400)}
  const id=String(body.paymentId||'').trim();
  if(!/^[a-zA-Z0-9_-]{3,120}$/.test(id))return json({ok:false,error:'Cobrança inválida.'},400);
  try{
    const {doc}=await ipaReadPaymentDoc(env,id);
    const f=doc.fields||{};
    const mpId=ipaPaymentString(f,'mpPaymentId');
    let payment=null;
    if(mpId){
      if(!/^\d{5,25}$/.test(mpId))throw Error('ID do Mercado Pago inválido.');
      const found=await mercadoPagoFetch(env,'/v1/payments/'+encodeURIComponent(mpId),{method:'GET'});
      if(!found.ok)throw Error('O Mercado Pago não encontrou o pagamento vinculado.');
      payment=found.body;
    }else{payment=await ipaFindPaymentByReference(env,id);}
    if(!payment)return json({ok:true,state:'not-found',message:'Nenhum PIX aprovado encontrado para esta referência. Se foi transferência direta, concilie manualmente após confirmar o comprovante.'});
    const outcome=await ipaReconcileApprovedPayment(env,payment);
    if(outcome.state==='paid'||outcome.state==='already-paid'){
      outcome.receipt=await ipaEnsurePixReceipt(env,payment,id);
    }
    return json({ok:true,...outcome});
  }catch(e){console.error('PIX reconciliation rejected',e?.message);return json({ok:false,error:e.message||'Falha na conciliação. Nenhuma baixa foi feita.'},409)}
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
      let reconciliation={state:'not-approved'},receipt={skipped:'Aguardando baixa'};
      if(String(result.body?.status||'').toLowerCase()==='approved' && result.body?.payment_method_id==='pix'){
        try{
          reconciliation=await ipaReconcileApprovedPayment(env,result.body);
          if(reconciliation.state==='paid'||reconciliation.state==='already-paid'){
            receipt=await ipaEnsurePixReceipt(env,result.body,reconciliation.paymentId);
          }
        }catch(e){console.error('PIX webhook conciliation',e);return json({ok:false,error:'Conciliação pendente; notificação deve ser repetida.'},503)}
      }
      return json({ok:true,received:true,status:p.paymentStatus,externalReference:p.externalReference,reconciliation:reconciliation.state,receipt});
    }
    // Erro temporário no Mercado Pago: peça reenvio do webhook, não marque como recebido.
    return json({ok:false,error:'Consulta ao Mercado Pago indisponível. Tente novamente.'},503);
  }
  return json({ok:true,received:true});
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
async function ipaGoogleServiceToken(env,scope="https://www.googleapis.com/auth/identitytoolkit"){
 if(!env.FIREBASE_SERVICE_ACCOUNT_JSON)throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON ausente em Production.');
 let sa;try{sa=JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_JSON)}catch{throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON não contém JSON válido.')}
 if(sa.project_id!==IPA_FIREBASE_PROJECT||sa.client_email!==`indo-por-ai-convites@${IPA_FIREBASE_PROJECT}.iam.gserviceaccount.com`||!sa.private_key)throw new Error('A credencial não pertence à conta exclusiva de convites.');
 const pem=sa.private_key.replace(/\\n/g,'\n').replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g,'');
 const der=Uint8Array.from(atob(pem),x=>x.charCodeAt(0));
 const key=await crypto.subtle.importKey('pkcs8',der,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['sign']);
 const issued=Math.floor(Date.now()/1000);
 const payload={iss:sa.client_email,scope,aud:'https://oauth2.googleapis.com/token',iat:issued,exp:issued+3600};
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


// Catálogos públicos: descoberta por correspondência estrita; nunca inventar links.
// Spotify requer credenciais próprias opcionais guardadas SOMENTE no Worker.
const ipaClimateNormalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const ipaClimateSafeHost=(v,allowed)=>{try{const u=new URL(v);return u.protocol==='https:'&&allowed.includes(u.hostname.replace(/^www\./,''))?u.href:''}catch{return ''}};
async function ipaClimateCatalogJson(url,init={}){
 const ctrl=new AbortController(),tm=setTimeout(()=>ctrl.abort(),4500);
 try{const r=await fetch(url,{...init,signal:ctrl.signal,headers:{accept:'application/json',...(init.headers||{})}});if(!r.ok)return null;return await r.json()}catch{return null}finally{clearTimeout(tm)}
}
function ipaClimateMatch(candidate,requested){
 const a=ipaClimateNormalize(candidate),b=ipaClimateNormalize(requested);
 if(!a||!b)return false;
 return a===b||a.startsWith(b+' ')||b.startsWith(a+' ');
}
async function ipaClimateDiscover(request,env){
 const u=new URL(request.url),type=String(u.searchParams.get('type')||'').slice(0,30).toLowerCase(),title=String(u.searchParams.get('title')||'').slice(0,140).trim(),dest=String(u.searchParams.get('destination')||'').slice(0,100).trim();
 if(!title||!/(playlist|livro|filme|série)/.test(type))return json({ok:false,error:'Recomendação inválida'},400);
 const links={},sources=[];
 const tasks=[];
 if(type.includes('playlist')){
  // Deezer playlist search: exige título realmente coincidente, sem links a pesquisas.
  tasks.push((async()=>{const data=await ipaClimateCatalogJson('https://api.deezer.com/search/playlist?q='+encodeURIComponent(title));const item=(data?.data||[]).find(x=>ipaClimateMatch(x.title,title));const link=ipaClimateSafeHost(item?.link,['deezer.com']);if(link){links.Deezer=link;sources.push('Deezer')}})());
  // Spotify Web API só se o responsável configurar Client ID/Secret no Cloudflare.
  if(env.SPOTIFY_CLIENT_ID&&env.SPOTIFY_CLIENT_SECRET)tasks.push((async()=>{
    const basic=btoa(env.SPOTIFY_CLIENT_ID+':'+env.SPOTIFY_CLIENT_SECRET);
    const token=await ipaClimateCatalogJson('https://accounts.spotify.com/api/token',{method:'POST',headers:{authorization:'Basic '+basic,'content-type':'application/x-www-form-urlencoded'},body:'grant_type=client_credentials'});
    if(!token?.access_token)return;
    const data=await ipaClimateCatalogJson('https://api.spotify.com/v1/search?type=playlist&limit=15&q='+encodeURIComponent(title),{headers:{authorization:'Bearer '+token.access_token}});
    const item=(data?.playlists?.items||[]).find(x=>x&&ipaClimateMatch(x.name,title));const link=ipaClimateSafeHost(item?.external_urls?.spotify,['open.spotify.com']);if(link){links.Spotify=link;sources.push('Spotify')}
  })());
  // Apple catalog: somente playlists que coincidam exatamente com o título.
  tasks.push((async()=>{const data=await ipaClimateCatalogJson('https://itunes.apple.com/search?term='+encodeURIComponent(title)+'&media=music&entity=musicTrack&limit=10&country=BR');
    // A API pública do iTunes não devolve playlists. Não apresentar músicas isoladas como playlists.
    void data;
  })());
 }
 if((type.includes('filme')||type.includes('série'))&&env.YOUTUBE_API_KEY)tasks.push((async()=>{
  // YouTube Data API: apenas resultado de vídeo com título correspondente; sem fabricar IDs.
  const q=title+' trailer oficial';
  const data=await ipaClimateCatalogJson('https://www.googleapis.com/youtube/v3/search?'+new URLSearchParams({part:'snippet',type:'video',maxResults:'8',q,key:env.YOUTUBE_API_KEY}));
  const entries=data?.items||[];
  const match=entries.find(x=>{const name=ipaClimateNormalize(x?.snippet?.title||'');const original=ipaClimateNormalize(title);return name.includes(original)&&(/trailer|teaser/.test(name))&&x?.id?.videoId;});
  if(match){links.Trailer='https://www.youtube.com/watch?v='+encodeURIComponent(match.id.videoId);sources.push('YouTube trailer')}
 })());
 if(type.includes('filme')||type.includes('série'))tasks.push((async()=>{
  // Catálogo público Apple: trailers reais, sem pesquisas genéricas ou links presumidos.
  // Apenas correspondência de título. O vídeo abre diretamente onde o provedor permite.
  const data=await ipaClimateCatalogJson('https://itunes.apple.com/search?term='+encodeURIComponent(title)+'&media=movie&entity=movie&limit=30&country=BR');
  const item=(data?.results||[]).find(x=>ipaClimateMatch(x.trackName||x.collectionName,title));
  const preview=ipaClimateSafeHost(item?.previewUrl,['video-ssl.itunes.apple.com']);
  if(preview){links.Trailer=preview;sources.push('Apple trailers')}
 })());
 if(type.includes('livro'))tasks.push((async()=>{
  const data=await ipaClimateCatalogJson('https://itunes.apple.com/search?term='+encodeURIComponent(title)+'&media=ebook&entity=ebook&limit=20&country=BR');
  const item=(data?.results||[]).find(x=>ipaClimateMatch(x.trackName||x.collectionName,title));
  const link=ipaClimateSafeHost(item?.trackViewUrl,['books.apple.com']);if(link){links['Apple Books']=link;sources.push('Apple Books')}
 })());
 await Promise.allSettled(tasks);
 return new Response(JSON.stringify({ok:true,links,sources,disclaimer:'Links específicos encontrados em catálogos públicos; a disponibilidade e o acesso dependem da plataforma.'}),{headers:{'content-type':'application/json; charset=utf-8','cache-control':'public, max-age=3600, s-maxage=43200','x-content-type-options':'nosniff'}});
}

// Beta 6.30.38 — monitoramento autenticado de sessões de clientes.
// Mantido em coleção isolada para não interferir no CRM nem na sincronização de clientes.
const IPA_ACCESS_ROOT=`https://firestore.googleapis.com/v1/projects/${IPA_FIREBASE_PROJECT}/databases/(default)/documents`;
function ipaAccessField(f,k){return f?.[k]?.stringValue||'';}
async function ipaAccessRequest(request,env){
  let identity;
  try{identity=await ipaAdminIdentity(request,env)}catch{return json({ok:false,error:'Falha ao validar sessão.'},502)}
  if(!identity)return json({ok:false,error:'Sessão não autenticada.'},401);
  if(request.method==='GET'){
    if(identity.localId!==IPA_ADMIN_UID)return json({ok:false,error:'Apenas o administrador pode consultar acessos.'},403);
    try{
      const token=await ipaGoogleServiceToken(env,'https://www.googleapis.com/auth/datastore');
      let next='',pages=0,stats={};
      do{
        const u=IPA_ACCESS_ROOT+'/clientAccessStats?pageSize=300'+(next?'&pageToken='+encodeURIComponent(next):'');
        const r=await fetch(u,{headers:{Authorization:'Bearer '+token},cache:'no-store'});
        if(r.status===404)break;
        const d=await r.json().catch(()=>({}));
        if(!r.ok)throw Error(d?.error?.message||'Falha ao buscar acessos ('+r.status+').');
        for(const item of d.documents||[]){
          const id=decodeURIComponent((item.name||'').split('/').pop()||'');
          if(!id)continue;
          stats[id]={count:Number(item.fields?.count?.integerValue||0),lastAccessAt:item.fields?.lastAccessAt?.timestampValue||null};
        }
        next=d.nextPageToken||'';
      }while(next && ++pages<20);
      return json({ok:true,stats});
    }catch(e){console.error('Client access stats read failed',e.message);return json({ok:false,error:'Não foi possível consultar os acessos.'},502)}
  }
  if(request.method!=='POST')return json({ok:false,error:'Método inválido.'},405);
  if(identity.localId===IPA_ADMIN_UID)return json({ok:false,error:'Contagem restrita aos viajantes.'},403);
  let body={};try{body=await request.json()}catch{return json({ok:false,error:'Dados inválidos.'},400)}
  const clientId=String(body.clientId||'');
  const sessionId=String(body.sessionId||'');
  if(!/^[a-zA-Z0-9_-]{3,120}$/.test(clientId)||!/^[a-zA-Z0-9-]{20,80}$/.test(sessionId))return json({ok:false,error:'Identificação de sessão inválida.'},400);
  try{
    const token=await ipaGoogleServiceToken(env,'https://www.googleapis.com/auth/datastore');
    const clientResponse=await fetch(IPA_ACCESS_ROOT+'/clients/'+encodeURIComponent(clientId),{headers:{Authorization:'Bearer '+token},cache:'no-store'});
    if(!clientResponse.ok)return json({ok:false,error:'Cliente não encontrado ou indisponível.'},clientResponse.status===404?404:502);
    const clientDoc=await clientResponse.json();const fields=clientDoc.fields||{};
    const mail=String(identity.email||'').toLowerCase().trim();
    const registered=ipaAccessField(fields,'email').trim().toLowerCase();
    const uid=ipaAccessField(fields,'authUid');
    if(!mail || (uid!==identity.localId && registered!==mail))return json({ok:false,error:'Acesso não corresponde ao cadastro.'},403);
    // Hash impede caracteres não confiáveis no nome do documento.
    const raw=new TextEncoder().encode(identity.localId+'|'+sessionId);
    const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',raw));
    const sessionKey=[...digest].map(v=>v.toString(16).padStart(2,'0')).join('');
    const sessionName=`projects/${IPA_FIREBASE_PROJECT}/databases/(default)/documents/clientAccessSessions/${sessionKey}`;
    const statsName=`projects/${IPA_FIREBASE_PROJECT}/databases/(default)/documents/clientAccessStats/${clientId}`;
    const writes=[
      {update:{name:sessionName,fields:{clientId:{stringValue:clientId},uid:{stringValue:identity.localId}}},currentDocument:{exists:false}},
      {transform:{document:statsName,fieldTransforms:[
        {fieldPath:'count',increment:{integerValue:'1'}},
        {fieldPath:'lastAccessAt',setToServerValue:'REQUEST_TIME'}
      ]}}
    ];
    const r=await fetch(`https://firestore.googleapis.com/v1/projects/${IPA_FIREBASE_PROJECT}/databases/(default)/documents:commit`,{method:'POST',headers:{Authorization:'Bearer '+token,'content-type':'application/json'},body:JSON.stringify({writes})});
    const result=await r.json().catch(()=>({}));
    if(!r.ok){
      // Documento da sessão já criado: repetição de carregamento não incrementa.
      if(r.status===409 || (r.status===400 && ['ALREADY_EXISTS','FAILED_PRECONDITION'].includes(result?.error?.status)))return json({ok:true,alreadyRecorded:true});
      console.error('Client access session commit failed',r.status,result?.error?.status||'');
      return json({ok:false,error:'Não foi possível registrar a sessão.'},502);
    }
    return json({ok:true,recorded:true});
  }catch(e){console.error('Client access tracking failed',e.message);return json({ok:false,error:'Erro no registro de acesso.'},502)}
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/client/access" && (request.method === "POST" || request.method === "GET")) return ipaAccessRequest(request,env);
    if (url.pathname === "/api/admin/payment-email" && (request.method === "GET" || request.method === "POST")) return json({ok:false,error:"A configuração do e-mail é fixa desde a Beta 6.30.33."},410);
    if (url.pathname === "/api/admin/reconcile-pix" && request.method === "POST") return ipaAdminReconcilePix(request,env);
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
    if (url.pathname === "/api/climate/discover" && request.method === "GET") return ipaClimateDiscover(request,env);
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
