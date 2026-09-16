# Beta 6.28.2 — vínculo Roteiro → Viagem → Cliente

- Adiciona **Aprovar roteiro e criar viagem** na sugestão inteligente do pedido.
- Cria a viagem vinculada ao cliente e copia o roteiro inteligente para a viagem.
- Grava `activeTripId` no cliente e `tripId` no pedido.
- Evita duplicidade: depois de criada, a ação passa a **Ver viagem**.
- Corrige Publicar/Retirar publicação para sincronizar imediatamente com o Firebase.
- A visão do cliente continua lendo a viagem publicada diretamente do Firestore.
- Banco de Lugares permanece independente: a viagem recebe uma cópia do roteiro aprovado.
