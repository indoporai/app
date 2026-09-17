# Beta 6.28.6 — vínculo manual cliente ↔ viagem

Hotfix incremental sobre a 6.28.5.

- Adiciona no editor da viagem o bloco **Cliente da viagem**.
- Lista os clientes já cadastrados no ADM.
- Botão **Vincular cliente / Alterar vínculo**.
- Salva `trip.clientId` e define `client.activeTripId` / `lastConfiguredTripId`.
- Remove referência à mesma viagem do cliente anterior quando o vínculo é trocado.
- Sincroniza imediatamente com Firebase.
- Não altera estrutura dos módulos já validados.
- Não reseta dados.
