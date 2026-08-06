const DAILY_API = "https://api.daily.co/v1";

function response(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  };
}

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return response(405, { error: "Método não permitido." });
  }

  const apiKey = process.env.DAILY_API_KEY;
  if (!apiKey) {
    return response(500, { error: "DAILY_API_KEY não configurada no Netlify." });
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const roomName = String(body.roomName || "").trim();
    const viewerName = String(body.viewerName || "Viajante").trim().slice(0, 50);

    if (!roomName || !/^[a-zA-Z0-9_-]+$/.test(roomName)) {
      return response(400, { error: "Código da transmissão inválido." });
    }

    const roomRequest = await fetch(`${DAILY_API}/rooms/${encodeURIComponent(roomName)}`, {
      headers: { Authorization: `Bearer ${apiKey}` }
    });

    const room = await roomRequest.json();
    if (!roomRequest.ok) {
      return response(404, { error: "Transmissão não encontrada ou encerrada." });
    }

    const now = Math.floor(Date.now() / 1000);
    const roomExp = room?.config?.exp || now + 3600;
    const expiresAt = Math.min(roomExp, now + 3600);

    const tokenRequest = await fetch(`${DAILY_API}/meeting-tokens`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        properties: {
          room_name: roomName,
          is_owner: false,
          user_name: viewerName || "Viajante",
          exp: expiresAt,
          start_video_off: true,
          start_audio_off: true,
          enable_prejoin_ui: true
        }
      })
    });

    const tokenData = await tokenRequest.json();
    if (!tokenRequest.ok) {
      return response(tokenRequest.status, {
        error: tokenData.info || tokenData.error || "Não foi possível gerar o acesso."
      });
    }

    return response(200, {
      viewerJoinUrl: `${room.url}?t=${encodeURIComponent(tokenData.token)}`
    });
  } catch (error) {
    console.error(error);
    return response(500, { error: "Erro interno ao entrar na transmissão." });
  }
}
