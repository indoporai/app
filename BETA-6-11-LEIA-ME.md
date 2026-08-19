# Beta 6.11 — Acesso do cliente + Jornada + Pacotes

## Correção do link por e-mail
O app agora recupera `clientId` e `tripId` também de `continueUrl`, que é a forma como
o Firebase pode transportar a URL personalizada dentro do link de login quando ele é
aberto em outro aparelho.

## Antes / Durante / Depois
As três etapas usam a MESMA viagem ativa do cliente.
- Antes: pacote, destino, roteiro e serviços.
- Durante: destino e roteiro reais, dia e locais cadastrados.
- Depois: destino, dias, lugares, álbum/filme conforme módulos e passaporte.

## Pacotes automáticos
Ao selecionar um pacote no ADM, os módulos nativos são aplicados automaticamente.

Explore:
- Roteiro
- Pagamentos
- Álbum
- Filme

Signature:
- Tudo do Explore
- Documentos
- Mala
- Check-in
- Suporte pré-embarque
- Hotel & passagens

Elite:
- Tudo do Signature
- Câmbio / Exchange
- Comunidade
- Live
- Passaporte
- Acesso full

Groups:
- Roteiro
- Pré-embarque
- Comunidade
- Live
- Álbum/Filme
- Passaporte
- Gestão de grupos

Depois de aplicar o pacote, o ADM continua podendo ligar/desligar módulos manualmente.

## Importante
Antes de testar o link do cliente, publique `FIRESTORE-RULES-BETA-6-11.txt` no Firebase.
