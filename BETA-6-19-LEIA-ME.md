# Beta 6.19 — Firebase Storage + Participantes

Esta versão é construída sobre a 6.17 estável.

Inclui:
- upload de momentos para Firebase Storage usando as regras atuais:
  `memories/{clientId}/{tripId}/{fileName}`;
- metadados de Memórias preservados e sincronizados;
- fallback local se o Storage falhar, sem quebrar Registrar Momento;
- participantes reais no ADM;
- titular, adulto, menor, assento e responsável;
- convite vinculado explicitamente a `tripId + participantId`;
- status Pendente / Enviado / Aceito;
- ao abrir convite, o participante é direcionado para a viagem correta;
- participante atual identificado no Durante;
- momentos passam a carregar `participantId` e `participantName`.

Importante:
- regras do Storage atuais NÃO precisam ser alteradas;
- esta versão preserva os fluxos da 6.17: Ver como cliente, Avaliar, Registrar Momento, Memórias e Filme.
