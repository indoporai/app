# Beta 6.28.1 — Persistência e aprovação

Correções:
- removido definitivamente o reset automático herdado da versão de ambiente zerado;
- clientes, lugares, roteiros, pedidos e demais cadastros não são mais apagados ao entrar no ADM;
- Banco de Lugares e Pedidos de viagem agora entram no pull/sync do Firebase;
- formulário público grava o Pedido e o pré-cadastro do Cliente diretamente no Firestore, com status Aguardando aprovação;
- ADM mostra de forma explícita os limites: Explore 1, Signature 3, Elite 5, Groups ilimitado;
- cadastro manual mantém seleção de pacote e Titular/Acompanhante.

## IMPORTANTE — Firestore Rules
Antes de testar o formulário público, publique o conteúdo de `FIRESTORE-RULES-BETA-6-28-1.txt` em Firebase > Firestore Database > Rules.
As regras permitem apenas CREATE público validado para `travelLeads` e pré-cadastro em `clients`; leitura, edição e aprovação continuam restritas ao ADM.
