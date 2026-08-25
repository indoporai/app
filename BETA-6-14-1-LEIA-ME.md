# Beta 6.14.1 — WhatsApp + data de embarque

## Ajustes
- “Quero viajar com o Indo por Aí” abre o WhatsApp do atendimento.
- O número fica configurado no Cloudflare em `WHATSAPP_NUMBER`.
- Mensagem inicial automática: “Olá! Vim pelo app Indo por Aí e quero planejar minha próxima viagem.”
- Card Embarque no Antes agora mostra `dd/mm` (ex.: `05/09`).

## Cloudflare
Settings > Variables and Secrets > Add variable
- Nome: `WHATSAPP_NUMBER`
- Tipo: Text
- Valor: DDI + DDD + número, somente dígitos. Ex.: `5511999999999`

## Google autocomplete
A Beta 6.14 já está preparada para:
- Secret `GOOGLE_MAPS_API_KEY`
- Places API (New)
- busca `/api/places/search`

Depois de configurar a chave e fazer novo deployment, ao digitar “Torre Eiffel” no ADM o app mostrará sugestões de lugar/endereço.
