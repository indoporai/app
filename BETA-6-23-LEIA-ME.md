# Beta 6.23 — Item 6

Base congelada: Beta 6.22.1.

Alterações incrementais:
- Durante: rota oficial A → B → C → D pelas ruas via Routes API.
- Exibe distância e tempo estimados da rota oficial.
- Explorar: substitui o mapa ilustrativo pelo mesmo Google Maps real aprovado na 6.22.1.
- Explorar mostra roteiro oficial, descobertas pessoais e localização atual.
- Mantém fallback visual caso a Routes API esteja temporariamente indisponível.
- Avaliação: atualização das estrelas diretamente no DOM, sem depender de nova renderização.

Cloudflare:
- `GOOGLE_MAPS_API_KEY` (chave de servidor já usada pelo Places) precisa ter também a **Routes API** liberada.
- `GOOGLE_MAPS_BROWSER_KEY` continua sendo usada apenas para o mapa no navegador.
