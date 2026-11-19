# Indo por Aí — Beta 6.30.62: ativação segura do Viajar Juntos

## Antes de ativar

A publicação do código **não altera automaticamente as regras do seu projeto Firebase**. Não é possível validar a configuração real apenas com o ZIP. A API de fotos continua bloqueada (`503`) até que um administrador confirme as regras e habilite a variável no Cloudflare.

O aplicativo usa a conta de serviço do Cloudflare (`indo-por-ai-convites@indo-por-ai-app.iam.gserviceaccount.com`) para ler e escrever a coleção `sharedTripMedia`. Essa conta **já precisou** do papel `Cloud Datastore User` para a conciliação PIX. Não gere nem envie outra chave privada.

## Firestore: revisar regras atuais

1. Abra **Firebase Console → projeto indo-por-ai-app → Firestore Database → Regras**.
2. **Faça backup das regras atuais** antes de qualquer mudança.
3. Garanta que a coleção **`sharedTripMedia`** **não pode ser lida ou escrita diretamente por nenhum aplicativo cliente**, inclusive usuários autenticados. Se houver `match /{document=**}` com acesso abrangente, ajuste-o — um `allow false` adicional **não bloqueia** outro `allow true` que também corresponda ao caminho.
4. Se as regras existentes tiverem escopo restrito por coleção, inclua o trecho do arquivo `FIRESTORE-VIAJAR-JUNTOS-TRECHO.rules` **dentro** de `match /databases/{database}/documents`.
5. Na ferramenta de simulação, teste as operações **get, list, create, update, delete** para `sharedTripMedia/teste` com login de Rosa, Juliana, um terceiro viajante e sem login. Todas devem ser negadas no acesso direto. O Worker autentica o viajante e aplica as permissões antes de consultar com a conta de serviço.
6. Confirme também que a coleção **`trips`** e os campos `travelTogetherPlans` só podem ser modificados pelo ADM. Usuários clientes não devem poder adicionar participantes/grupos por alteração direta do Firestore.
7. **Não substitua o arquivo inteiro de regras** pelo trecho isolado: isso pode quebrar login, memórias, PIX e outras funcionalidades.

Documentação oficial: https://firebase.google.com/docs/firestore/security/rules-structure e https://firebase.google.com/docs/firestore/security/insecure-rules

## Cloudflare: ativação após validar

1. Publique o ZIP no projeto **Pages `app`** do Cloudflare.
2. Valide que o projeto usa `FIREBASE_SERVICE_ACCOUNT_JSON` existente (sem compartilhar a chave).
3. **Somente depois de publicar e testar as regras**: em Pages `app` → Settings → Variables and Secrets → Production, adicione `SHARED_TRIPS_RULES_CONFIRMED` com valor literal `true`. Publique novamente, se necessário para as variáveis entrarem em vigor.
4. Sem a variável, a tela “Nossas memórias compartilhadas” mostra que o compartilhamento está aguardando a validação do Firebase. O cadastro de destinos no ADM já pode ser feito.

## Fluxo de uso

1. Em ADM → Viagens → Rosa → Viajar Juntos, selecione **Juliana** e marque **Dublin, Luxemburgo, Amsterdã etc.** individualmente. Salve os destinos.
2. Juliana deve ter **conta própria**, uma viagem publicada com os dias desses destinos e login válido.
3. Uma foto/vídeo pessoal é enviada **normalmente** ao álbum da própria pessoa; só então, no detalhe do dia, ela escolhe **Compartilhar com grupo** e seleciona o destino.
4. Em Memórias → **Nossas memórias compartilhadas**, ambas poderão ver **somente as publicações consentidas** dos destinos autorizados. A autora pode clicar **Deixar de compartilhar**; a foto original continua privada.
5. Caso não haja país/cidade/data que identifique o dia da mídia, a publicação é negada: classifique o dia no ADM, em vez de permitir acesso amplo.

## Testes de segurança obrigatórios antes de usar com clientes reais

- Juliana **não** vê o Marrocos da Rosa, nem documentos, financeiros, conversas privadas ou fotos não publicadas.
- Rosa vê as fotos autorizadas de Dublin/Luxemburgo que Juliana publicou, e vice-versa.
- Um terceiro cliente não consegue consultar arquivos ou álbuns de outros grupos.
- Ao desmarcar Luxemburgo, ele desaparece do acesso compartilhado.
- Ao remover uma foto do compartilhamento, ela deixa de ser entregue pela API, sem apagar a memória pessoal.
- Ao acessar a API sem ID token ou com token de outro usuário, recebe erro de autorização.
- Os downloads são entregues por proxy autenticado no Cloudflare. A URL original do Firebase Storage não é repassada na listagem de mídias.

## Limitações deliberadas desta versão

- A sincronização de fotos é **voluntária**, não automática; ninguém recebe fotos privadas de forma retroativa.
- O roteiro cronológico de cada cliente continua independente. A galeria mostra os destinos compartilhados, **não unifica automaticamente o roteiro oficial**.
- O chat de grupo existente não foi mesclado entre duas viagens; o Mochilito e os documentos permanecem individuais.
- Para alterar/revogar permissões em produção, confirme as regras atuais no Console; o ZIP não pode publicar regras remotamente.
- A API lista grupos e mídias no servidor com paginação limitada para segurança; uma operação com base maior pode exigir otimização de índices/consultas.
