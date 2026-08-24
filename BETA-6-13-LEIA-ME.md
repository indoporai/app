# Beta 6.13 — Jornada viva + Concierge Elite + Live

## Incluído
- Check do roteiro funcional.
- Avaliação por estrelas e comentário funcional.
- Modo Depois liberado durante a viagem.
- Fotos e vídeos podem ser adicionados enquanto a viagem acontece.
- Sugestões guiadas de memória: brinde, turma, sabor, vista, espontâneo e favorito.
- Elite recebe módulo Concierge nativo.
- Concierge aceita pedidos de restaurante, ingresso, compras, transporte, experiências e outros.
- Live Daily foi portada de Netlify Functions para Cloudflare Pages/Worker.

## Configurar a Live
No Cloudflare do app:
Settings > Variables and Secrets > Add
Nome: DAILY_API_KEY
Tipo: Secret
Valor: API key da sua conta Daily.

Depois faça um novo deployment da Beta 6.13.

Teste:
1. Entre como cliente Elite.
2. Durante > Live.
3. No celular do guia: Iniciar transmissão.
4. Copie o código.
5. Em outro aparelho: informe o código > Assistir transmissão.

## Observação sobre fotos/vídeos
Nesta Beta, o upload de mídia é funcional no aparelho/browser de teste. A próxima etapa para mídia persistente entre aparelhos é ligar Firebase Storage; não foi habilitado automaticamente para não exigir novas regras/segredos sem sua configuração.
