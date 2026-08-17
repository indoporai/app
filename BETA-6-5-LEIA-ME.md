# Beta 6.5 — Vínculo permanente Cliente ↔ Viagem

Mudança estrutural:
- Ao clicar em `Enviar acesso desta viagem`, o ADM grava `activeTripId` no documento do cliente ANTES de enviar o e-mail.
- No login, o cliente lê `activeTripId` do próprio cadastro e abre diretamente aquela viagem.
- O direcionamento não depende mais do `tripId` sobreviver dentro do link de autenticação do Firebase.
- O convite ainda carrega tripId como redundância, mas o Firestore passa a ser a fonte de verdade.
- Na tela Clientes do ADM aparece qual viagem está direcionada para aquele cliente.
- Se a viagem não puder ser aberta, a mensagem de erro mostra `clientId` e `activeTripId` para diagnóstico.

Teste:
1. Abra ADM > Viagens > Paris.
2. Confirme Paris como Publicada.
3. Clique `Enviar acesso desta viagem`.
4. Vá em Firestore > clients > cliente e confirme que apareceu:
   activeTripId: "<id da viagem Paris>"
5. Abra o novo e-mail do cliente.
6. O app deve abrir Paris em Antes.

Não é necessário alterar as regras se as regras da Beta 6.3 já estão publicadas.
