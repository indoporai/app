# Indo por Aí V2 Beta 3.1 — Correção de acesso

Correções:
- Pagamentos adicionado ao mapa de rotas do app.
- Avatar superior agora abre Minha Conta.
- Minha Conta possui acesso visível a Pagamentos e Modo ADM.
- Modo ADM abre admin.html.
- Minha Viagem ganhou atalhos visíveis para Pagamentos e Modo ADM.
- Mantido o card de cobrança pendente na tela Antes.
- Mantido o Financeiro no ADM: nova cobrança, totais, lembrete e status.

Motivo do erro anterior:
As telas de pagamentos e ADM existiam nos arquivos, porém Pagamentos não havia sido registrado
no objeto de rotas principal e o ADM estava escondido em uma página separada sem navegação clara.
