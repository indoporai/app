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

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

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
