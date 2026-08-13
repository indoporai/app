# Indo por Aí V2 Beta 5 — Firebase ADM

Primeira integração real com Firebase.

Incluído:
- Firebase SDK 12.17.1 via CDN oficial.
- Firebase Authentication por e-mail/senha.
- Validação do UID administrador.
- Firestore real para:
  - clients
  - trips
  - payments
  - benefits
  - itineraryTemplates
  - settings/main
  - users/{adminUid}
- Primeiro login:
  - se Firestore estiver vazio, os dados atuais da demo são enviados automaticamente;
  - se já houver dados, o app baixa os dados do Firestore.
- Mudanças feitas no ADM passam a sincronizar automaticamente com Firestore.
- Botão manual “Sincronizar”.
- Badge de status Firebase no ADM.
- Logout.

Importante:
- Nesta etapa, as regras do Firestore liberam somente o UID ADM.
- O app do cliente continua usando a cópia local dos dados.
- A próxima etapa será criar autenticação e regras específicas para clientes, permitindo teste real em aparelhos diferentes.
