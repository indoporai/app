# Indo por Aí — Live real com Daily e Netlify

Esta versão mantém o Modelo Ideal aprovado e conecta o botão **Live** à página de teste real.

## Novos arquivos

```text
live-real.html
live-real.css
live-real.js
netlify.toml
package.json
netlify/
  functions/
    create-live-room.mjs
    join-live-room.mjs
```

## 1. Criar a conta no Daily

1. Entre no Daily.
2. Crie uma conta.
3. No painel de desenvolvedor, copie a API Key.

## 2. Configurar a chave no Netlify

No projeto do Netlify:

1. Abra **Project configuration**.
2. Entre em **Environment variables**.
3. Clique em **Add variable**.
4. Cadastre:
   - Key: `DAILY_API_KEY`
   - Value: sua chave do Daily
5. Salve.
6. Faça um novo deploy.

Nunca coloque essa chave no GitHub, HTML ou `app.js`.

## 3. Publicar

Suba todos os arquivos deste ZIP para a raiz do GitHub, mantendo a pasta `netlify/functions`.

O botão Live do aplicativo principal abrirá `live-real.html`.

## 4. Testar em dois celulares

### Celular 1 — guia

1. Abra o app.
2. Entre em **Durante**.
3. Toque no cartão **Live**.
4. Toque em **Iniciar transmissão**.
5. Toque em **Abrir câmera do guia**.
6. Autorize câmera e microfone.
7. Copie o código da transmissão.

### Celular 2 — cliente

1. Abra `https://SEU-SITE.netlify.app/live-real.html`.
2. Digite o código.
3. Toque em **Assistir transmissão**.
4. Entre como espectador.

## Segurança desta versão

- sala privada;
- token de proprietário separado;
- token de espectador;
- chave protegida em Netlify Function;
- expiração automática em duas horas;
- espectador entra com câmera e microfone desligados.
