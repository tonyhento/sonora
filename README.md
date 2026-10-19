# SONORA® — Beyond Vision

E-commerce conceitual de óculos futuristas, **full-stack**: front-end em **HTML, CSS e JavaScript puros** e back-end em **Node.js + Express + PostgreSQL**, com contas de usuário, login e histórico de pedidos.

> Projeto de estudo. A marca e os produtos são fictícios. O pagamento com cartão usa o **Stripe em modo de teste**: nenhuma cobrança real é feita.

<!-- Depois de publicar, troque pelo link real e adicione um print ou GIF:
🔗 **Demo:** https://sonora.onrender.com
![Preview do SONORA](public/assets/preview.gif)
-->

---

## Funcionalidades

**Loja**
- Catálogo **vindo do banco de dados** (rota `/api/products`), com filtro por série, ordenação por preço e favoritos
- Página de produto dinâmica (`produto.html?id=N`) com galeria em carrossel arrastável
- **Estoque**: selos "Últimas unidades" e "Esgotado", aviso de quantas unidades restam, e a sacola nunca passa do que existe. O estoque é reservado no pedido e volta se o pagamento expirar ou o pedido for cancelado
- **Política de privacidade** (`privacidade.html`, LGPD) com link no rodapé de todas as páginas
- Sacola lateral em todas as páginas, sincronizada entre abas
- Fundo animado da hero em **WebGL** (shader GLSL) que reage ao cursor
- Site em **português e inglês**: botão **PT / EN** no cabeçalho troca textos, descrições dos produtos, formato de preços e datas e até as mensagens de erro do servidor — na hora, sem recarregar, e a escolha fica salva

**Contas e pedidos**
- Cadastro, login e logout com **sessão em cookie** guardada no PostgreSQL
- Perfil editável e troca de senha (desconecta os outros dispositivos)
- **Excluir conta** (LGPD): pede a senha e uma confirmação; apaga a conta, a sacola e os favoritos e desconecta todos os aparelhos. Os pedidos ficam registrados, sem ligação com a conta
- **Sacola e favoritos salvos na conta**: somem do navegador ao sair e voltam ao entrar, em qualquer aparelho; a sacola de visitante se junta à da conta no login
- Checkout que salva o pedido no banco, com ou sem login
- **Pagamento com cartão pelo Stripe Checkout (modo de teste)**: o cliente paga na página segura do Stripe e o pedido só é confirmado depois que o servidor confere o pagamento com o Stripe. Pix e boleto são simulados
- **Conferência automática dos pagamentos**: a cada 5 minutos o servidor pergunta ao Stripe pelos pedidos no cartão que ficaram parados. Pago (o cliente fechou a aba antes de voltar) → confirma e envia o e-mail; expirado (desistiu) → o pedido perde o efeito e o estoque volta. Funciona mesmo sem webhook
- **E-mail de pedido confirmado** (itens, endereço, total), no idioma em que a compra foi feita. No cartão, só sai depois que o Stripe aprova
- **Recuperação de senha por e-mail**: link de uso único, válido por 1 hora; ao trocar a senha, todos os aparelhos saem da conta

