# Beta 6.17 — integração no núcleo

Base: 6.16.1 confirmada estável.

Nesta versão o Registrar Momento grava cada foto/vídeo também na coleção de Memórias usada pelo próprio app. Com isso, Depois, os cards de Fotos/Vídeos, a Linha do Tempo por dia e o Filme passam a consumir a mesma fonte de dados.

A avaliação continua com o mesmo clique da 6.16.1; apenas foi acrescentada a visualização das estrelas ao lado do nome da atração. Nenhum handler de Ver como cliente, Avaliar ou Momento foi substituído no app.js.

Quando Firebase Storage estiver disponível, a mídia é enviada para o Storage; se falhar, há fallback local para o teste.
