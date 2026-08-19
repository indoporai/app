# Beta 6.11.3 — Core restaurado

Causa real do erro:
A Beta 6.11 removeu acidentalmente um bloco inteiro do app.js durante uma edição.
Foram apagadas funções essenciais como:
- ipaDB
- activeTrip
- countryFlag
- tripCountry
- tripDestination
- normalizedPlaces
- googleMapsRouteUrl
- tripModule
- showPlanDetails
- prepChecklist
- benefitsPersonalized
- openPayment / Pix
- paymentsView
- beforeView

Por isso o Firebase até podia autenticar o ADM, mas o primeiro render quebrava com:
`Can't find variable: ipaDB`.

Esta versão restaura o bloco a partir da Beta 6.10 (base estável), mantendo:
- login corrigido da 6.11.2;
- pacotes automáticos;
- Durante/Depois personalizados;
- correção do link do cliente;
- PIX Mercado Pago.

Não precisa alterar as regras do Firebase apenas por esta correção.
