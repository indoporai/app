# Beta 6.26.1 — Ambiente zerado

Esta versão parte da Beta 6.26 e mantém a estrutura/funcionalidades.

Na primeira autenticação do ADM após o deploy, realiza uma limpeza única dos dados de teste do Indo por Aí no Firestore (quando as regras permitem), limpa o banco local do navegador e inicia sem clientes, viagens, lugares, roteiros, pagamentos, memórias ou leads de teste.

Mantém:
- login/configuração Firebase;
- estrutura visual e funcionalidades da 6.26;
- definições dos pacotes Explore, Signature, Elite e Groups no código.

Observação: arquivos binários antigos no Firebase Storage podem permanecer fisicamente armazenados, mas deixam de aparecer no app porque as referências de teste são apagadas.
