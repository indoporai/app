# Beta 5.1 — Correção Firebase

Correção do travamento em “Conectando ao Firebase...”.

Causa:
- `firebase-service.js` estava presente no pacote Beta 5, porém não estava sendo carregado pelo `index.html`.

Correções:
- inclusão explícita do módulo Firebase no `index.html`;
- rerender automático quando o serviço Firebase termina de carregar;
- novo cache `v2-beta-5-1` para evitar reaproveitamento da versão anterior pelo service worker.
