const statusBox = document.querySelector("#status");
const createButton = document.querySelector("#createLive");
const hostResult = document.querySelector("#hostResult");
const roomCode = document.querySelector("#roomCode");
const copyCodeButton = document.querySelector("#copyCode");
const openHostButton = document.querySelector("#openHost");
const joinButton = document.querySelector("#joinLive");
const joinCode = document.querySelector("#joinCode");
const viewerName = document.querySelector("#viewerName");

let hostJoinUrl = "";

function setStatus(message, error = false) {
  statusBox.textContent = message;
  statusBox.classList.toggle("error", error);
}

async function postJson(url, data) {
  const response = await fetch(url, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify(data)
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "Falha na operação.");
  return result;
}

createButton.addEventListener("click", async () => {
  createButton.disabled = true;
  setStatus("Criando sala privada...");
  try {
    const data = await postJson("/.netlify/functions/create-live-room", {});
    hostJoinUrl = data.hostJoinUrl;
    roomCode.textContent = data.roomName;
    joinCode.value = data.roomName;
    hostResult.classList.remove("hidden");
    setStatus("Sala criada. Abra a câmera do guia.");
  } catch (error) {
    setStatus(error.message, true);
  } finally {
    createButton.disabled = false;
  }
});

openHostButton.addEventListener("click", () => {
  if (!hostJoinUrl) return setStatus("Crie uma transmissão primeiro.", true);
  window.open(hostJoinUrl, "_blank", "noopener");
});

copyCodeButton.addEventListener("click", async () => {
  const code = roomCode.textContent.trim();
  try {
    await navigator.clipboard.writeText(code);
    setStatus("Código copiado.");
  } catch {
    joinCode.value = code;
    joinCode.select();
    setStatus("Selecione e copie o código.");
  }
});

joinButton.addEventListener("click", async () => {
  const code = joinCode.value.trim();
  if (!code) return setStatus("Digite o código da transmissão.", true);

  joinButton.disabled = true;
  setStatus("Gerando acesso do espectador...");
  try {
    const data = await postJson("/.netlify/functions/join-live-room", {
      roomName: code,
      viewerName: viewerName.value.trim() || "Viajante"
    });
    window.open(data.viewerJoinUrl, "_blank", "noopener");
    setStatus("A transmissão foi aberta.");
  } catch (error) {
    setStatus(error.message, true);
  } finally {
    joinButton.disabled = false;
  }
});
