# Beta 6.8 — Cobranças por cliente e viagem

Agora o ADM pode criar uma cobrança de duas formas:
1. Financeiro > Nova cobrança:
   - escolhe cliente;
   - escolhe uma viagem daquele cliente;
   - título, descrição, valor, vencimento;
   - Pix e/ou Cartão.
2. Dentro de uma viagem:
   - botão “Enviar cobrança para este cliente”.

A cobrança é gravada no Firestore com:
- clientId
- tripId
- clientName
- trip
- valor
- vencimento
- métodos
- status

O cliente vê somente as cobranças da viagem ativa na área Pagamentos.
Nesta versão, Pix e cartão continuam como fluxo de demonstração; integração bancária/gateway real será uma etapa posterior.

As regras Firestore já existentes que permitem pagamentos por clientId continuam compatíveis.
