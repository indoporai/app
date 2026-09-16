# Beta 6.28 — Gestão completa do ADM

Implementado sobre a 6.27, preservando a estrutura visual aprovada.

## Clientes e pedidos
- Pedido do “Quero viajar” também cria cliente em `Aguardando aprovação`.
- Cadastro manual pelo ADM continua disponível.
- Cliente possui pacote e tipo: Titular/Acompanhante.
- Limites de acesso: Explore 1, Signature 3, Elite 5, Groups ilimitado.
- Quantidade de viajantes permanece independente da quantidade de acessos.
- Editar cliente e aprovar/liberar acesso.
- Na aprovação, escolha de aviso por e-mail, WhatsApp ou ambos.
- Reenvio de acesso disponível após aprovação.

## Roteiros
- ADM exibe Criação inteligente e Criação manual.
- Inteligente parte de Pedidos e Banco de Lugares; continua interna até revisão.
- Manual mantém o construtor da 6.27 e o otimizador por proximidade.
- Edição de metadados do roteiro habilitada.

## Banco de Lugares
- Edição de nome, cidade, país, custo, prioridade e dica.
- Roteiros já criados preservam sua cópia dos lugares; editar o catálogo não os altera retroativamente.

## Comunicação
- WhatsApp usa mensagem controlada pelo app.
- O e-mail de acesso continua usando o link seguro (magic link) do Firebase Authentication. O corpo visual/textual desse e-mail é configurado no template de e-mail do Firebase; o app não consegue substituir o corpo do template via `sendSignInLinkToEmail`.
