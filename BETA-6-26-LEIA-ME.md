# Beta 6.26 — Roteiro Inteligente

Base: 6.25.2.

## Correção crítica
- O botão **Salvar roteiro** agora usa captura delegada no `document`, sem depender do timing de abertura do modal nem de `onclick` inline.
- O salvamento lê os lugares selecionados e os seletores de dia por comparação direta de `data-*`, evitando dependência de `CSS.escape`.

## Evoluções do roteiro
- Prévia visual por Dia 1, Dia 2, etc.
- Orçamento por pessoa com custo do roteiro, saldo ou estouro.
- Botão **Otimizar por proximidade** usando latitude/longitude do Google já salvas no Banco de Lugares.
- Selo de curadoria: Imperdível / Recomendado Indo por Aí / Opcional.
- Bloco **Por que este roteiro?** que resume os interesses e destaques escolhidos.
- O template salvo guarda custo estimado, moeda e origem no Banco de Lugares.

A otimização usa proximidade geográfica simples nesta beta; o cálculo de rota viária com tempo real pode usar a Routes API em uma próxima camada sem alterar a estrutura.
