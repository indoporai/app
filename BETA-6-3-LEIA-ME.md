# Beta 6.3 — Direcionamento do cliente

Causa corrigida:
- o app tentava localizar primeiro o cliente por `authUid`, mas no primeiro acesso esse UID ainda não existe;
- além disso, uma consulta Firestore por `authUid` não era compatível com a regra de primeiro acesso baseada em e-mail.

Novo fluxo:
1. o convite carrega `clientId` na URL;
2. após autenticar, o app abre diretamente esse documento de cliente;
3. valida que o e-mail autenticado é o mesmo e-mail do cadastro;
4. grava o UID naquele cliente;
5. busca as viagens pelo `clientId`;
6. carrega somente a viagem publicada;
7. abre diretamente no modo Antes;
8. próximos acessos usam o clientId/UID já vinculado.

IMPORTANTE:
Publique também o arquivo FIRESTORE-RULES-BETA-6-3.txt em
Firebase > Firestore Database > Regras.
