# Beta 6.28.3 — Entre no Clima com IA

- Mantém a Beta 6.28.2 como base.
- ADM > Viagem ganhou **Gerar com IA** no bloco Entre no Clima.
- Gera e salva 6 blocos por destino: filme/série, playlist, livro, expressão local, prato típico e curiosidade.
- A geração usa IA com busca web pelo Worker; o conteúdo fica congelado na viagem no Firebase.
- O ADM pode **Gerar novamente** e **Editar** título, descrição e link de cada item.
- O cliente passa a ler `trip.climateContent`; não depende mais do conteúdo genérico quando já existe conteúdo gerado.
- Links só são exibidos quando a geração retorna um URL válido.

## Configuração Cloudflare necessária
Crie um segredo no projeto Pages/Worker:

`OPENAI_API_KEY`

Nunca coloque essa chave no JavaScript do navegador. O Worker faz a chamada no servidor.
