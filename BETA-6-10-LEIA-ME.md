# Beta 6.10 — Status do Pix de teste

Mantém o fluxo da Beta 6.9 e melhora a consulta do pagamento.

Ao clicar em **Verificar pagamento**, o app agora mostra:
- Aguardando atualização do Mercado Pago
- Pagamento de teste aprovado
- Erro / recusado / expirado

Também exibe os campos `status` e `status_detail` retornados pela Order.

IMPORTANTE:
Não faça Pix real para validar o sandbox.

A documentação oficial do Mercado Pago para Pix via Orders informa que a compra de teste é criada por requisição com valores/dados predefinidos; com `payer.first_name = APRO`, a Order nasce como `action_required / waiting_transfer` e depois deve ser atualizada automaticamente para aprovada.

Publique este ZIP como um novo deployment no mesmo projeto Cloudflare Pages.
O Secret `MERCADO_PAGO_ACCESS_TOKEN` já existente continua sendo utilizado.
