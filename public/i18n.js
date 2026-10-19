/* =========================
   SONORA — IDIOMAS (PT / EN)

   Carregado no <head> SEM defer, antes de tudo: define o idioma
   cedo para a página não "piscar" em português antes de virar
   inglês.

   Uso no HTML:
     <p data-i18n="chave">Texto em português</p>
     <h2 data-i18n-html="chave">Texto com <span>marcação</span></h2>
     <input data-i18n-attr="placeholder:chave; aria-label:outra">

   Uso no JavaScript:
     Sonora.i18n.t("chave", { nome: "Ana" })   →  texto traduzido
     window.addEventListener(Sonora.i18n.CHANGE_EVENT, render)

   A escolha fica salva no navegador ("sonora-lang").
========================= */

window.Sonora = window.Sonora || {};

(function (Sonora) {
    "use strict";

    const STORAGE_KEY = "sonora-lang";
    const CHANGE_EVENT = "sonora:lang-change";
    const DEFAULT_LANG = "pt";
    const LOCALES = { pt: "pt-BR", en: "en-US" };


    /* =========================
       01. DICIONÁRIO
    ========================= */

    const messages = {
        pt: {
            /* --- Comum --- */
            "meta.home.title": "SONORA® — Beyond Vision",
            "meta.home.description": "SONORA — Óculos futuristas que expandem os limites do design.",
            "meta.share.description": "Óculos conceituais que expandem os limites do design.",
            "skip": "Pular para o conteúdo",
            "nav.label": "Navegação principal",
            "nav.home": "SONORA — página inicial",
            "nav.products": "Produtos",
            "nav.brand": "A marca",
            "nav.concept": "Conceito",
            "lang.switch": "PT / EN — mudar o idioma para inglês",
            "account.login": "ENTRAR",
            "account.loginLabel": "Entrar ou criar conta",
            "account.myAccount": "Minha conta — {name}",
            "bag.open": "— abrir sacola",
            "catalog.error": "Não foi possível carregar a coleção agora. Recarregue a página em instantes.",
            "network.error": "Não foi possível conectar ao servidor. Confira se ele está rodando (npm run dev).",
            "generic.error": "Algo deu errado. Tente novamente.",
            "busy": "AGUARDE…",
            "password.show": "MOSTRAR",
            "password.hide": "OCULTAR",
            "password.showLabel": "Mostrar senha",
            "password.hideLabel": "Ocultar senha",

            /* --- Rodapé --- */
            "footer.tagline": "Óculos conceituais para quem enxerga além do óbvio.",
            "footer.label": "Rodapé",
            "footer.explore": "Explorar",
            "footer.collection": "Coleção",
            "footer.models": "Modelos",
            "footer.allModels": "Ver todos ↗",
            "footer.newsletter": "Newsletter",
            "footer.newsletterText": "Lançamentos e edições limitadas em primeira mão.",
            "footer.emailLabel": "Seu e-mail",
            "footer.emailPlaceholder": "seu@email.com",
            "footer.subscribe": "Inscrever na newsletter",
            "footer.credit": "Projeto de estudo — marca e produtos fictícios.",
            "footer.privacy": "Privacidade",
            "stock.soldOut": "Esgotado",
            "stock.lastUnits": "Últimas unidades",
            "stock.soldOutLong": "Esgotado no momento",
            "stock.remaining": "Restam só {count} unidades",
            "stock.remainingOne": "Resta só 1 unidade",
            "stock.soldOutRemove": "Esgotado — remova da sacola",
            "stock.onlyLeft": "Só restam {count} — diminua a quantidade",
            "stock.maxInBag": "Todas as unidades disponíveis já estão na sacola",
            "stock.fixBag": "Há item esgotado ou acima do estoque. Ajuste a sacola para finalizar.",
            "stock.fixCheckout": "Há item esgotado na sacola. Remova-o no resumo do pedido para continuar.",
            "checkout.removeItem": "Remover",
            "product.soldOut": "ESGOTADO",
            "product.allInBag": "TODAS AS UNIDADES JÁ ESTÃO NA SACOLA",
            "admin.stock": "Estoque",
            "admin.stockHint": "Unidades à venda. Em branco = sem controle de estoque.",
            "admin.stockOut": "Esgotado",
            "admin.stockOne": "1 em estoque",
            "admin.stockMany": "{count} em estoque",
            "login.privacyNote": "Ao criar a conta, você concorda com a <a href=\"privacidade.html\">Política de privacidade</a>.",
            "login.accountDeleted": "Sua conta foi excluída. Obrigado por ter passado por aqui.",
            "checkout.privacyNote": "Seus dados são usados só para entregar o pedido. Veja a <a href=\"privacidade.html\">Política de privacidade</a>.",
            "account.deleteTitle": "Excluir conta",
            "account.deleteText": "Apaga sua conta, sua sacola e seus favoritos. Os pedidos já feitos continuam registrados na loja, sem ligação com a conta. Não dá para desfazer.",
            "account.deletePassword": "Confirme sua senha",
            "account.deleteConfirm": "Entendo que a exclusão é definitiva e não pode ser desfeita.",
            "account.deleteConfirmRequired": "Marque a confirmação para continuar.",
            "account.deleteButton": "EXCLUIR MINHA CONTA",
            "account.deleting": "EXCLUINDO…",
            "account.deletePrivacy": "Saiba o que acontece com seus dados na <a href=\"privacidade.html\">Política de privacidade</a>.",
            "privacy.title": "Política de privacidade — SONORA®",
            "privacy.metaDescription": "Como a SONORA trata os seus dados: o que é coletado, para quê, com quem é compartilhado e como excluir sua conta.",
            "privacy.eyebrow": "PRIVACIDADE",
            "privacy.heading": "Política de <span>privacidade.</span>",
            "privacy.updated": "Última atualização: outubro de 2026.",
            "privacy.intro": "A SONORA é um <strong>projeto de estudo</strong>: a marca e os produtos são fictícios e nenhum pagamento real é feito. Mesmo assim, o site trata os dados como uma loja de verdade, seguindo a LGPD (Lei nº 13.709/2018). Aqui está, em linguagem simples, o que acontece com as suas informações.",
            "privacy.collectTitle": "Quais dados coletamos",
            "privacy.collectBody": "<ul><li><strong>Conta:</strong> nome, e-mail, celular (opcional) e senha. A senha é guardada só como um código embaralhado (hash bcrypt): nem a loja consegue lê-la.</li><li><strong>Pedidos:</strong> nome, e-mail, celular, endereço de entrega, itens comprados e a forma de pagamento escolhida.</li><li><strong>Cartão:</strong> é digitado só na página segura do Stripe. A SONORA nunca recebe nem guarda os números do cartão.</li></ul>",
            "privacy.useTitle": "Para que usamos",
            "privacy.useBody": "<ul><li>Processar e entregar os pedidos e mostrar o seu histórico em “Meus pedidos”.</li><li>Enviar e-mails do pedido (confirmação e mudanças de status) e o link de nova senha.</li><li>Guardar sua sacola e seus favoritos na conta, para aparecerem em qualquer aparelho.</li></ul><p>Não vendemos dados, não usamos para anúncios e não traçamos perfis. A newsletter do rodapé é só demonstração: nenhum e-mail digitado nela é guardado.</p>",
            "privacy.shareTitle": "Com quem compartilhamos",
            "privacy.shareBody": "<ul><li><strong>Stripe:</strong> recebe os dados do pagamento com cartão (em modo de teste).</li><li><strong>ViaCEP:</strong> recebe só o CEP digitado no checkout, para preencher o endereço.</li><li><strong>Google Fonts:</strong> as fontes do site vêm do Google, que recebe o endereço IP de quem visita.</li></ul>",
            "privacy.cookiesTitle": "Cookies e dados no navegador",
            "privacy.cookiesBody": "<ul><li><strong>Um cookie de sessão</strong> (sonora.sid), criado só depois do login, para manter você conectado. Vale 7 dias e não pode ser lido por scripts da página.</li><li><strong>No próprio navegador</strong> (localStorage): sua sacola, seus favoritos e o idioma escolhido.</li></ul><p>Não usamos cookies de rastreamento nem de publicidade.</p>",
            "privacy.retentionTitle": "Por quanto tempo guardamos",
            "privacy.retentionBody": "<ul><li><strong>Conta, sacola e favoritos:</strong> até você excluir a conta.</li><li><strong>Pedidos:</strong> continuam registrados depois da exclusão da conta, sem ligação com ela. Uma loja real é obrigada pela lei fiscal a guardar o registro das vendas.</li><li><strong>Links de nova senha:</strong> valem 1 hora e só uma vez.</li></ul>",
            "privacy.rightsTitle": "Seus direitos",
            "privacy.rightsBody": "<p>Pela LGPD, você pode ver, corrigir e apagar os seus dados. No site:</p><ul><li><a href=\"conta.html\">Minha conta</a>: ver e corrigir nome e celular, e trocar a senha.</li><li><a href=\"pedidos.html\">Meus pedidos</a>: ver tudo o que você comprou.</li><li><strong>Minha conta → Excluir conta</strong>: apagar a conta a qualquer momento, com a sua senha.</li></ul>",
            "privacy.securityTitle": "Segurança",
            "privacy.securityBody": "<p>Senhas com hash bcrypt, cookie de sessão protegido (httpOnly), limite de tentativas no login, dados validados no servidor e consultas ao banco protegidas contra SQL injection. Ao trocar ou redefinir a senha, os outros aparelhos são desconectados.</p>",
            "privacy.contactTitle": "Contato",
            "privacy.contactBody": "<p>Como é um projeto de estudo, não há uma empresa por trás da SONORA. Dúvidas sobre o projeto podem ser enviadas ao autor, Hentony Almeida.</p>",
            "newsletter.invalid": "Digite um e-mail válido.",
            "newsletter.success": "Inscrição confirmada. Até o próximo lançamento.",

            /* --- Home --- */
            "hero.imageAlt": "SONORA X-01 — óculos futuristas de lente panorâmica",
            "collection.description": "Formas que desafiam o convencional. Design criado para uma nova perspectiva.",
            "collection.filterLabel": "Filtrar por série",
            "collection.sort": "Ordenar",
            "collection.sortFeatured": "Destaques",
            "collection.sortPriceAsc": "Menor preço",
            "collection.sortPriceDesc": "Maior preço",
            "collection.all": "Todos",
            "collection.favorites": "Favoritos",
            "collection.countOne": "1 modelo",
            "collection.countMany": "{count} modelos",
            "collection.emptyFavorites": "Você ainda não favoritou nenhum modelo. Toque no coração de um óculos para guardá-lo aqui.",
            "collection.emptyFilter": "Nenhum modelo encontrado para este filtro.",
            "collection.seeAll": "Ver todos os modelos ↗",
            "collection.bannerAlt": "SONORA — Coleção de óculos futuristas",
            "about.text": "A SONORA nasce da interseção entre design industrial, cultura visual e tecnologia. Criamos óculos conceituais para quem enxerga além do óbvio.",

            /* --- Card de produto --- */
            "card.imageAlt": "{name} — óculos futuristas",
            "favorite.add": "Adicionar {name} aos favoritos",
            "favorite.remove": "Remover {name} dos favoritos",

            /* --- Sacola --- */
            "cart.close": "Fechar sacola",
            "cart.subtotal": "Subtotal",
            "cart.checkout": "FINALIZAR PEDIDO ↗",
            "cart.note": "Projeto demonstrativo — checkout fictício.",
            "cart.emptyTitle": "Sua próxima perspectiva começa aqui.",
            "cart.emptyText": "Sua sacola está vazia.",
            "cart.quantity": "Quantidade",
            "cart.decrease": "Diminuir quantidade de {name}",
            "cart.increase": "Aumentar quantidade de {name}",
            "cart.remove": "Remover {name} da sacola",

            /* --- Página de produto --- */
            "product.metaDescription": "Conheça o {name}. {tagline}",
            "product.breadcrumb": "Você está aqui",
            "product.images": "Imagens do produto",
            "product.carousel": "carrossel",
            "product.prevImage": "Imagem anterior",
            "product.nextImage": "Próxima imagem",
            "product.gallery": "Galeria de imagens",
            "product.slide": "{index} de {total}",
            "product.viewImage": "Ver imagem {index} de {total}",
            "product.quantity": "QUANTIDADE",
            "product.decrease": "Diminuir quantidade",
            "product.increase": "Aumentar quantidade",
            "product.addToBag": "ADICIONAR À SACOLA",
            "product.added": "ADICIONADO ✓",
            "product.note": "Produto conceitual para demonstração do projeto.",
            "product.addedOne": "1 unidade do {name} adicionada à sacola.",
            "product.addedMany": "{count} unidades do {name} adicionadas à sacola.",
            "product.saveError": "Não foi possível salvar a sacola neste navegador.",
            "product.concept": "CONCEITO",
            "product.specs": "ESPECIFICAÇÕES",
            "product.materials": "MATERIAIS",
            "product.related": "Outros <span>modelos.</span>",
            "product.seeCollection": "VER COLEÇÃO COMPLETA ↗",

            /* --- Checkout --- */
            "checkout.title": "Checkout — SONORA®",
            "checkout.metaDescription": "Finalize seu pedido SONORA. Projeto demonstrativo: nenhum pagamento é processado.",
            "checkout.demo": "CHECKOUT DEMONSTRATIVO",
            "checkout.backToStore": "VOLTAR À LOJA ↗",
            "checkout.eyebrow": "FINALIZAR PEDIDO",
            "checkout.contact": "Contato",
            "checkout.delivery": "Entrega",
            "checkout.payment": "Pagamento",
            "checkout.fullName": "Nome completo",
            "checkout.email": "E-mail",
            "checkout.phone": "Celular",
            "checkout.cep": "CEP",
            "checkout.street": "Endereço",
            "checkout.number": "Número",
            "checkout.complement": "Complemento",
            "checkout.optional": "(opcional)",
            "checkout.district": "Bairro",
            "checkout.city": "Cidade",
            "checkout.state": "Estado",
            "checkout.select": "Selecione",
            "checkout.cepHint": "O endereço é preenchido automaticamente.",
            "checkout.cepLoading": "Buscando endereço…",
            "checkout.cepNotFound": "CEP não encontrado. Confira o número ou preencha o endereço.",
            "checkout.cepFound": "Endereço encontrado: {city} — {state}.",
            "checkout.cepError": "Não foi possível buscar o CEP agora. Preencha o endereço manualmente.",
            "checkout.pixDiscount": "5% de desconto",
            "checkout.card": "Cartão de crédito",
            "checkout.cardDetail": "Pago na página segura do Stripe",
            "checkout.boleto": "Boleto",
            "checkout.boletoDetail": "Vence em 3 dias úteis",
            "checkout.paymentNote": "Cartão em <strong>modo de teste</strong>: use o número 4242 4242 4242 4242, qualquer data futura e qualquer CVC. Pix e boleto são simulados.",
            "checkout.confirm": "CONFIRMAR PEDIDO",
            "checkout.processing": "PROCESSANDO…",
            "checkout.disclaimer": "Projeto demonstrativo: nenhum pagamento é processado. O pedido é salvo no banco de dados da loja.",
            "checkout.summary": "Resumo do pedido",
            "checkout.shipping": "Frete",
            "checkout.free": "Grátis",
            "checkout.pixDiscountRow": "Desconto Pix (5%)",
            "checkout.total": "Total",
            "checkout.emptyTitle": "Sua sacola está vazia.",
            "checkout.emptyText": "Escolha um modelo da coleção para continuar.",
            "checkout.seeCollection": "VER A COLEÇÃO",
            "checkout.orderLabel": "PEDIDO",
            "checkout.confirmed": "Pedido <span>confirmado.</span>",
            "checkout.seeOrders": "VER MEUS PEDIDOS",
            "checkout.backHome": "VOLTAR À LOJA",
            "checkout.buyingAs": "Comprando como <strong>{name}</strong>. O pedido ficará salvo em <a href=\"pedidos.html\">Meus pedidos</a>.",
            "checkout.guestNote": "Já tem conta? <a href=\"login.html?next=checkout.html\">Entre</a> para acompanhar este pedido no seu histórico.",
            "checkout.thanksUser": "Obrigado, {name}. Seu pedido foi salvo e já aparece em \"Meus pedidos\".",
            "checkout.thanksGuest": "Obrigado, {name}. Guarde o número do pedido acima — crie uma conta com o mesmo e-mail para acompanhar suas próximas compras.",
            "checkout.items": "Itens",
            "checkout.cardPaid": "Cartão de crédito — pago pelo Stripe (teste)",
            "checkout.payWithCard": "IR PARA O PAGAMENTO",
            "checkout.redirecting": "ABRINDO O STRIPE…",
            "checkout.confirmingPayment": "Confirmando seu pagamento com o Stripe…",
            "checkout.paymentCancelled": "Pagamento cancelado. Nada foi cobrado, e sua sacola continua aqui.",

            /* --- Validação (navegador) --- */
            "validation.name": "Informe seu nome completo.",
            "validation.fullName": "Informe nome e sobrenome.",
            "validation.email": "Informe seu e-mail.",
            "validation.emailInvalid": "Digite um e-mail válido.",
            "validation.phone": "Informe seu celular.",
            "validation.phoneShort": "Celular incompleto. Use DDD + número.",
            "validation.cep": "Informe o CEP.",
            "validation.cepLength": "O CEP precisa ter 8 dígitos.",
            "validation.street": "Informe o endereço.",
            "validation.number": "Informe o número (ou S/N).",
            "validation.district": "Informe o bairro.",
            "validation.city": "Informe a cidade.",
            "validation.state": "Selecione o estado.",
            "validation.password": "Informe sua senha.",
            "validation.currentPassword": "Informe sua senha atual.",
            "validation.passwordLength": "A senha precisa ter pelo menos 8 caracteres.",
            "validation.passwordMix": "Use letras e números na senha.",

            /* --- Login --- */
            "login.title": "Entrar — SONORA®",
            "login.metaDescription": "Entre na sua conta SONORA ou crie uma nova para acompanhar seus pedidos.",
            "login.benefit1": "Acompanhe todos os seus pedidos em um só lugar.",
            "login.benefit2": "Checkout mais rápido, com seus dados já preenchidos.",
            "login.benefit3": "Acesso antecipado às edições do Limited Lab.",
            "login.panel": "Acesso à conta",
            "login.tabs": "Entrar ou criar conta",
            "login.signIn": "Entrar",
            "login.signUp": "Criar conta",
            "login.signInButton": "ENTRAR",
            "login.signUpButton": "CRIAR CONTA",
            "login.noAccount": "Ainda não tem conta?",
            "login.hasAccount": "Já tem conta?",
            "login.password": "Senha",
            "login.passwordHint": "Mínimo de 8 caracteres, com letras e números.",
            "login.note": "Projeto de estudo: use um e-mail fictício se preferir. As senhas são guardadas com criptografia (bcrypt).",

            "login.forgot": "Esqueci minha senha",
            "login.resetDone": "Senha alterada. Entre com a nova senha.",

            /* --- Nova senha --- */
            "reset.pageTitle": "Nova senha — SONORA®",
            "reset.metaDescription": "Crie uma nova senha para a sua conta SONORA.",
            "reset.heading": "Nova <span>senha.</span>",
            "reset.benefit1": "O link chega no e-mail da sua conta e vale por 1 hora.",
            "reset.benefit2": "Cada link funciona uma única vez.",
            "reset.benefit3": "Ao trocar a senha, todos os aparelhos conectados saem da conta.",
            "reset.requestTitle": "Esqueceu a senha?",
            "reset.requestText": "Digite o e-mail da sua conta e enviaremos um link para você criar uma nova senha.",
            "reset.requestButton": "ENVIAR LINK",
            "reset.sending": "ENVIANDO…",
            "reset.requestSent": "Se existir uma conta com o e-mail {email}, o link chega em instantes. Confira também a caixa de spam.",
            "reset.newTitle": "Crie sua nova senha",
            "reset.newText": "Escolha uma senha que você ainda não usou no SONORA.",
            "reset.saveButton": "SALVAR NOVA SENHA",
            "reset.doneTitle": "Senha alterada.",
            "reset.doneText": "Agora é só entrar com a nova senha.",
            "reset.backToLogin": "Voltar para o login",

            /* --- Minha conta --- */
            "account.title": "Minha conta — SONORA®",
            "account.metaDescription": "Seus dados e configurações da conta SONORA.",
            "account.eyebrow": "MINHA CONTA",
            "account.hello": "Olá,",
            "account.nav": "Minha conta",
            "account.profile": "Perfil",
            "account.orders": "Pedidos",
            "account.logout": "Sair",
            "account.since": "Membro desde {date}.",
            "account.personal": "Dados pessoais",
            "account.emailHint": "O e-mail é usado para entrar e não pode ser alterado.",
            "account.save": "SALVAR ALTERAÇÕES",
            "account.saving": "SALVANDO…",
            "account.saved": "Dados atualizados.",
            "account.passwordTitle": "Senha",
            "account.passwordText": "Ao trocar a senha, os outros dispositivos conectados à sua conta são desconectados.",
            "account.currentPassword": "Senha atual",
            "account.newPassword": "Nova senha",
            "account.changePassword": "ALTERAR SENHA",
            "account.passwordChanged": "Senha alterada. Os outros dispositivos foram desconectados.",

            /* --- Pedidos --- */
            "orders.title": "Meus pedidos — SONORA®",
            "orders.metaDescription": "Histórico de pedidos da sua conta SONORA.",
            "orders.heading": "Meus <span>pedidos.</span>",
            "orders.history": "Histórico de pedidos",
            "orders.loading": "Carregando seus pedidos…",
            "orders.emptyTitle": "Você ainda não fez nenhum pedido.",
            "orders.emptyText": "Quando comprar, seus pedidos aparecem aqui com todos os detalhes.",
            "orders.explore": "EXPLORAR A COLEÇÃO",
            "orders.none": "Nenhum pedido por enquanto.",
            "orders.summaryOne": "1 pedido · {total} em compras.",
            "orders.summaryMany": "{count} pedidos · {total} em compras.",
            "orders.order": "Pedido {number}",
            "orders.itemOne": "item",
            "orders.itemMany": "itens",
            "orders.details": "Ver detalhes",
            "orders.items": "Itens",
            "orders.delivery": "Entrega",
            "orders.payment": "Pagamento",
            "orders.subtotal": "Subtotal",
            "orders.pixDiscount": "Desconto Pix",
            "orders.shipping": "Frete",
            "orders.free": "Grátis",
            "orders.total": "Total",
            "orders.status.confirmed": "Confirmado",
            "orders.status.shipped": "Enviado",
            "orders.status.delivered": "Entregue",
            "orders.status.cancelled": "Cancelado",
            "payment.pix": "Pix",
            "payment.card": "Cartão de crédito",
            "payment.boleto": "Boleto",

            /* --- Painel administrativo --- */
            "admin.title": "Painel — SONORA®",
            "admin.metaDescription": "Painel administrativo da loja SONORA.",
            "admin.nav": "Painel admin",
            "admin.eyebrow": "ADMINISTRAÇÃO",
            "admin.heading": "Painel<span>.</span>",
            "admin.subtitle": "Vendas, pedidos e produtos da loja.",
            "admin.sections": "Seções do painel",
            "admin.tabOverview": "Visão geral",
            "admin.tabOrders": "Pedidos",
            "admin.tabProducts": "Produtos",
            "admin.myAccount": "Minha conta",
            "admin.deniedTitle": "Área restrita.",
            "admin.deniedText": "Esta página é só para administradores da loja. Peça acesso ou volte para a coleção.",
            "admin.deniedButton": "VOLTAR À LOJA",
            "admin.loadError": "Não foi possível carregar os dados. Tente novamente.",
            "admin.kpiRevenue": "Faturamento",
            "admin.kpiRevenue30": "{value} nos últimos 30 dias",
            "admin.kpiOrders": "Pedidos vendidos",
            "admin.kpiAverage": "Ticket médio",
            "admin.kpiToShip": "A enviar",
            "admin.kpiToShipHint": "Confirmados, aguardando envio",
            "admin.kpiCustomers": "Clientes com conta",
            "admin.statusTitle": "Pedidos por status",
            "admin.topTitle": "Mais vendidos",
            "admin.topEmpty": "Nenhuma venda ainda.",
            "admin.units": "{count} un.",
            "admin.searchLabel": "Buscar",
            "admin.searchPlaceholder": "Nº do pedido, nome ou e-mail",
            "admin.statusLabel": "Status",
            "admin.filterAll": "Todos os pedidos",
            "admin.filterUnpaid": "Cartão não pago",
            "admin.countOne": "1 pedido encontrado.",
            "admin.countMany": "{count} pedidos encontrados.",
            "admin.ordersEmpty": "Nenhum pedido encontrado.",
            "admin.loadMore": "CARREGAR MAIS ↓",
            "admin.ship": "MARCAR COMO ENVIADO",
            "admin.deliver": "MARCAR COMO ENTREGUE",
            "admin.cancel": "CANCELAR PEDIDO",
            "admin.confirmCancel": "CONFIRMAR CANCELAMENTO",
            "admin.statusChanged": "Pedido {number}: {status}. O cliente foi avisado por e-mail.",
            "admin.guest": "sem conta",
            "admin.customer": "Cliente",
            "admin.price": "Preço (R$)",
            "admin.onSale": "À venda",
            "admin.onSaleHint": "Desmarcado: some da loja e das sacolas, mas continua nos pedidos antigos.",
            "admin.offSale": "Fora de linha",
            "admin.textsPt": "Textos em português",
            "admin.textsEn": "Textos em inglês",
            "admin.tagline": "Frase curta",
            "admin.description": "Descrição",
            "admin.save": "SALVAR PRODUTO",
            "admin.saving": "SALVANDO…",
            "admin.saved": "{name} salvo. A loja já mostra a mudança.",
            "admin.productsSearchPlaceholder": "Código, nome ou série",
            "admin.filterAllProducts": "Todos os produtos",
            "admin.productsCountOne": "1 produto encontrado.",
            "admin.productsCountMany": "{count} produtos encontrados.",
            "admin.productsEmpty": "Nenhum produto encontrado.",
            "admin.newProduct": "+ NOVO PRODUTO",
            "admin.newProductTitle": "Novo produto",
            "admin.draftHint": "O produto nasce fora de linha (rascunho). Depois de criar, adicione as fotos e marque “À venda”.",
            "admin.create": "CRIAR PRODUTO",
            "admin.creating": "CRIANDO…",
            "admin.created": "{name} criado como rascunho. Agora adicione as fotos e marque “À venda”.",
            "admin.createdTranslated": "{name} criado como rascunho. Os textos em inglês foram traduzidos automaticamente: confira abaixo. Depois adicione as fotos e marque “À venda”.",
            "admin.translateHint.none": "Tradução automática indisponível neste navegador. Use o Chrome ou o Edge no computador (ou configure o DeepL, veja o README), ou escreva o inglês à mão.",
            "admin.translating": "TRADUZINDO…",
            "admin.translatingShort": "TRADUZINDO…",
            "admin.downloadingTranslator": "Baixando o tradutor do navegador (só na primeira vez)… {percent}%",
            "admin.translateFailed": "Não deu para traduzir automaticamente. {reason} Tente de novo ou escreva o inglês à mão.",
            "admin.translateEmpty": "Escreva primeiro a frase curta e a descrição em português.",
            "admin.translated": "Inglês preenchido com a tradução. Confira e salve.",
            "admin.translateFromPt": "TRADUZIR DO PORTUGUÊS",
            "admin.translateHint.new": "Escreva em português e clique em “Traduzir do português” para conferir antes, ou deixe o inglês em branco: ele é traduzido sozinho ao criar o produto.",
            "admin.translateHint.edit": "Mudou algum texto em português? Clique em “Traduzir do português” para atualizar o inglês.",
            "admin.translateNotAllowed": "O navegador não liberou o tradutor; clique no botão de novo.",
            "admin.translateDownload": "O navegador não conseguiu baixar o tradutor (confira a internet).",
            "admin.undo": "Desfazer",
            "admin.translateUndone": "O inglês voltou ao que estava antes.",
            "admin.sectionData": "Dados do produto",
            "admin.code": "Código",
            "admin.codeHint": "Ex.: X-05. Não muda depois: é o nome da pasta das fotos.",
            "admin.name": "Nome",
            "admin.series": "Série",
            "admin.subtitle": "Frase da marca",
            "admin.subtitleHint": "Em inglês, igual nos dois idiomas (ex.: Precision in motion.).",
            "admin.photos": "Fotos",
            "admin.photosHint": "JPG, PNG ou WebP, até 5 MB cada e no máximo 8. A primeira é a capa. O envio é imediato; ordem, textos e remoção valem ao salvar.",
            "admin.noPhotos": "Nenhuma foto ainda.",
            "admin.addPhotos": "+ ADICIONAR FOTOS",
            "admin.uploading": "Enviando foto {current} de {total}…",
            "admin.photoInvalid": "{name}: envie JPG, PNG ou WebP de até 5 MB.",
            "admin.tooManyPhotos": "O limite é de 8 fotos por produto.",
            "admin.cover": "CAPA",
            "admin.moveLeft": "Mover para antes",
            "admin.moveRight": "Mover para depois",
            "admin.removePhoto": "Tirar esta foto",
            "admin.altPt": "Descrição da foto (PT)",
            "admin.altEn": "Descrição da foto (EN)",
            "admin.concept": "Conceito",
            "admin.materials": "Materiais",
            "admin.specs": "Especificações",
            "admin.specsHint": "Uma por linha, no formato Rótulo: valor (ex.: Linha: Limited Lab).",
            "admin.storyText": "Texto da história",
            "admin.story": "História (página do produto)",
            "admin.storyHint": "Textos de marca em inglês, iguais nos dois idiomas.",
            "admin.storyEyebrow": "Sobretítulo",
            "admin.storyTitle": "Título",
            "admin.storyHighlight": "Destaque (em azul)",
            "admin.edit": "Editar",
            "admin.close": "Fechar",
            "orders.status.awaiting_payment": "Aguardando pagamento",
            "orders.status.payment_expired": "Pagamento não concluído",

            /* --- 404 --- */
            "notFound.title": "Página não encontrada — SONORA®",
            "notFound.metaDescription": "Página não encontrada.",
            "notFound.eyebrow": "ERRO 404",
            "notFound.text": "Esta página não existe ou foi movida. Que tal voltar para a coleção?",
            "notFound.button": "VER A COLEÇÃO"
        },

        en: {
            /* --- Common --- */
            "meta.home.title": "SONORA® — Beyond Vision",
            "meta.home.description": "SONORA — Futuristic eyewear that pushes the limits of design.",
            "meta.share.description": "Conceptual eyewear that pushes the limits of design.",
            "skip": "Skip to content",
            "nav.label": "Main navigation",
            "nav.home": "SONORA — home page",
            "nav.products": "Products",
            "nav.brand": "The brand",
            "nav.concept": "Concept",
            "lang.switch": "PT / EN — switch language to Portuguese",
            "account.login": "SIGN IN",
            "account.loginLabel": "Sign in or create an account",
            "account.myAccount": "My account — {name}",
            "bag.open": "— open bag",
            "catalog.error": "Could not load the collection right now. Please reload the page in a moment.",
            "network.error": "Could not reach the server. Check that it is running (npm run dev).",
            "generic.error": "Something went wrong. Please try again.",
            "busy": "PLEASE WAIT…",
            "password.show": "SHOW",
            "password.hide": "HIDE",
            "password.showLabel": "Show password",
            "password.hideLabel": "Hide password",

            /* --- Footer --- */
            "footer.tagline": "Conceptual eyewear for those who see beyond the obvious.",
            "footer.label": "Footer",
            "footer.explore": "Explore",
            "footer.collection": "Collection",
            "footer.models": "Models",
            "footer.allModels": "See all ↗",
            "footer.newsletter": "Newsletter",
            "footer.newsletterText": "New releases and limited editions first.",
            "footer.emailLabel": "Your email",
            "footer.emailPlaceholder": "you@email.com",
            "footer.subscribe": "Subscribe to the newsletter",
            "footer.credit": "Study project — fictional brand and products.",
            "footer.privacy": "Privacy",
            "stock.soldOut": "Sold out",
            "stock.lastUnits": "Last units",
            "stock.soldOutLong": "Sold out for now",
            "stock.remaining": "Only {count} left",
            "stock.remainingOne": "Only 1 left",
            "stock.soldOutRemove": "Sold out — remove it from your bag",
            "stock.onlyLeft": "Only {count} left — lower the quantity",
            "stock.maxInBag": "All available units are already in your bag",
            "stock.fixBag": "An item is sold out or above the available stock. Adjust your bag to check out.",
            "stock.fixCheckout": "There is a sold-out item in your bag. Remove it in the order summary to continue.",
            "checkout.removeItem": "Remove",
            "product.soldOut": "SOLD OUT",
            "product.allInBag": "ALL UNITS ARE ALREADY IN YOUR BAG",
            "admin.stock": "Stock",
            "admin.stockHint": "Units for sale. Blank = stock not tracked.",
            "admin.stockOut": "Sold out",
            "admin.stockOne": "1 in stock",
            "admin.stockMany": "{count} in stock",
            "login.privacyNote": "By creating an account, you agree to the <a href=\"privacidade.html\">Privacy policy</a>.",
            "login.accountDeleted": "Your account has been deleted. Thanks for stopping by.",
            "checkout.privacyNote": "Your data is only used to deliver your order. See the <a href=\"privacidade.html\">Privacy policy</a>.",
            "account.deleteTitle": "Delete account",
            "account.deleteText": "Deletes your account, your bag and your favorites. Orders already placed stay on the store's records, no longer linked to the account. This cannot be undone.",
            "account.deletePassword": "Confirm your password",
            "account.deleteConfirm": "I understand that deleting is permanent and cannot be undone.",
            "account.deleteConfirmRequired": "Check the confirmation to continue.",
            "account.deleteButton": "DELETE MY ACCOUNT",
            "account.deleting": "DELETING…",
            "account.deletePrivacy": "Learn what happens to your data in the <a href=\"privacidade.html\">Privacy policy</a>.",
            "privacy.title": "Privacy policy — SONORA®",
            "privacy.metaDescription": "How SONORA handles your data: what is collected, why, who it is shared with and how to delete your account.",
            "privacy.eyebrow": "PRIVACY",
            "privacy.heading": "Privacy <span>policy.</span>",
            "privacy.updated": "Last updated: October 2026.",
            "privacy.intro": "SONORA is a <strong>study project</strong>: the brand and products are fictional and no real payment is made. Even so, the site handles data like a real store, following Brazil's data protection law (LGPD, Law 13,709/2018). Here is, in plain language, what happens to your information.",
            "privacy.collectTitle": "What we collect",
            "privacy.collectBody": "<ul><li><strong>Account:</strong> name, email, phone (optional) and password. The password is only stored as a scrambled code (bcrypt hash): not even the store can read it.</li><li><strong>Orders:</strong> name, email, phone, delivery address, items bought and the chosen payment method.</li><li><strong>Card:</strong> typed only on Stripe's secure page. SONORA never receives or stores card numbers.</li></ul>",
            "privacy.useTitle": "Why we use it",
            "privacy.useBody": "<ul><li>To process and deliver orders and show your history in “My orders”.</li><li>To send order emails (confirmation and status updates) and the new password link.</li><li>To keep your bag and favorites in your account, so they show up on any device.</li></ul><p>We don't sell data, don't use it for ads and don't build profiles. The footer newsletter is a demo only: no email typed there is stored.</p>",
            "privacy.shareTitle": "Who we share it with",
            "privacy.shareBody": "<ul><li><strong>Stripe:</strong> receives card payment data (in test mode).</li><li><strong>ViaCEP:</strong> receives only the postal code typed at checkout, to fill in the address.</li><li><strong>Google Fonts:</strong> the site's fonts come from Google, which receives the visitor's IP address.</li></ul>",
            "privacy.cookiesTitle": "Cookies and browser data",
            "privacy.cookiesBody": "<ul><li><strong>One session cookie</strong> (sonora.sid), created only after you sign in, to keep you signed in. It lasts 7 days and can't be read by page scripts.</li><li><strong>In your own browser</strong> (localStorage): your bag, your favorites and the chosen language.</li></ul><p>We don't use tracking or advertising cookies.</p>",
            "privacy.retentionTitle": "How long we keep it",
            "privacy.retentionBody": "<ul><li><strong>Account, bag and favorites:</strong> until you delete your account.</li><li><strong>Orders:</strong> stay on record after the account is deleted, no longer linked to it. A real store is required by tax law to keep sales records.</li><li><strong>New password links:</strong> valid for 1 hour and only once.</li></ul>",
            "privacy.rightsTitle": "Your rights",
            "privacy.rightsBody": "<p>Under the LGPD, you can see, correct and delete your data. On the site:</p><ul><li><a href=\"conta.html\">My account</a>: see and correct your name and phone, and change your password.</li><li><a href=\"pedidos.html\">My orders</a>: see everything you bought.</li><li><strong>My account → Delete account</strong>: delete your account at any time, with your password.</li></ul>",
            "privacy.securityTitle": "Security",
            "privacy.securityBody": "<p>Passwords hashed with bcrypt, protected session cookie (httpOnly), limited sign-in attempts, data validated on the server and database queries protected against SQL injection. When you change or reset your password, other devices are signed out.</p>",
            "privacy.contactTitle": "Contact",
            "privacy.contactBody": "<p>As a study project, there is no company behind SONORA. Questions about the project can be sent to the author, Hentony Almeida.</p>",
            "newsletter.invalid": "Enter a valid email address.",
            "newsletter.success": "You're subscribed. See you at the next release.",

            /* --- Home --- */
            "hero.imageAlt": "SONORA X-01 — futuristic eyewear with a panoramic lens",
            "collection.description": "Shapes that challenge convention. Design created for a new perspective.",
            "collection.filterLabel": "Filter by series",
            "collection.sort": "Sort",
            "collection.sortFeatured": "Featured",
            "collection.sortPriceAsc": "Price: low to high",
            "collection.sortPriceDesc": "Price: high to low",
            "collection.all": "All",
            "collection.favorites": "Favorites",
            "collection.countOne": "1 model",
            "collection.countMany": "{count} models",
            "collection.emptyFavorites": "You haven't saved any models yet. Tap the heart on a pair of glasses to keep it here.",
            "collection.emptyFilter": "No models found for this filter.",
            "collection.seeAll": "See all models ↗",
            "collection.bannerAlt": "SONORA — Futuristic eyewear collection",
            "about.text": "SONORA was born where industrial design, visual culture and technology meet. We create conceptual eyewear for those who see beyond the obvious.",

            /* --- Product card --- */
            "card.imageAlt": "{name} — futuristic eyewear",
            "favorite.add": "Add {name} to favorites",
            "favorite.remove": "Remove {name} from favorites",

            /* --- Bag --- */
            "cart.close": "Close bag",
            "cart.subtotal": "Subtotal",
            "cart.checkout": "CHECKOUT ↗",
            "cart.note": "Demo project — fictional checkout.",
            "cart.emptyTitle": "Your next perspective starts here.",
            "cart.emptyText": "Your bag is empty.",
            "cart.quantity": "Quantity",
            "cart.decrease": "Decrease quantity of {name}",
            "cart.increase": "Increase quantity of {name}",
            "cart.remove": "Remove {name} from bag",

            /* --- Product page --- */
            "product.metaDescription": "Discover the {name}. {tagline}",
            "product.breadcrumb": "You are here",
            "product.images": "Product images",
            "product.carousel": "carousel",
            "product.prevImage": "Previous image",
            "product.nextImage": "Next image",
            "product.gallery": "Image gallery",
            "product.slide": "{index} of {total}",
            "product.viewImage": "View image {index} of {total}",
            "product.quantity": "QUANTITY",
            "product.decrease": "Decrease quantity",
            "product.increase": "Increase quantity",
            "product.addToBag": "ADD TO BAG",
            "product.added": "ADDED ✓",
            "product.note": "Conceptual product for project demonstration.",
            "product.addedOne": "1 unit of {name} added to your bag.",
            "product.addedMany": "{count} units of {name} added to your bag.",
            "product.saveError": "Could not save your bag in this browser.",
            "product.concept": "CONCEPT",
            "product.specs": "SPECIFICATIONS",
            "product.materials": "MATERIALS",
            "product.related": "Other <span>models.</span>",
            "product.seeCollection": "SEE FULL COLLECTION ↗",

            /* --- Checkout --- */
            "checkout.title": "Checkout — SONORA®",
            "checkout.metaDescription": "Complete your SONORA order. Demo project: no payment is processed.",
            "checkout.demo": "DEMO CHECKOUT",
            "checkout.backToStore": "BACK TO STORE ↗",
            "checkout.eyebrow": "COMPLETE YOUR ORDER",
            "checkout.contact": "Contact",
            "checkout.delivery": "Delivery",
            "checkout.payment": "Payment",
            "checkout.fullName": "Full name",
            "checkout.email": "Email",
            "checkout.phone": "Mobile",
            "checkout.cep": "Postal code (CEP)",
            "checkout.street": "Address",
            "checkout.number": "Number",
            "checkout.complement": "Apt, suite, etc.",
            "checkout.optional": "(optional)",
            "checkout.district": "Neighborhood",
            "checkout.city": "City",
            "checkout.state": "State",
            "checkout.select": "Select",
            "checkout.cepHint": "The address is filled in automatically.",
            "checkout.cepLoading": "Looking up address…",
            "checkout.cepNotFound": "Postal code not found. Check the number or fill in the address.",
            "checkout.cepFound": "Address found: {city} — {state}.",
            "checkout.cepError": "Could not look up the postal code right now. Please fill in the address manually.",
            "checkout.pixDiscount": "5% off",
            "checkout.card": "Credit card",
            "checkout.cardDetail": "Paid on Stripe's secure page",
            "checkout.boleto": "Boleto",
            "checkout.boletoDetail": "Due in 3 business days",
            "checkout.paymentNote": "Card in <strong>test mode</strong>: use the number 4242 4242 4242 4242, any future date and any CVC. Pix and boleto are simulated.",
            "checkout.confirm": "PLACE ORDER",
            "checkout.processing": "PROCESSING…",
            "checkout.disclaimer": "Demo project: no payment is processed. The order is saved in the store's database.",
            "checkout.summary": "Order summary",
            "checkout.shipping": "Shipping",
            "checkout.free": "Free",
            "checkout.pixDiscountRow": "Pix discount (5%)",
            "checkout.total": "Total",
            "checkout.emptyTitle": "Your bag is empty.",
            "checkout.emptyText": "Choose a model from the collection to continue.",
            "checkout.seeCollection": "SEE THE COLLECTION",
            "checkout.orderLabel": "ORDER",
            "checkout.confirmed": "Order <span>confirmed.</span>",
            "checkout.seeOrders": "VIEW MY ORDERS",
            "checkout.backHome": "BACK TO STORE",
            "checkout.buyingAs": "Shopping as <strong>{name}</strong>. This order will be saved in <a href=\"pedidos.html\">My orders</a>.",
            "checkout.guestNote": "Already have an account? <a href=\"login.html?next=checkout.html\">Sign in</a> to track this order in your history.",
            "checkout.thanksUser": "Thank you, {name}. Your order has been saved and is already in \"My orders\".",
            "checkout.thanksGuest": "Thank you, {name}. Keep the order number above — create an account with the same email to track your next purchases.",
            "checkout.items": "Items",
            "checkout.cardPaid": "Credit card — paid via Stripe (test)",
            "checkout.payWithCard": "GO TO PAYMENT",
            "checkout.redirecting": "OPENING STRIPE…",
            "checkout.confirmingPayment": "Confirming your payment with Stripe…",
            "checkout.paymentCancelled": "Payment cancelled. Nothing was charged, and your bag is still here.",

            /* --- Validation (browser) --- */
            "validation.name": "Enter your full name.",
            "validation.fullName": "Enter your first and last name.",
            "validation.email": "Enter your email.",
            "validation.emailInvalid": "Enter a valid email address.",
            "validation.phone": "Enter your mobile number.",
            "validation.phoneShort": "Incomplete number. Include the area code.",
            "validation.cep": "Enter the postal code.",
            "validation.cepLength": "The postal code must have 8 digits.",
            "validation.street": "Enter the address.",
            "validation.number": "Enter the number (or S/N).",
            "validation.district": "Enter the neighborhood.",
            "validation.city": "Enter the city.",
            "validation.state": "Select the state.",
            "validation.password": "Enter your password.",
            "validation.currentPassword": "Enter your current password.",
            "validation.passwordLength": "Password must be at least 8 characters.",
            "validation.passwordMix": "Use both letters and numbers.",

            /* --- Login --- */
            "login.title": "Sign in — SONORA®",
            "login.metaDescription": "Sign in to your SONORA account or create one to track your orders.",
            "login.benefit1": "Track all your orders in one place.",
            "login.benefit2": "Faster checkout, with your details already filled in.",
            "login.benefit3": "Early access to Limited Lab editions.",
            "login.panel": "Account access",
            "login.tabs": "Sign in or create an account",
            "login.signIn": "Sign in",
            "login.signUp": "Create account",
            "login.signInButton": "SIGN IN",
            "login.signUpButton": "CREATE ACCOUNT",
            "login.noAccount": "Don't have an account?",
            "login.hasAccount": "Already have an account?",
            "login.password": "Password",
            "login.passwordHint": "At least 8 characters, with letters and numbers.",
            "login.note": "Study project: feel free to use a fake email. Passwords are stored encrypted (bcrypt).",

            "login.forgot": "Forgot my password",
            "login.resetDone": "Password changed. Sign in with your new password.",

            /* --- New password --- */
            "reset.pageTitle": "New password — SONORA®",
            "reset.metaDescription": "Create a new password for your SONORA account.",
            "reset.heading": "New <span>password.</span>",
            "reset.benefit1": "The link goes to your account's email and is valid for 1 hour.",
            "reset.benefit2": "Each link works only once.",
            "reset.benefit3": "Changing your password signs out every connected device.",
            "reset.requestTitle": "Forgot your password?",
            "reset.requestText": "Enter your account's email and we'll send you a link to create a new password.",
            "reset.requestButton": "SEND LINK",
            "reset.sending": "SENDING…",
            "reset.requestSent": "If there is an account with {email}, the link will arrive in a moment. Check your spam folder too.",
            "reset.newTitle": "Create your new password",
            "reset.newText": "Choose a password you haven't used on SONORA before.",
            "reset.saveButton": "SAVE NEW PASSWORD",
            "reset.doneTitle": "Password changed.",
            "reset.doneText": "Now just sign in with your new password.",
            "reset.backToLogin": "Back to sign in",

            /* --- My account --- */
            "account.title": "My account — SONORA®",
            "account.metaDescription": "Your SONORA account details and settings.",
            "account.eyebrow": "MY ACCOUNT",
            "account.hello": "Hello,",
            "account.nav": "My account",
            "account.profile": "Profile",
            "account.orders": "Orders",
            "account.logout": "Sign out",
            "account.since": "Member since {date}.",
            "account.personal": "Personal details",
            "account.emailHint": "Your email is used to sign in and can't be changed.",
            "account.save": "SAVE CHANGES",
            "account.saving": "SAVING…",
            "account.saved": "Details updated.",
            "account.passwordTitle": "Password",
            "account.passwordText": "Changing your password signs out every other device connected to your account.",
            "account.currentPassword": "Current password",
            "account.newPassword": "New password",
            "account.changePassword": "CHANGE PASSWORD",
            "account.passwordChanged": "Password changed. Other devices have been signed out.",

            /* --- Orders --- */
            "orders.title": "My orders — SONORA®",
            "orders.metaDescription": "Order history for your SONORA account.",
            "orders.heading": "My <span>orders.</span>",
            "orders.history": "Order history",
            "orders.loading": "Loading your orders…",
            "orders.emptyTitle": "You haven't placed any orders yet.",
            "orders.emptyText": "When you buy something, your orders show up here with every detail.",
            "orders.explore": "EXPLORE THE COLLECTION",
            "orders.none": "No orders yet.",
            "orders.summaryOne": "1 order · {total} spent.",
            "orders.summaryMany": "{count} orders · {total} spent.",
            "orders.order": "Order {number}",
            "orders.itemOne": "item",
            "orders.itemMany": "items",
            "orders.details": "View details",
            "orders.items": "Items",
            "orders.delivery": "Delivery",
            "orders.payment": "Payment",
            "orders.subtotal": "Subtotal",
            "orders.pixDiscount": "Pix discount",
            "orders.shipping": "Shipping",
            "orders.free": "Free",
            "orders.total": "Total",
            "orders.status.confirmed": "Confirmed",
            "orders.status.shipped": "Shipped",
            "orders.status.delivered": "Delivered",
            "orders.status.cancelled": "Cancelled",
            "payment.pix": "Pix",
            "payment.card": "Credit card",
            "payment.boleto": "Boleto",

            /* --- Admin panel --- */
            "admin.title": "Admin — SONORA®",
            "admin.metaDescription": "SONORA store admin panel.",
            "admin.nav": "Admin panel",
            "admin.eyebrow": "ADMINISTRATION",
            "admin.heading": "Admin<span>.</span>",
            "admin.subtitle": "Sales, orders and products of the store.",
            "admin.sections": "Admin sections",
            "admin.tabOverview": "Overview",
            "admin.tabOrders": "Orders",
            "admin.tabProducts": "Products",
            "admin.myAccount": "My account",
            "admin.deniedTitle": "Restricted area.",
            "admin.deniedText": "This page is for store administrators only. Ask for access or head back to the collection.",
            "admin.deniedButton": "BACK TO STORE",
            "admin.loadError": "Could not load the data. Please try again.",
            "admin.kpiRevenue": "Revenue",
            "admin.kpiRevenue30": "{value} in the last 30 days",
            "admin.kpiOrders": "Orders sold",
            "admin.kpiAverage": "Average order",
            "admin.kpiToShip": "To ship",
            "admin.kpiToShipHint": "Confirmed, waiting to ship",
            "admin.kpiCustomers": "Customer accounts",
            "admin.statusTitle": "Orders by status",
            "admin.topTitle": "Best sellers",
            "admin.topEmpty": "No sales yet.",
            "admin.units": "{count} units",
            "admin.searchLabel": "Search",
            "admin.searchPlaceholder": "Order number, name or email",
            "admin.statusLabel": "Status",
            "admin.filterAll": "All orders",
            "admin.filterUnpaid": "Unpaid card",
            "admin.countOne": "1 order found.",
            "admin.countMany": "{count} orders found.",
            "admin.ordersEmpty": "No orders found.",
            "admin.loadMore": "LOAD MORE ↓",
            "admin.ship": "MARK AS SHIPPED",
            "admin.deliver": "MARK AS DELIVERED",
            "admin.cancel": "CANCEL ORDER",
            "admin.confirmCancel": "CONFIRM CANCELLATION",
            "admin.statusChanged": "Order {number}: {status}. The customer was notified by email.",
            "admin.guest": "guest",
            "admin.customer": "Customer",
            "admin.price": "Price (R$)",
            "admin.onSale": "On sale",
            "admin.onSaleHint": "Unchecked: removed from the store and from bags, but kept in past orders.",
            "admin.offSale": "Off sale",
            "admin.textsPt": "Portuguese texts",
            "admin.textsEn": "English texts",
            "admin.tagline": "Tagline",
            "admin.description": "Description",
            "admin.save": "SAVE PRODUCT",
            "admin.saving": "SAVING…",
            "admin.saved": "{name} saved. The store already shows the change.",
            "admin.productsSearchPlaceholder": "Code, name or series",
            "admin.filterAllProducts": "All products",
            "admin.productsCountOne": "1 product found.",
            "admin.productsCountMany": "{count} products found.",
            "admin.productsEmpty": "No products found.",
            "admin.newProduct": "+ NEW PRODUCT",
            "admin.newProductTitle": "New product",
            "admin.draftHint": "The product starts off sale (draft). After creating it, add the photos and check “On sale”.",
            "admin.create": "CREATE PRODUCT",
            "admin.creating": "CREATING…",
            "admin.created": "{name} created as a draft. Now add the photos and check “On sale”.",
            "admin.createdTranslated": "{name} created as a draft. The English texts were translated automatically: check them below. Then add the photos and check “On sale”.",
            "admin.translateHint.none": "Automatic translation is not available in this browser. Use Chrome or Edge on a computer (or set up DeepL, see the README), or write the English by hand.",
            "admin.translating": "TRANSLATING…",
            "admin.translatingShort": "TRANSLATING…",
            "admin.downloadingTranslator": "Downloading the browser translator (first time only)… {percent}%",
            "admin.translateFailed": "Automatic translation didn't work. {reason} Try again or write the English by hand.",
            "admin.translateEmpty": "First write the short line and the description in Portuguese.",
            "admin.translated": "English filled in with the translation. Review it and save.",
            "admin.translateFromPt": "TRANSLATE FROM PORTUGUESE",
            "admin.translateHint.new": "Write in Portuguese and click “Translate from Portuguese” to review it first, or leave the English blank: it is translated automatically when the product is created.",
            "admin.translateHint.edit": "Changed a Portuguese text? Click “Translate from Portuguese” to update the English.",
            "admin.translateNotAllowed": "The browser didn't allow the translator; click the button again.",
            "admin.translateDownload": "The browser couldn't download the translator (check your connection).",
            "admin.undo": "Undo",
            "admin.translateUndone": "The English is back to what it was.",
            "admin.sectionData": "Product details",
            "admin.code": "Code",
            "admin.codeHint": "E.g. X-05. It can't change later: it names the photo folder.",
            "admin.name": "Name",
            "admin.series": "Series",
            "admin.subtitle": "Brand line",
            "admin.subtitleHint": "In English, the same in both languages (e.g. Precision in motion.).",
            "admin.photos": "Photos",
            "admin.photosHint": "JPG, PNG or WebP, up to 5 MB each and 8 at most. The first one is the cover. Uploads are immediate; order, texts and removals apply when you save.",
            "admin.noPhotos": "No photos yet.",
            "admin.addPhotos": "+ ADD PHOTOS",
            "admin.uploading": "Uploading photo {current} of {total}…",
            "admin.photoInvalid": "{name}: upload a JPG, PNG or WebP up to 5 MB.",
            "admin.tooManyPhotos": "The limit is 8 photos per product.",
            "admin.cover": "COVER",
            "admin.moveLeft": "Move earlier",
            "admin.moveRight": "Move later",
            "admin.removePhoto": "Remove this photo",
            "admin.altPt": "Photo description (PT)",
            "admin.altEn": "Photo description (EN)",
            "admin.concept": "Concept",
            "admin.materials": "Materials",
            "admin.specs": "Specifications",
            "admin.specsHint": "One per line, as Label: value (e.g. Line: Limited Lab).",
            "admin.storyText": "Story text",
            "admin.story": "Story (product page)",
            "admin.storyHint": "Brand texts in English, the same in both languages.",
            "admin.storyEyebrow": "Eyebrow",
            "admin.storyTitle": "Title",
            "admin.storyHighlight": "Highlight (in blue)",
            "admin.edit": "Edit",
            "admin.close": "Close",
            "orders.status.awaiting_payment": "Awaiting payment",
            "orders.status.payment_expired": "Payment not completed",

            /* --- 404 --- */
            "notFound.title": "Page not found — SONORA®",
            "notFound.metaDescription": "Page not found.",
            "notFound.eyebrow": "ERROR 404",
            "notFound.text": "This page doesn't exist or has been moved. How about heading back to the collection?",
            "notFound.button": "SEE THE COLLECTION"
        }
    };


    /* =========================
       02. IDIOMA ATUAL
    ========================= */

    function readSaved() {
        try {
            return localStorage.getItem(STORAGE_KEY);
        } catch (error) {
            return null;
        }
    }

    // Primeira visita: português. Depois, a última escolha da pessoa.
    let lang = messages[readSaved()] ? readSaved() : DEFAULT_LANG;

    document.documentElement.lang = LOCALES[lang];

    // O HTML vem escrito em português. Em inglês, a página fica
    // invisível por um instante, até os textos serem trocados
    // (o CSS mostra a página sozinho após 1,5 s, por segurança).
    if (lang !== DEFAULT_LANG) document.documentElement.classList.add("i18n-pending");


    /* =========================
       03. TRADUÇÃO
    ========================= */

    /* t("chave", { name: "Ana" }) — troca {name} pelo valor. */
    function t(key, vars = {}) {
        const text = messages[lang][key] ?? messages[DEFAULT_LANG][key] ?? key;

        return text.replace(/\{(\w+)\}/g, (match, name) =>
            name in vars ? String(vars[name]) : match
        );
    }

    /* Aplica as traduções nos elementos marcados dentro de "root". */
    function translateDom(root = document) {
        root.querySelectorAll("[data-i18n]").forEach(element => {
            element.textContent = t(element.dataset.i18n);
        });

        // Só textos do próprio dicionário (confiáveis) usam innerHTML.
        root.querySelectorAll("[data-i18n-html]").forEach(element => {
            element.innerHTML = t(element.dataset.i18nHtml);
        });

        root.querySelectorAll("[data-i18n-attr]").forEach(element => {
            element.dataset.i18nAttr.split(";").forEach(pair => {
                const [attribute, key] = pair.split(":").map(part => part.trim());
                if (attribute && key) element.setAttribute(attribute, t(key));
            });
        });

        renderSwitchers();
    }


    /* =========================
       04. BOTÃO PT | EN
    ========================= */

    function renderSwitchers() {
        document.querySelectorAll("[data-lang-switch]").forEach(button => {
            button.setAttribute("aria-label", t("lang.switch"));

            button.querySelectorAll("[data-lang]").forEach(option => {
                option.classList.toggle("is-active", option.dataset.lang === lang);
            });
        });
    }

    function setLang(next) {
        if (!messages[next] || next === lang) return;

        lang = next;
        document.documentElement.lang = LOCALES[lang];

        try {
            localStorage.setItem(STORAGE_KEY, lang);
        } catch (error) {
            // Sem armazenamento: vale só nesta página.
        }

        translateDom();
        window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: lang }));
    }

    function toggle() {
        setLang(lang === "pt" ? "en" : "pt");
    }

    // Outra aba trocou o idioma: acompanha.
    window.addEventListener("storage", event => {
        if (event.key === STORAGE_KEY && messages[event.newValue]) setLang(event.newValue);
    });

    // Traduz a página assim que o HTML termina de carregar.
    document.addEventListener("DOMContentLoaded", () => {
        try {
            translateDom();
        } finally {
            document.documentElement.classList.remove("i18n-pending");
        }

        document.querySelectorAll("[data-lang-switch]").forEach(button => {
            button.addEventListener("click", toggle);
        });
    });

    Sonora.i18n = {
        CHANGE_EVENT,
        t,
        setLang,
        toggle,
        translateDom,
        get lang() {
            return lang;
        },
        get locale() {
            return LOCALES[lang];
        }
    };
})(window.Sonora);
