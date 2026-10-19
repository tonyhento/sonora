/* =========================
   MENSAGENS DO SERVIDOR (PT / EN)

   As rotas e os esquemas de validação usam CHAVES
   (ex.: "auth.invalidCredentials"). O texto final é
   escolhido na hora de responder, conforme o idioma que o
   navegador pediu no cabeçalho Accept-Language
   (o site envia "pt-BR" ou "en-US" — veja public/api.js).
========================= */

const DEFAULT_LANG = "pt";

const messages = {
    pt: {
        "errors.checkFields": "Confira os campos destacados.",
        "errors.notFound": "Não encontrado.",
        "errors.routeNotFound": "Rota não encontrada.",
        "errors.invalidRequest": "Requisição inválida.",
        "errors.unexpected": "Algo deu errado. Tente novamente em instantes.",
        "errors.loginRequired": "Faça login para continuar.",
        "errors.forbidden": "Esta área é só para administradores.",

        "admin.invalidTransition": "Este pedido não pode mudar para esse status (ele pode ter sido alterado agora há pouco). Atualize a lista.",
        "admin.invalidStatus": "Status inválido.",
        "admin.productNotFound": "Produto não encontrado.",
        "admin.priceInvalid": "Informe um preço entre R$ 1,00 e R$ 99.999,99.",
        "admin.taglineRequired": "Informe a frase curta.",
        "admin.descriptionRequired": "Informe a descrição.",
        "admin.codeInvalid": "Use de 2 a 10 caracteres: letras, números e hífen (ex.: X-05).",
        "admin.codeTaken": "Já existe um produto com este código.",
        "admin.nameRequired": "Informe o nome do produto.",
        "admin.seriesRequired": "Informe a série.",
        "admin.needsImage": "Adicione pelo menos uma foto antes de colocar o produto à venda.",
        "admin.imageInvalid": "Envie uma imagem JPG, PNG ou WebP.",
        "admin.tooManyImages": "Este produto já tem o máximo de 8 fotos.",
        "admin.specsInvalid": "Confira as especificações: uma por linha, no formato Rótulo: valor (até 12).",
        "translate.unavailable": "A tradução pelo servidor não está configurada (DEEPL_API_KEY).",
        "translate.failed": "O serviço de tradução não respondeu. Tente de novo em instantes.",
        "translate.badKey": "A chave do DeepL foi recusada. Confira a DEEPL_API_KEY no .env.",
        "translate.quota": "A cota mensal do DeepL acabou.",
        "translate.tooMany": "Muitas traduções seguidas. Espere um minuto e tente de novo.",
        "translate.tooLong": "Texto grande demais para traduzir de uma vez.",
        "errors.tooLarge": "Arquivo grande demais. O limite para fotos é 5 MB.",

        "auth.emailTaken": "Este e-mail já tem uma conta. Tente entrar.",
        "auth.invalidCredentials": "E-mail ou senha incorretos.",
        "auth.tooManyAttempts": "Muitas tentativas. Aguarde alguns minutos e tente de novo.",
        "auth.resetInvalid": "Este link de redefinição é inválido, já foi usado ou expirou. Peça um novo.",

        "users.notFound": "Conta não encontrada.",
        "users.wrongPassword": "Senha atual incorreta.",
        "users.samePassword": "A nova senha precisa ser diferente da atual.",

        "orders.productUnavailable": "Um dos produtos da sacola não está mais disponível.",
        "orders.notFound": "Pedido não encontrado.",
        "orders.tooMany": "Muitos pedidos em pouco tempo. Aguarde alguns minutos.",
        "orders.outOfStock": "Algum produto da sacola não tem mais unidades suficientes. A sacola foi atualizada: confira e tente de novo.",
        "admin.stockInvalid": "Informe um número inteiro de 0 a 99.999, ou deixe em branco para não controlar.",

        "payments.unavailable": "O pagamento com cartão não está configurado neste servidor (falta a STRIPE_SECRET_KEY no .env). Escolha Pix ou boleto.",
        "payments.startFailed": "Não foi possível abrir o pagamento agora. Tente novamente em instantes.",
        "payments.notPaid": "O pagamento ainda não foi confirmado pelo Stripe. Nada foi cobrado.",
        "payments.invalidSession": "Sessão de pagamento inválida.",

        "validation.name": "Informe seu nome completo.",
        "validation.nameTooLong": "Nome muito longo.",
        "validation.fullName": "Informe nome e sobrenome.",
        "validation.emailTooLong": "E-mail muito longo.",
        "validation.email": "Digite um e-mail válido.",
        "validation.phone": "Celular inválido. Use DDD + número.",
        "validation.passwordLength": "A senha precisa ter pelo menos 8 caracteres.",
        "validation.passwordMax": "A senha pode ter no máximo 72 caracteres.",
        "validation.passwordMix": "Use letras e números na senha.",
        "validation.password": "Informe sua senha.",
        "validation.currentPassword": "Informe sua senha atual.",
        "validation.textTooLong": "Texto muito longo.",
        "validation.cep": "O CEP precisa ter 8 dígitos.",
        "validation.street": "Informe o endereço.",
        "validation.number": "Informe o número (ou S/N).",
        "validation.district": "Informe o bairro.",
        "validation.city": "Informe a cidade.",
        "validation.state": "Selecione o estado.",
        "validation.payment": "Escolha a forma de pagamento.",
        "validation.emptyCart": "A sacola está vazia."
    },

    en: {
        "errors.checkFields": "Please check the highlighted fields.",
        "errors.notFound": "Not found.",
        "errors.routeNotFound": "Route not found.",
        "errors.invalidRequest": "Invalid request.",
        "errors.unexpected": "Something went wrong. Please try again in a moment.",
        "errors.loginRequired": "Please sign in to continue.",
        "errors.forbidden": "This area is for administrators only.",

        "admin.invalidTransition": "This order can't move to that status (it may have just been changed). Refresh the list.",
        "admin.invalidStatus": "Invalid status.",
        "admin.productNotFound": "Product not found.",
        "admin.priceInvalid": "Enter a price between R$1.00 and R$99,999.99.",
        "admin.taglineRequired": "Enter the short tagline.",
        "admin.descriptionRequired": "Enter the description.",
        "admin.codeInvalid": "Use 2 to 10 characters: letters, numbers and hyphens (e.g. X-05).",
        "admin.codeTaken": "A product with this code already exists.",
        "admin.nameRequired": "Enter the product name.",
        "admin.seriesRequired": "Enter the series.",
        "admin.needsImage": "Add at least one photo before putting the product on sale.",
        "admin.imageInvalid": "Upload a JPG, PNG or WebP image.",
        "admin.tooManyImages": "This product already has the maximum of 8 photos.",
        "admin.specsInvalid": "Check the specifications: one per line, as Label: value (up to 12).",
        "translate.unavailable": "Server translation is not set up (DEEPL_API_KEY).",
        "translate.failed": "The translation service did not respond. Try again in a moment.",
        "translate.badKey": "DeepL rejected the key. Check DEEPL_API_KEY in .env.",
        "translate.quota": "The monthly DeepL quota is used up.",
        "translate.tooMany": "Too many translations in a row. Wait a minute and try again.",
        "translate.tooLong": "Text too long to translate at once.",
        "errors.tooLarge": "File too large. The photo limit is 5 MB.",

        "auth.emailTaken": "This email already has an account. Try signing in.",
        "auth.invalidCredentials": "Incorrect email or password.",
        "auth.tooManyAttempts": "Too many attempts. Wait a few minutes and try again.",
        "auth.resetInvalid": "This reset link is invalid, already used or expired. Please request a new one.",

        "users.notFound": "Account not found.",
        "users.wrongPassword": "Current password is incorrect.",
        "users.samePassword": "The new password must be different from the current one.",

        "orders.productUnavailable": "One of the products in your bag is no longer available.",
        "orders.notFound": "Order not found.",
        "orders.tooMany": "Too many orders in a short time. Please wait a few minutes.",
        "orders.outOfStock": "A product in your bag no longer has enough units. Your bag was updated: check it and try again.",
        "admin.stockInvalid": "Enter a whole number from 0 to 99,999, or leave it blank to not track stock.",

        "payments.unavailable": "Card payment is not configured on this server (STRIPE_SECRET_KEY is missing from .env). Choose Pix or boleto.",
        "payments.startFailed": "Could not open the payment page right now. Please try again in a moment.",
        "payments.notPaid": "The payment has not been confirmed by Stripe yet. Nothing was charged.",
        "payments.invalidSession": "Invalid payment session.",

        "validation.name": "Enter your full name.",
        "validation.nameTooLong": "Name is too long.",
        "validation.fullName": "Enter your first and last name.",
        "validation.emailTooLong": "Email is too long.",
        "validation.email": "Enter a valid email address.",
        "validation.phone": "Invalid mobile number. Include the area code.",
        "validation.passwordLength": "Password must be at least 8 characters.",
        "validation.passwordMax": "Password can have at most 72 characters.",
        "validation.passwordMix": "Use both letters and numbers.",
        "validation.password": "Enter your password.",
        "validation.currentPassword": "Enter your current password.",
        "validation.textTooLong": "Text is too long.",
        "validation.cep": "The postal code must have 8 digits.",
        "validation.street": "Enter the address.",
        "validation.number": "Enter the number (or S/N).",
        "validation.district": "Enter the neighborhood.",
        "validation.city": "Enter the city.",
        "validation.state": "Select the state.",
        "validation.payment": "Choose a payment method.",
        "validation.emptyCart": "Your bag is empty."
    }
};

/* "en-US,en;q=0.9" → "en". Qualquer outro idioma → português. */
export function getLang(req) {
    const header = String(req.headers["accept-language"] || "").trim().toLowerCase();
    return header.startsWith("en") ? "en" : DEFAULT_LANG;
}

/* Texto da chave no idioma; se não for uma chave conhecida, devolve como veio. */
export function translate(lang, key) {
    return messages[lang]?.[key] ?? messages[DEFAULT_LANG][key] ?? key;
}

/* Atalho para as rotas: res.json({ error: t(req, "chave") }). */
export function t(req, key) {
    return translate(getLang(req), key);
}
