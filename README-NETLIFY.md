# terra_Bella — publicação no Netlify

## Variáveis de ambiente (Netlify > Site configuration > Environment variables)
| Nome | O que colocar |
|---|---|
| `ADMIN_PASSWORD` | Sua NOVA senha da administração (12+ caracteres, letras, números e símbolos). Não use Dinho123. |
| `SESSION_SECRET` | Texto aleatório com 32+ caracteres (use o gerador de senhas do celular). Nunca compartilhe. |

Marque as duas como **Contains secret values**. Sem elas, o login responde "não configurado" (não existe senha padrão).

## Passo a passo
1. Crie conta gratuita em github.com e um repositório **privado** (ex.: `terra-bella`).
2. Envie TODO o conteúdo desta pasta para o repositório (Add file > Upload files). Não envie `node_modules` nem `.env`.
3. Crie conta em netlify.com (pode entrar com o GitHub) > **Add new site > Import an existing project** > GitHub > escolha `terra-bella`.
4. Build command **vazio**; Publish directory `public`; Functions `netlify/functions` (o `netlify.toml` já define isso). Clique em Deploy.
5. Cadastre as 2 variáveis acima e faça **Deploys > Trigger deploy > Clear cache and deploy site**.
6. Abra o link do site > menu (três barrinhas) > ADMINISTRAÇÃO DO CARDÁPIO > digite a senha. No primeiro acesso o cardápio é carregado no banco automaticamente.
7. Teste: pause um produto, abra o link em outro aparelho (a mudança chega em até ~30 s) e reative.
8. (Opcional) Domain management para nome próprio. O HTTPS é automático.

## Como funciona
- `public/`: site estático (idêntico ao aprovado; fotos e vídeo agora são arquivos em `img/` e `media/`).
- `netlify/functions/api.mjs`: API. Leitura do cardápio é pública; login, pausa, edição e upload exigem sessão.
- Banco: Netlify Blobs (incluso no Netlify, sem outra conta).
- Sessão: cookie HttpOnly + Secure + SameSite=Strict, válido por 2 h, revogado ao sair.
