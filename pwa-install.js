(() => {
  const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  if (isStandalone()) return;

  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  let deferredPrompt = null;

  function ensureUI() {
    if (document.getElementById('ipaInstallApp')) return;
    const wrap = document.createElement('div');
    wrap.id = 'ipaInstallApp';
    wrap.className = 'ipa-install-app';
    wrap.hidden = true;
    wrap.innerHTML = `
      <div class="ipa-install-card" role="region" aria-label="Instalar Indo por Aí">
        <img src="assets/icon-192.png" alt="" class="ipa-install-icon">
        <div class="ipa-install-copy"><strong>Instale o Indo por Aí</strong><span id="ipaInstallText">Tenha o app na tela inicial do celular.</span></div>
        <button type="button" id="ipaInstallBtn" class="ipa-install-primary">Instalar</button>
        <button type="button" id="ipaInstallClose" class="ipa-install-close" aria-label="Fechar">×</button>
      </div>`;
    document.body.appendChild(wrap);

    document.getElementById('ipaInstallClose').addEventListener('click', () => {
      wrap.hidden = true;
      sessionStorage.setItem('ipa-install-dismissed', '1');
    });
    document.getElementById('ipaInstallBtn').addEventListener('click', async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        await deferredPrompt.userChoice.catch(() => null);
        deferredPrompt = null;
        wrap.hidden = true;
        return;
      }
      if (isIOS) showIOSHelp();
    });
  }

  function showIOSHelp() {
    ensureUI();
    const text = document.getElementById('ipaInstallText');
    const btn = document.getElementById('ipaInstallBtn');
    if (text) text.textContent = 'No Safari: toque em Compartilhar e depois em “Adicionar à Tela de Início”.';
    if (btn) btn.textContent = 'Entendi';
    btn.onclick = () => { document.getElementById('ipaInstallApp').hidden = true; };
  }

  function show() {
    if (isStandalone() || sessionStorage.getItem('ipa-install-dismissed') === '1') return;
    ensureUI();
    document.getElementById('ipaInstallApp').hidden = false;
  }

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event;
    show();
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    const el = document.getElementById('ipaInstallApp');
    if (el) el.hidden = true;
  });
  window.addEventListener('load', () => {
    if (isIOS && !isStandalone()) setTimeout(show, 2600);
  });
})();