**Painel administrativo** (`admin.html`, só para contas admin)
- **Visão geral:** faturamento (total e últimos 30 dias), pedidos vendidos, ticket médio, pedidos a enviar, clientes e os mais vendidos
- **Pedidos:** busca por número, nome ou e-mail, filtro por status e mudança de status (enviado → entregue, ou cancelado). O cliente vê a mudança em "Meus pedidos" e recebe um e-mail
- **Produtos:** lista compacta, 20 por vez, com busca por código, nome ou série e filtro "à venda / fora de linha" — pensada para centenas de produtos. Clicando num produto, uma janela edita tudo: dados, "à venda", textos em português e inglês, especificações e fotos (enviar, reordenar, escolher a capa, descrição de cada foto e remover); a loja mostra a mudança na hora
- **Tradução automática:** os textos são escritos em português; no bloco em inglês, "↻ Traduzir do português" preenche a tradução na hora para você conferir (com "Desfazer"). Num produto novo, se o inglês ficar em branco, ele é traduzido sozinho ao criar
- **Estoque:** campo "Estoque" em cada produto (em branco = sem controle); a lista mostra "12 em estoque" ou "Esgotado"
- **Novo produto:** "+ Novo produto" cria o modelo como rascunho (fora de linha); depois de enviar pelo menos uma foto, é só marcar "À venda". Ele entra sozinho na vitrine, na página de produto e no rodapé
- **Histórico de pedidos** com itens, endereço, pagamento e totais
- Busca de endereço pelo CEP na API pública [ViaCEP](https://viacep.com.br)

---

## Tecnologias

| Camada | Tecnologias |
|---|---|
| Front-end | HTML, CSS, JavaScript (sem frameworks), WebGL |
| Back-end | Node.js 20+, Express 5 |
| Banco de dados | PostgreSQL (administrado pelo pgAdmin 4) |
| Segurança | bcrypt, express-session + connect-pg-simple, Helmet (CSP), express-rate-limit, Zod |

---

## Como rodar no seu computador

**Pré-requisitos:** [Node.js](https://nodejs.org) 20 ou mais recente e PostgreSQL rodando (com pgAdmin 4).

### 1. Criar o banco no pgAdmin 4
1. Em **Servers → PostgreSQL → Databases**, clique com o botão direito → **Create → Database…**
2. Nome: `sonora` → **Save**
3. Selecione o banco `sonora` e abra **Tools → Query Tool**
4. Abra o arquivo `database/schema.sql` (ícone de pasta) e execute com **F5**

### 2. Criar o `.env`
1. Faça uma cópia do arquivo `.env.example` e renomeie a cópia para `.env`
2. Em `PGPASSWORD`, coloque a **senha do seu PostgreSQL** (a mesma que você usa no pgAdmin)
3. Em `SESSION_SECRET`, cole um texto longo e aleatório. Para gerar um:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

> O `.env` guarda senhas: ele está no `.gitignore` e nunca deve ir para o GitHub.

### 3. Instalar e iniciar
No terminal, dentro da pasta do projeto:

```bash
npm install
npm run dev
```

Abra **http://localhost:3000**. O `npm run dev` reinicia o servidor sozinho a cada alteração no código.

> ⚠️ O site agora precisa do servidor: abrir o `index.html` direto no navegador não funciona mais para login e pedidos.

### 4. Pagamento com cartão (Stripe, modo de teste) — opcional
Sem esta etapa o site funciona normalmente com Pix e boleto; só o cartão avisa que não está configurado.

1. Crie uma conta gratuita em [stripe.com](https://stripe.com) (não precisa enviar documentos para usar o modo de teste)
2. No painel do Stripe, deixe ligado o **modo de teste** (Test mode) e abra **Developers → API keys**
3. Copie a **Secret key** (começa com `sk_test_`) e coloque no `.env`:

```
STRIPE_SECRET_KEY=sk_test_...
```

4. Reinicie o servidor (`npm run dev`)

No checkout, escolha **Cartão de crédito** e, na página do Stripe, use o cartão de teste **4242 4242 4242 4242**, qualquer data futura e qualquer CVC. Outros cartões de teste (recusado, autenticação 3D Secure...) estão na [documentação do Stripe](https://docs.stripe.com/testing).

> O servidor **recusa chaves reais** (`sk_live_`): neste projeto, o cartão funciona só em modo de teste.

**Webhook (opcional):** avisa na hora quando um pagamento é concluído ou expira. Sem ele, o servidor confere sozinho a cada 5 minutos (então o pedido é confirmado do mesmo jeito, só que alguns minutos depois). Localmente, instale a [Stripe CLI](https://docs.stripe.com/stripe-cli) e rode:

```bash
stripe listen --forward-to localhost:3000/api/payments/webhook
```

Ela mostra um segredo `whsec_...`: coloque em `STRIPE_WEBHOOK_SECRET` no `.env` e reinicie o servidor.

### 5. Acesso ao painel administrativo
1. Crie sua conta pelo site (Entrar → Criar conta)
2. No terminal, na pasta do projeto: `npm run admin -- seu@email.com`
3. Entre de novo e abra **Minha conta → Painel admin** (ou `http://localhost:3000/admin.html`)

Para tirar o acesso: `npm run admin -- seu@email.com --remove`. O mesmo vale direto no pgAdmin: `UPDATE users SET role = 'admin' WHERE email = 'seu@email.com';`

### 6. E-mails (recuperação de senha e pedidos) — opcional
Sem configurar nada, os e-mails **não são enviados**: cada um é salvo como arquivo `.html` na pasta `outbox/` do projeto, e o terminal mostra o caminho. É só abrir o arquivo no navegador para ver o e-mail (e clicar no link de nova senha, por exemplo). A pasta está no `.gitignore`.

Para enviar de verdade, preencha o SMTP no `.env`. Exemplos:

- **[Mailtrap](https://mailtrap.io)** (caixa de teste, nada chega a pessoas reais): copie host, porta, usuário e senha do "Email Testing" para `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER` e `SMTP_PASS`
- **Gmail**: `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=465`, `SMTP_SECURE=true`, seu e-mail em `SMTP_USER` e uma **senha de app** (não a senha normal) em `SMTP_PASS`. A senha de app é criada em *Conta Google → Segurança → Verificação em duas etapas → Senhas de app*

### 7. Tradução automática no painel — opcional
Sem configurar nada, o painel usa o **tradutor embutido do navegador** (Chrome ou Edge no computador). Ele roda no próprio PC, é grátis e não precisa de chave; na primeira vez o navegador baixa o idioma (o painel mostra o progresso).

Para usar o **DeepL** (tradução melhor e em qualquer navegador):
1. Crie uma conta em [deepl.com](https://www.deepl.com/pro-api) no plano **DeepL API Free** (500 mil caracteres por mês)
2. Em **Conta → Chaves de API**, copie a chave (termina com `:fx`)
3. Coloque no `.env`: `DEEPL_API_KEY=sua-chave` e reinicie o servidor

Sem nenhum dos dois, o botão de tradução some e o inglês é escrito à mão.

---

## API

| Método | Rota | Login | Descrição |
|---|---|:---:|---|
| `POST` | `/api/auth/register` | — | Cria a conta e já entra |
| `POST` | `/api/auth/login` | — | Entra com e-mail e senha |
| `POST` | `/api/auth/logout` | — | Sai |
| `GET` | `/api/products` | — | Catálogo: produtos ativos com textos em PT e EN e fotos |
| `GET` | `/api/auth/me` | — | Usuário logado (ou `null`) |
| `POST` | `/api/auth/forgot-password` | — | Envia o link de nova senha (responde igual exista ou não a conta) |
| `POST` | `/api/auth/reset-password` | — | Cria a nova senha com o código do link |
| `PATCH` | `/api/users/me` | ✓ | Atualiza nome e celular |
| `PATCH` | `/api/users/me/password` | ✓ | Troca a senha |
| `DELETE` | `/api/users/me` | ✓ | Exclui a conta (`{ password }`) |
| `POST` | `/api/orders` | — | Cria um pedido e reserva o estoque (cartão: devolve também `paymentUrl`, a página do Stripe). Sem estoque suficiente: `409` |
| `POST` | `/api/payments/confirm` | — | Volta do Stripe: confere a sessão de pagamento e confirma o pedido |
| `POST` | `/api/payments/webhook` | — | Avisos assinados do Stripe (pago, expirado) |
| `GET` | `/api/admin/summary` | admin | Números da visão geral |
| `GET` | `/api/admin/orders` | admin | Pedidos (`?status=&search=&limit=&offset=`) |
| `PATCH` | `/api/admin/orders/:number` | admin | Muda o status (`shipped`, `delivered`, `cancelled`) |
| `GET` | `/api/admin/products` | admin | Produtos (`?status=&search=&limit=&offset=`) |
| `GET` | `/api/admin/products/series` | admin | Séries já usadas (sugestões do formulário) |
| `POST` | `/api/admin/products` | admin | Cria um produto (sempre como rascunho, fora de linha) |
| `PUT` | `/api/admin/products/:id` | admin | Salva tudo: dados, à venda, textos PT/EN e a galeria (ordem, descrições, remoção) |
| `POST` | `/api/admin/products/:id/images` | admin | Envia uma foto (o corpo é o próprio arquivo JPG, PNG ou WebP, até 5 MB) |
| `GET` | `/api/admin/translate` | admin | Tradução pelo servidor disponível? (`deepl` ou `null`) |
| `POST` | `/api/admin/translate` | admin | Traduz uma lista de textos (`{ from, to, texts }`) pelo DeepL |
| `GET` | `/api/orders` | ✓ | Pedidos do usuário |
| `GET` | `/api/orders/:number` | ✓ | Um pedido do usuário |
| `GET` / `PUT` | `/api/cart` | ✓ | Lê / substitui a sacola salva na conta |
| `POST` | `/api/cart/merge` | ✓ | Junta a sacola de visitante com a da conta |
| `GET` / `PUT` | `/api/favorites` | ✓ | Lê / substitui os favoritos da conta |
| `POST` | `/api/favorites/merge` | ✓ | Junta os favoritos de visitante com os da conta |

Erros seguem um formato único: `{ "error": "mensagem", "fields": { "campo": "mensagem" } }`.

---

## Banco de dados

```
users ──< orders ──< order_items >── products ──< product_translations
users ──< cart_items >── products ──< product_images
users ──< favorites  >── products
users ──< password_resets   (links de nova senha)
session  (sessões de login)
```

- **users** — conta do cliente; senha guardada só como hash bcrypt; `role` = `customer` ou `admin`. Ao excluir a conta, sacola, favoritos e links de senha saem junto (`ON DELETE CASCADE`) e os pedidos ficam sem dono (`ON DELETE SET NULL`)
- **products** — o catálogo: código, nome, série, preço e estoque (o `id` vem da sequência `products_id_seq`, usada pelos produtos criados no painel). O servidor calcula o total do pedido com estes preços, nunca com valores vindos do navegador. `stock` = unidades à venda (`NULL` = sem controle, `0` = esgotado): o pedido desconta dentro da mesma transação, só se houver unidades (dois clientes não compram a última peça ao mesmo tempo); pagamento expirado ou pedido cancelado devolve
- **product_translations** — textos de cada produto em português (`pt`) e inglês (`en`)
- **product_images** — fotos da galeria, na ordem de exibição (a posição 1 é a capa)
- **orders / order_items** — o item guarda nome e preço da época da compra, então o histórico não muda se o catálogo mudar. Pedidos no cartão começam como `awaiting_payment` e só viram `confirmed` depois do pagamento; os não pagos (`awaiting_payment`, `payment_expired`) não aparecem no histórico
- **cart_items / favorites** — sacola e favoritos de cada conta
- **session** — sessões de login (criada para o `connect-pg-simple`)
- **password_resets** — links de nova senha: guarda só o hash do código, a validade e quando foi usado

---

## Segurança

- Senhas com **bcrypt** (12 rounds) e login com tempo constante — não revela quais e-mails têm conta
- Cookie de sessão `httpOnly` + `sameSite=lax` (e `secure` em produção); ID de sessão renovado no login contra *session fixation*
- **Limite de tentativas** no login/cadastro e na criação de pedidos
- Todo dado recebido é validado com **Zod**; SQL sempre parametrizado (sem SQL injection)
- **Content Security Policy** via Helmet; textos digitados por usuários são escapados antes de ir para o HTML (sem XSS)
- Redirecionamento pós-login só para páginas do próprio site (sem *open redirect*)
- Usuário só acessa os próprios pedidos
- **Painel admin:** toda rota `/api/admin` confere no banco, a cada requisição, se a conta é admin (o papel não fica guardado na sessão: tirar o acesso vale na hora). A página só esconde o painel; quem bloqueia é o servidor
- **Envio de fotos:** só JPG, PNG e WebP, conferidos pelo conteúdo do arquivo (não pelo nome nem pelo tipo informado), até 5 MB e 8 fotos por produto. O nome do arquivo é gerado pelo servidor, e a galeria salva só aceita fotos que já são daquele produto (não dá para apontar para outro arquivo do servidor). Produto sem foto não pode ficar à venda
- **Tradução:** a chave do DeepL fica só no servidor (o navegador nunca a vê); só admins traduzem, com limite de pedidos por minuto e de tamanho do texto
- **Excluir conta:** exige a senha atual (com limite de tentativas) e encerra as sessões em todos os aparelhos
- Textos cadastrados no painel são escapados antes de ir para o HTML da loja (cards, sacola, checkout)
- Mudança de status só segue o caminho permitido (confirmado → enviado → entregue, ou confirmado → cancelado), conferido no próprio `UPDATE`: dois admins ao mesmo tempo não conseguem, por exemplo, entregar um pedido cancelado
- **Pagamento:** o cartão é digitado só na página do Stripe, nunca passa pelo SONORA. O valor da sessão vem dos preços do banco, e o pedido só é confirmado depois que o servidor consulta o Stripe e confere status e valor pago. O webhook só é aceito com assinatura válida
- Só chaves de **teste** do Stripe são aceitas (o servidor não inicia com uma chave real)
- **Nova senha:** o código do link é aleatório (256 bits) e o banco guarda só o hash SHA-256 dele. Vale 1 hora e uma única vez; pedir a nova senha não revela se o e-mail tem conta; limite de pedidos por IP e intervalo mínimo entre links da mesma conta; ao redefinir, todas as sessões da conta são encerradas
- E-mails montados no servidor com os dados escapados (o nome ou o endereço digitado não vira HTML)
- Links dos e-mails usam só o endereço configurado (`PUBLIC_URL`), nunca o cabeçalho `Host` da requisição — evita o ataque *password reset poisoning*, em que um Host falso faria o e-mail verdadeiro levar a vítima a outro site

---

## Decisões técnicas

| Decisão | Por quê |
|---|---|
| **Stripe Checkout (página do Stripe)** | Em vez de um formulário de cartão próprio, o cliente paga na página do Stripe: menos código, nenhum dado de cartão no servidor e suporte a 3D Secure pronto. A confirmação acontece no servidor (retorno + webhook), nunca confiando no navegador. |
| **Sessão em cookie em vez de JWT** | Para um site com páginas próprias, é mais simples e seguro: o cookie `httpOnly` não pode ser lido por JavaScript e a sessão pode ser encerrada no servidor (ex.: ao trocar a senha). |
| **Camadas no servidor** (rotas → repositórios → banco) | As rotas tratam HTTP; todo SQL fica nos repositórios. Fica fácil testar e trocar partes. |
| **Preço calculado no servidor** | O navegador só envia `id` e quantidade; nome e preço vêm da tabela `products`. |
| **Catálogo com fonte única no banco** (`/api/products`) | Preço, textos e fotos ficam só no PostgreSQL. O site e o cálculo dos pedidos leem da mesma fonte, então o preço mostrado é sempre o preço cobrado. A API manda PT e EN juntos, e a troca de idioma não faz nova busca. |
| **Eventos customizados** (`sonora:cart-change`, `sonora:auth-change`...) | Os dados não conhecem a interface; cada componente escuta e se atualiza. |
| **Sacola local + sincronização com a conta** (`account-sync.js`) | A sacola responde na hora (localStorage) e é salva na conta em segundo plano. Uma marcação de "dono" impede que os dados de uma conta apareçam para outra pessoa no mesmo navegador. |
| **Idiomas sem biblioteca** (`public/i18n.js` + `server/lib/i18n.js`) | Um dicionário PT/EN. No HTML, os textos são marcados com `data-i18n="chave"`; no JavaScript, `Sonora.i18n.t("chave")`. O servidor guarda só chaves e responde no idioma do cabeçalho `Accept-Language`. |
| **Scripts clássicos com `defer` + namespace `window.Sonora`** | Sem etapa de build: o servidor entrega os arquivos como estão. |

---

## Estrutura

```
sonora/
├── public/                  # Front-end (servido pelo Express)
│   ├── index.html           # Home
│   ├── produto.html         # Página de produto (?id=N)
│   ├── checkout.html
│   ├── login.html           # Entrar / criar conta
│   ├── redefinir-senha.html # Esqueci a senha / nova senha
│   ├── admin.html           # Painel administrativo
│   ├── privacidade.html     # Política de privacidade (LGPD)
│   ├── conta.html           # Perfil e senha
│   ├── pedidos.html         # Histórico de pedidos
│   ├── 404.html
│   ├── i18n.js              # Idiomas: dicionário PT/EN e botão PT / EN
│   ├── *.css, *.js
│   └── assets/
│       ├── brand/
│       ├── products/<modelo>/<ordem>-<ângulo>.jpg
│       └── unassigned/
│
├── server/                  # Back-end
│   ├── index.js             # Inicia o servidor
│   ├── app.js               # Express: segurança, sessão, rotas, arquivos
│   ├── config.js            # Variáveis do .env
│   ├── db.js                # Conexão com o PostgreSQL
│   ├── schemas.js           # Validação (Zod)
│   ├── routes/              # products, auth, users, orders, cart/favorites, payments, admin
│   ├── repositories/        # SQL de cada tabela
│   ├── middleware/          # auth, validação, erros
│   ├── emails/              # Modelos dos e-mails (PT/EN)
│   └── lib/                 # sessão, erros HTTP, dinheiro, idiomas, Stripe e conferência de pagamentos, e-mail, fotos, tradução
│
├── database/
│   └── schema.sql           # Tabelas e catálogo inicial (rodar no pgAdmin)
│
├── scripts/
│   └── make-admin.js        # npm run admin -- email
│
├── .env.example
├── package.json
└── README.md
```

### Padrão das imagens de produto

`public/assets/products/<modelo>/<ordem>-<ângulo>.<extensão>`

- **modelo:** o código do produto em minúsculas (`x-01`, `x-02`...)
- **ordem:** a posição na galeria quando a foto foi adicionada (a capa é sempre a primeira da galeria no banco)
- **ângulo:** `three-quarter`, `front`, `side`, `top`, `back`, `detail`

Fotos enviadas pelo **painel** seguem `<ordem>-<código aleatório>.<extensão>` (ex.: `x-05/02-3f9a1c0b.webp`): o nome é gerado pelo servidor e nunca sobrescreve outro arquivo. Remover uma foto no painel (e salvar) apaga também o arquivo da pasta — só das fotos enviadas pelo painel; as fotos originais do projeto (como `01-three-quarter.jpg`) nunca são apagadas por ele.

O jeito mais fácil de adicionar fotos é pelo painel. Pelo pgAdmin também funciona: coloque o arquivo na pasta do modelo e cadastre no banco (Query Tool):

```sql
INSERT INTO product_images (product_id, position, src, alt_pt, alt_en)
VALUES (2, 2, 'assets/products/x-02/02-front.jpg', 'SONORA X-02 em vista frontal', 'SONORA X-02 in front view');
```

Produtos novos, preço, textos, fotos e "à venda" se mudam pelo **painel administrativo** (ou com um `UPDATE` em `products` e `product_translations`), e o site mostra a mudança no próximo carregamento.

> O `schema.sql` só cria o catálogo **inicial**: rodar o arquivo de novo não desfaz o que foi editado no painel.

---

## Publicar (deploy)

O GitHub Pages só hospeda sites estáticos, então o projeto precisa de um serviço que rode Node.js:

1. **Banco:** crie um PostgreSQL gratuito no [Neon](https://neon.tech) e rode o `database/schema.sql` nele
2. **Servidor:** publique no [Render](https://render.com) (Web Service, build `npm install`, start `npm start`)
3. Configure as variáveis no Render: `DATABASE_URL`, `DATABASE_SSL=true`, `SESSION_SECRET` (texto longo) e `NODE_ENV=production`. `PUBLIC_URL` é **obrigatório** em produção (o endereço do site, ex.: `https://sonora.onrender.com`): os links dos e-mails e a volta do Stripe usam ele. Para o cartão: `STRIPE_SECRET_KEY` (de teste). Para o webhook, cadastre `https://SEU-SITE/api/payments/webhook` em **Developers → Webhooks** no Stripe (eventos `checkout.session.completed` e `checkout.session.expired`) e coloque o segredo em `STRIPE_WEBHOOK_SECRET`. Para os e-mails: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` (e `SMTP_SECURE=true` na porta 465) e `EMAIL_FROM`. Para a tradução no painel (opcional): `DEEPL_API_KEY`
4. Troque o `og:image` das páginas pelo endereço completo da imagem publicada

> **Fotos enviadas pelo painel:** no Render (plano gratuito) o disco é apagado a cada nova publicação ou reinício, então as fotos enviadas pelo painel somem (as que estão no repositório ficam). Para um site no ar de verdade, o envio deve ir para um serviço de arquivos como [Cloudinary](https://cloudinary.com) ou Amazon S3, guardando no banco só o endereço — a troca fica concentrada em `server/lib/uploads.js`.

---

## Próximos passos

- [ ] Novas fotos para os modelos X-02 e X-04 e otimização das imagens (WebP + `srcset`)
- [ ] Testes automatizados da API e do fluxo de compra

---

Desenvolvido por **Hentony Almeida** como projeto de estudo.
