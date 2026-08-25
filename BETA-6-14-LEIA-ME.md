# Beta 6.14 — PACOTÃO

## Correções prioritárias
- Convite por e-mail com `tripId` agora é ESTRITO: se aquela viagem não existir/publicada, o app mostra erro e nunca abre roteiro antigo.
- Live Daily sem `max_participants: 50`, evitando erro de limite do plano.

## ADM — Roteiro inteligente
- Categorias: atração, cafeteria, restaurante, loja, parque, hotel, experiência e outro.
- Busca de lugares pronta para Google Places via `/api/places/search`.
- Seleção preenche nome, endereço, Place ID e link Maps.
- Botão Maps funciona mesmo sem API key.
- Dica Inteligente por local.
- Separação “Adicionar ao roteiro” x “Adicionar como dica”.
- Indo por Aí Network por viagem.

## Financeiro
- Uma contratação vira um plano de pagamento.
- ADM informa valor total + número de parcelas + 1º vencimento.
- Parcelas são geradas separadamente.
- Financeiro mantém “Lembrar” por parcela.

## Antes
- Carteira da Viagem.
- ADM cadastra passagem, hotel, ingresso, voucher, seguro, transfer etc.
- Passagem suporta data, horário, terminal, portão e localizador.
- Arquivo vai para Firebase Storage.
- Recomendações da rede aparecem no cliente.

## Durante / Depois
- Memórias dinâmicas pela viagem ativa (sem Portugal fixo).
- Upload de foto/vídeo usa Firebase Storage.
- Diário automático por dia usando roteiro + checks + memórias.
- Sugestões de memória contextuais.
- Prévia do filme usa as memórias reais disponíveis.

## Cloudflare — Google Maps/Places
Para autocomplete real, adicione em Settings > Variables and Secrets:
`GOOGLE_MAPS_API_KEY` = sua chave Google Maps Platform com Places API (New) habilitada.
Sem essa chave, o botão “Maps” continua abrindo a busca normal do Google Maps.

## OBRIGATÓRIO
Publique `FIRESTORE-RULES-BETA-6-14.txt` no Firestore antes de testar documentos/memórias entre aparelhos.
As regras do Firebase Storage que você já publicou continuam válidas.

## Teste recomendado
1. Deploy da 6.14.
2. Publicar regras Firestore 6.14.
3. ADM > cliente > viagem Elite.
4. Roteiro > + Lugar/dica.
5. Criar plano de pagamento 3x.
6. Adicionar passagem/documento.
7. Publicar viagem e enviar NOVO link.
8. Abrir no outro celular.
9. Validar Antes, Durante, Memórias, Concierge e Live.
