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
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + 7200;
    const roomName = `indo-por-ai-${Date.now()}`;

    const roomRequest = await fetch(`${DAILY_API}/rooms`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: roomName,
        privacy: "private",
        properties: {
          exp: expiresAt,
          enable_chat: true,
          enable_prejoin_ui: true,
          start_video_off: false,
          start_audio_off: false,
          max_participants: 50
        }
      })
    });

    const room = await roomRequest.json();
    if (!roomRequest.ok) {
      return response(roomRequest.status, {
        error: room.info || room.error || "Não foi possível criar a sala."
      });
    }

    const tokenRequest = await fetch(`${DAILY_API}/meeting-tokens`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        properties: {
          room_name: roomName,
          is_owner: true,
          user_name: "Indo por Aí",
          exp: expiresAt,
          enable_prejoin_ui: true
        }
      })
    });

    const tokenData = await tokenRequest.json();
    if (!tokenRequest.ok) {
      return response(tokenRequest.status, {
        error: tokenData.info || tokenData.error || "Não foi possível criar o token do guia."
      });
    }

    return response(200, {
      roomName,
      hostJoinUrl: `${room.url}?t=${encodeURIComponent(tokenData.token)}`
    });
  } catch (error) {
    console.error(error);
    return response(500, { error: "Erro interno ao criar a transmissão." });
  }
}
