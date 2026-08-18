# Beta 6.7 — correção da Visão do Cliente

Causa encontrada no código:
- havia DOIS handlers para `data-admin-preview`;
- o segundo sobrescrevia o primeiro;
- ele mudava o perfil para cliente, mas NÃO informava qual viagem estava sendo visualizada;
- `activeTrip()` então podia escolher outra viagem publicada/armazenada.

Correção:
- o botão `Ver como cliente` agora usa uma ação exclusiva;
- grava exatamente `tripId` e `clientId` da viagem aberta no ADM;
- `activeTrip()` dá prioridade absoluta à viagem escolhida na prévia;
- a prévia não depende de e-mail, Firebase Authentication ou publicação da viagem.

Teste:
ADM > Viagens > abra Paris > Ver como cliente.
A tela Antes deve mostrar exatamente Paris, seu pacote e seu roteiro.
