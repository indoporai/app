# Beta 6.12 — Link do cliente

Esta versão muda a estratégia do acesso por e-mail para eliminar a dependência de `activeTripId`.

## Como a viagem é resolvida
1. `tripId` que veio no link do e-mail.
2. `activeTripId` / `lastInvitedTripId` do cliente.
3. Qualquer viagem publicada daquele cliente, como fallback.

## Melhorias
- Parser recursivo para `continueUrl`, `link` e URLs encapsuladas pelo Firebase/Google.
- Snapshot do contexto do convite antes de qualquer limpeza da URL.
- Busca do cliente por clientId, depois authUid, depois e-mail.
- Firestore permite ao cliente ler qualquer viagem PUBLICADA pertencente ao próprio clientId.
- O aplicativo continua exibindo somente a viagem escolhida pelo convite.
- E-mails de novos clientes são gravados em minúsculas.

## OBRIGATÓRIO
Publique `FIRESTORE-RULES-BETA-6-12.txt` em:
Firebase > Firestore Database > Regras.

## Teste recomendado
1. Publique a Beta 6.12.
2. Publique as regras 6.12.
3. ADM > abra Paris > confirme Publicada.
4. Clique em Enviar acesso desta viagem.
5. Use o NOVO e-mail recebido.
6. Abra em aba anônima ou outro aparelho.
7. A viagem deve abrir em Antes e permanecer a mesma em Durante e Depois.
