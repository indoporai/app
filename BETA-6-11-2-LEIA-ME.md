# Beta 6.11.2 — Login ADM corrigido

Causa encontrada:
o `login()` disparava `notify()` imediatamente ao mudar para `signing-in`.
Esse evento fazia `render()` recriar o formulário durante a própria autenticação.
Na prática o botão ficava reaparecendo em “Entrando...” e dava a impressão de looping.

Correção:
- não há mais re-render no meio do signInWithEmailAndPassword;
- depois do Firebase autenticar, o painel ADM é aberto diretamente;
- o UID do administrador é validado antes de liberar o painel;
- watchdog de 12 segundos impede botão preso;
- sincronização com Firestore continua depois pelo onAuthStateChanged.

Não precisa alterar regras do Firebase para esta correção.
