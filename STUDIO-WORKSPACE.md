# Studio: contas, projetos e histórico

## Entrega

- Autenticação por link de e-mail com PKCE e verificador em cookie HttpOnly.
- Sessão em cookies Secure, SameSite=Lax e restritos ao host; tokens não são enviados ao JavaScript nem gravados no localStorage.
- Projetos com planejamento completo, lista de recentes e revisão otimista para evitar sobrescrever outra sessão.
- Histórico de mensagens de texto por projeto, ainda sem respostas de IA.
- Salvar/carregar na conta é explícito. O rascunho local continua funcionando sem login.

## Banco

Projeto Supabase existente: `ogvuxjtipnxodbhqvlrd` (diretor.ai).
Migração aditiva `studio_workspace` aplicada remotamente. Tabelas `studio_projects` e `studio_messages`, RLS por proprietário, FK composta para impedir mensagens em projeto de outro usuário. Não executar `supabase_setup.sql` para esta entrega: ele pertence ao Manager e não foi aplicado.

O arquivo em `supabase/migrations/` foi criado pelo CLI oficial e contém o SQL aplicado. A versão local foi sincronizada com o histórico remoto: `20261024012832`. Não reaplicar em produção.

`api/_studio-config.js` contém URL e chave **publicável** do projeto, sem privilégio elevado. Podem ser substituídas por `STUDIO_SUPABASE_URL` e `STUDIO_SUPABASE_PUBLISHABLE_KEY`. Nenhuma chave service-role é utilizada no Studio. Isolamento é aplicado pelo banco com o token do usuário, além dos filtros de proprietário no servidor.

## Configuração de e-mail antes de liberar acesso

No Supabase Authentication → URL Configuration, autorizar os callbacks exatos:

- `https://studio.diretor.ai/studio/studio.html?view=cloud`
- `https://diretor.ai/studio/studio.html?view=cloud`
- URL de callback do preview em teste, sem wildcard de todos os projetos Vercel.

A opção experimental que acrescenta identificador de fluxo ao redirect está explicitamente desativada; as URLs de retorno são exatas, sem curingas. O verificador expira em dez minutos e o link precisa ser aberto no mesmo navegador/host que solicitou o login. Um novo pedido no mesmo navegador substitui o verificador anterior.

Conferir template de Magic Link, limites e SMTP do Supabase. Não trocar o template nem o Site URL do Manager sem avaliar o impacto. O provedor padrão pode limitar destinatários de teste; um SMTP próprio deve ser configurado antes de oferecer cadastro público.

Inspeção do painel autenticado: Site URL atual `http://localhost:3000`, sem redirects cadastrados; SMTP próprio desativado e templates padrão. Após autorização do proprietário, o painel confirmou três callbacks exatos cadastrados (Total URLs: 3). Não usar curingas na configuração desta entrega.

## Validação feita

- 20 testes automatizados: rotas legadas, isolamento na API, controle de versão, validação de dados, origem HTTPS, desafio PKCE, cookies e ausência de tokens na resposta.
- Teste transacional no banco: usuário A só lê A, não escreve mensagem de B, não transfere proprietário; mensagens próprias e incremento de revisão funcionam. Fixtures revertidas com rollback.
- Advisor de segurança Supabase sem alertas nesta etapa.
- Auditoria npm após correções compatíveis: zero vulnerabilidades reportadas.

## Validação ainda necessária

O preview foi conferido em desktop e celular, sem rolagem horizontal. API publicada: sessão anônima retorna usuário nulo, projetos sem login retornam 401 e escrita de origem externa retorna 403. A chave publicável sozinha recebe 401/42501 ao acessar as duas tabelas. Com o proprietário, ainda falta validar envio de e-mail → callback → sessão → criar projeto → enviar mensagem → recarregar → sair/entrar → recuperar histórico. Conferir em outro dispositivo usando seu próprio login. Não considerar a entrega operacional só por passar testes simulados.

IA, arquivos anexados, geração, créditos e conectores externos não fazem parte desta entrega. Não há resposta simulada apresentada como resposta de IA.

## Teste autenticado no Chrome

Após o login de Alan, a criação de Teste de acesso — Alan e a mensagem Primeiro teste de histórico foram verificadas pela interface e por consulta ao banco. Recarregar e reabrir o projeto recuperou o histórico. A aba integrada tinha outra sessão; o usuário estava autenticado no Chrome. O planejamento de exemplo anterior estava salvo apenas no navegador, o que motivou o rótulo mais explícito Salvar rascunho local.
