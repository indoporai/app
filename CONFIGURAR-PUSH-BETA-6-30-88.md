# Indo por Aí — Configuração de notificações Push (Beta 6.30.88)

A interface de envio no ADM, o cadastro de dispositivos e o gateway seguro estão incluídos no ZIP. **O envio real fica DESATIVADO até completar esta configuração**. Não armazene credenciais privadas no site, no ZIP público ou no Firebase client-side.

## 1. Firebase

1. Console Firebase → projeto `indo-por-ai-app` → Configurações → Cloud Messaging.
2. Habilite a **Firebase Cloud Messaging API (HTTP v1)**; obtenha ou gere o par de chaves **Web Push VAPID**. Use **somente a chave pública** no frontend.
3. Em Contas de serviço, crie uma conta de serviço restrita para o gateway. Atribua as permissões de envio **Firebase Cloud Messaging API Admin** e leitura dos documentos necessários no Firestore (clientes e viagens). Armazene o JSON privado **somente** como secret do Worker.
4. Confirme que os clientes possuem identificadores Firebase (`authUid`, `uid`, `firebaseUid` ou email) em `clients` ou `participants` da viagem para permitir associação de dispositivos à viagem. O gateway verifica esse vínculo no Firestore antes de associar a assinatura à viagem; sem vínculo, o dispositivo poderá receber apenas disparos gerais.

## 2. Cloudflare Worker

Dentro de `cloudflare-push-worker/` há `worker.js` e `wrangler.toml`.

1. Crie uma namespace **Workers KV** para armazenar tokens de dispositivos e substitua `SUBSTITUA_PELO_ID_DA_KV` pelo ID real em `wrangler.toml`.
2. Publique o Worker no Cloudflare, preferencialmente em `https://push.indoporaicomagente.com` ou outra URL HTTPS controlada por você.
3. Configure o secret `GOOGLE_SERVICE_ACCOUNT_JSON` no painel de Worker → Settings → Variables and Secrets. Cole o JSON da conta de serviço, sem expô-lo nos arquivos do site.
4. **Não** atribua esse Worker como rota sobre todas as páginas do PWA; ele tem endpoints próprios `/subscribe` e `/send`.
5. Valide os endpoints com um navegador autenticado e os logs do Worker. O gateway exige o ID token real do Firebase e verifica o UID administrativo no servidor; visitantes não podem disparar notificações.

## 3. App Cloudflare Pages

Edite o arquivo **`push-config.js`** no diretório principal do app:

```js
window.IPA_PUSH_CONFIG = {
  workerUrl: 'https://push.indoporaicomagente.com',
  vapidPublicKey: 'SUA_CHAVE_VAPID_PUBLICA'
};
```

**Atenção:** `vapidPublicKey` não é a API key do Firebase. Nunca copie `GOOGLE_SERVICE_ACCOUNT_JSON` para `push-config.js`.

Publique o site. No iPhone, para Web Push, o app deve estar adicionado à Tela de Início e a permissão deve ser pedida por um gesto do cliente. Em Android e navegadores compatíveis, o cliente também deve tocar **Ativar notificações** e aceitar a permissão. Em seguida, o dispositivo é registrado no Worker. Não há solicitação automática de permissão.

## 4. Disparo pelo ADM

Abra **Business → 🔔 Notificações**. Escolha **Todos os dispositivos autorizados** ou **Clientes de uma viagem**, digite título e mensagem e confirme. O botão só é habilitado quando a configuração pública foi preenchida. O servidor é responsável por aceitar/rejeitar o envio, contando sucessos e falhas de chamadas FCM; isso **não garante leitura nem entrega visual** no aparelho.

A primeira versão da central realiza **disparo manual imediato**. Alertas automáticos por evento/horário, histórico persistente de campanhas, preferências granulares, retentativas e segmentação avançada exigem trabalho adicional. O painel não executa automações sozinho.

## 5. Testes de aceitação

- iPhone PWA instalado na tela inicial e Android PWA: solicite permissão com toque explícito e confira o retorno da API.
- Com dois usuários diferentes, confirme que ambos precisam se cadastrar e que o ADM não pode enviar se não estiver autenticado.
- Envie primeiro push geral de teste; confira o resultado no ADM e a exibição real no aparelho com o app aberto e fechado.
- Confirme que o filtro por viagem inclui apenas assinantes cuja ligação foi comprovada pelo servidor.
- Teste tokens expirados, bloqueio de notificações, logs, revogação de permissão e repetição de cadastro. O gateway elimina tokens marcados como `UNREGISTERED` ou `NOT_FOUND`.
- Teste cartão Avião/Trem/Ônibus/Barco e mudanças de etapa Lisboa/Porto, inclusive datas repetidas, antes de publicar aos clientes.

## Segurança operacional

O gateway limita 500 destinatários por disparo e exige conta Firebase ADM para enviar. Revise regras, permissões e quota. Para uso em escala, adicione fila, logs de auditoria, política de exclusão de tokens e mecanismos de retirada do consentimento. O envio real não foi testado nesta geração porque as credenciais não estão disponíveis neste ambiente.
