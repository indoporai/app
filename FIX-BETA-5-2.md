# Beta 5.2 — Cadastro de cliente

Causa encontrada:
O botão Salvar era procurado no DOM antes de o modal de cadastro ser aberto. Por isso o formulário aparecia, mas o clique em Salvar não tinha handler.

Correções:
- binding do botão é feito depois da abertura do modal;
- gravação local + sincronização imediata com Firestore;
- confirmação “Cliente salvo no Firebase ✓”;
- modal fecha e lista de clientes atualiza;
- telefone incluído no cadastro;
- mesma correção aplicada ao botão de nova cobrança.
