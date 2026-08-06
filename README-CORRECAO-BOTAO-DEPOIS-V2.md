# Correção do botão Depois — v12

Causa identificada:
O círculo decorativo criado pelo pseudo-elemento `.mode-card::after`
ficava sobre a região direita do seletor e interceptava o toque no botão “Depois”.

Correção:
- `pointer-events: none` no elemento decorativo;
- botões e seletor posicionados acima da decoração;
- atualização da versão de CSS/JS e do Service Worker;
- nenhuma tela ou funcionalidade foi removida.
