# Indo por Aí — Beta 6

## Principais mudanças
- Cliente autenticado passa a carregar sua experiência a partir do Firestore.
- O primeiro acesso vincula o Firebase UID ao cadastro do cliente.
- Cliente abre no modo **Antes** e recebe somente suas viagens publicadas.
- Destino e país separados no cadastro da viagem.
- Bandeira dinâmica por país.
- ADM escolhe pacote contratado.
- ADM cria dias de roteiro.
- ADM adiciona locais em cada dia com horário, endereço, nota e Place ID opcional.
- Roteiro salvo no Firestore junto com a viagem.
- Tela Minha Viagem usa o roteiro cadastrado.
- Mapa do dia gera pins dinamicamente a partir do roteiro.
- Botão abre a rota real no Google Maps usando os locais cadastrados.
- Biblioteca ganhou cadastro de novo modelo de roteiro.

## Antes de testar o cliente
Publique as regras do arquivo `FIRESTORE-RULES-BETA-6.txt` em:
Firebase > Firestore Database > Regras.

## Ordem de teste
1. Entre no ADM.
2. Cadastre um cliente com e-mail real.
3. Crie uma viagem para ele, escolhendo destino, país e pacote.
4. Entre na viagem e adicione dias e locais.
5. Publique a viagem.
6. Envie o acesso por e-mail.
7. Abra o link como cliente.
8. O app deve abrir em **Antes** e mostrar a viagem/roteiro personalizados.

## Observação
Álbum real e filme com mídia ainda não entram nesta Beta. Essa próxima etapa requer ativação do Firebase Storage.
