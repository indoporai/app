# Beta 6.25.2 — Hotfix salvar lugares no novo roteiro

Correção pontual no ADM > Roteiros > Montar roteiro:
- O botão agora chama diretamente um salvador global, sem depender do tempo de bind do modal.
- Os lugares marcados são lidos novamente do Banco de Lugares no momento do clique.
- O dia escolhido para cada lugar é validado e limitado ao total de dias do roteiro.
- O app confirma quantos lugares foram gravados antes de fechar a janela.
- O salvamento local ocorre antes da sincronização Firebase.

A estrutura aprovada do app não foi alterada.
