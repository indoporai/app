# Beta 6.9 — Pix Mercado Pago em ambiente de teste

## O que entrou
- Backend seguro no Cloudflare através de `_worker.js`.
- O Access Token é lido apenas de `MERCADO_PAGO_ACCESS_TOKEN`.
- O token NÃO está no ZIP e NÃO vai para o navegador.
- Criação de Pix pela API de Orders do Mercado Pago.
- Pix Copia e Cola.
- Link/ticket do Pix de teste.
- Consulta do status da Order.
- Quando o Mercado Pago retorna aprovado, o app marca o pagamento como Pago (teste) localmente.

## Importante sobre o teste
A documentação atual do Mercado Pago exige dados predefinidos para compra Pix de teste.
Por isso a Order de sandbox é criada com R$ 50,00 e pagador de teste.
A cobrança original do Indo por Aí continua sendo mostrada separadamente.

Nenhum dinheiro real é movimentado nesta Beta.

## Deploy no Cloudflare
Esta versão usa `_worker.js` propositalmente.
O dashboard de Direct Upload do Cloudflare não compila uma pasta `functions/`,
mas suporta `_worker.js`.

Faça um NOVO deployment da Beta 6.9 depois de já ter criado o Secret:
`MERCADO_PAGO_ACCESS_TOKEN`

## Teste
1. Publique a Beta 6.9.
2. ADM > abra uma viagem > envie uma cobrança.
3. Ver como cliente > Pagamentos.
4. Abra a cobrança > Pagar com Pix.
5. O app deve mostrar “Gerando Pix de teste”.
6. Depois devem aparecer Pix Copia e Cola e/ou botão para abrir o Pix de teste.
7. Use “Verificar pagamento” para consultar a Order no Mercado Pago.

## Próxima etapa
Para produção, ainda faltam:
- credenciais produtivas;
- webhook/notification de Orders;
- atualização segura do Firestore pelo backend;
- Pix no valor real da cobrança;
- cartão real.
