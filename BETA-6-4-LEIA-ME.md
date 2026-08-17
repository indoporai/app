# Beta 6.4 — Convite direcionado por viagem

Causa identificada:
O convite era vinculado apenas ao CLIENTE. Se o mesmo cliente tinha mais de uma viagem
publicada, o app escolhia uma delas por data. Por isso uma viagem como Portugal podia
abrir no lugar da viagem Paris.

Correção:
- cada viagem publicada agora tem o botão `Enviar acesso desta viagem`;
- o e-mail leva `clientId + tripId`;
- após autenticar, o app carrega exatamente esse documento de viagem;
- valida que a viagem pertence ao cliente do convite e que está publicada;
- guarda o tripId como viagem ativa;
- convites antigos continuam funcionando como fallback.

TESTE RECOMENDADO
1. ADM > Viagens > abra a viagem Paris.
2. Confirme que ela está `Publicada`.
3. Clique em `Enviar acesso desta viagem`.
4. Abra ESSE NOVO e-mail no cliente.
5. O app deve abrir em Antes com Paris.

Não precisa alterar as regras do Firestore da Beta 6.3.
