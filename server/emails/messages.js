/* =========================
   TEXTOS DOS E-MAILS (PT / EN)

   Mesmo esquema do site: { chave: "texto com {variáveis}" }.
   O idioma vem da requisição (cabeçalho Accept-Language) ou,
   no caso do pedido, do idioma salvo junto com ele.
========================= */

export const emailMessages = {
    pt: {
        "footer": "SONORA® — Beyond Vision. Projeto de estudo: marca e produtos fictícios.",
        "fallback": "Se o botão não funcionar, copie e cole este endereço no navegador:",

        "reset.subject": "Redefina sua senha — SONORA",
        "reset.preheader": "Use o link para criar uma nova senha. Ele vale por {minutes} minutos.",
        "reset.title": "Nova <span>senha.</span>",
        "reset.greeting": "Olá, {name}.",
        "reset.text": "Recebemos um pedido para redefinir a senha da sua conta SONORA. Clique no botão abaixo para criar uma nova senha. O link vale por {minutes} minutos e só pode ser usado uma vez.",
        "reset.button": "CRIAR NOVA SENHA",
        "reset.ignore": "Se não foi você, ignore este e-mail: sua senha continua a mesma.",

        "order.subject": "Pedido {number} confirmado — SONORA",
        "order.preheader": "Recebemos seu pedido {number}. Total: {total}.",
        "order.title": "Pedido <span>confirmado.</span>",
        "order.greeting": "Obrigado, {name}.",
        "order.text": "Recebemos seu pedido {number} e ele já está confirmado. Confira os detalhes abaixo.",
        "order.items": "Itens",
        "order.subtotal": "Subtotal",
        "order.discount": "Desconto Pix",
        "order.shipping": "Frete",
        "order.free": "Grátis",
        "order.total": "Total",
        "order.delivery": "Entrega",
        "order.payment": "Pagamento",
        "order.buttonAccount": "VER MEUS PEDIDOS",
        "order.buttonGuest": "VOLTAR À LOJA",
        "order.note": "Projeto demonstrativo: nenhuma cobrança real foi feita.",

        "status.shipped.subject": "Pedido {number} enviado — SONORA",
        "status.shipped.title": "Pedido <span>enviado.</span>",
        "status.shipped.text": "Seu pedido {number} saiu para entrega. Em breve ele chega no endereço abaixo.",
        "status.delivered.subject": "Pedido {number} entregue — SONORA",
        "status.delivered.title": "Pedido <span>entregue.</span>",
        "status.delivered.text": "Seu pedido {number} foi entregue. Esperamos que você goste da sua nova perspectiva.",
        "status.cancelled.subject": "Pedido {number} cancelado — SONORA",
        "status.cancelled.title": "Pedido <span>cancelado.</span>",
        "status.cancelled.text": "Seu pedido {number} foi cancelado pela loja. Como este é um projeto demonstrativo, nenhuma cobrança real foi feita.",
        "status.greeting": "Olá, {name}.",

        "payment.pix": "Pix (simulado)",
        "payment.boleto": "Boleto (simulado)",
        "payment.card": "Cartão de crédito — Stripe (modo de teste)"
    },

    en: {
        "footer": "SONORA® — Beyond Vision. Study project: fictional brand and products.",
        "fallback": "If the button doesn't work, copy and paste this address into your browser:",

        "reset.subject": "Reset your password — SONORA",
        "reset.preheader": "Use the link to create a new password. It is valid for {minutes} minutes.",
        "reset.title": "New <span>password.</span>",
        "reset.greeting": "Hello, {name}.",
        "reset.text": "We received a request to reset the password of your SONORA account. Click the button below to create a new password. The link is valid for {minutes} minutes and can only be used once.",
        "reset.button": "CREATE NEW PASSWORD",
        "reset.ignore": "If this wasn't you, ignore this email: your password stays the same.",

        "order.subject": "Order {number} confirmed — SONORA",
        "order.preheader": "We received your order {number}. Total: {total}.",
        "order.title": "Order <span>confirmed.</span>",
        "order.greeting": "Thank you, {name}.",
        "order.text": "We received your order {number} and it is confirmed. See the details below.",
        "order.items": "Items",
        "order.subtotal": "Subtotal",
        "order.discount": "Pix discount",
        "order.shipping": "Shipping",
        "order.free": "Free",
        "order.total": "Total",
        "order.delivery": "Delivery",
        "order.payment": "Payment",
        "order.buttonAccount": "VIEW MY ORDERS",
        "order.buttonGuest": "BACK TO STORE",
        "order.note": "Demo project: no real charge was made.",

        "status.shipped.subject": "Order {number} shipped — SONORA",
        "status.shipped.title": "Order <span>shipped.</span>",
        "status.shipped.text": "Your order {number} is on its way. It will arrive at the address below soon.",
        "status.delivered.subject": "Order {number} delivered — SONORA",
        "status.delivered.title": "Order <span>delivered.</span>",
        "status.delivered.text": "Your order {number} has been delivered. We hope you enjoy your new perspective.",
        "status.cancelled.subject": "Order {number} cancelled — SONORA",
        "status.cancelled.title": "Order <span>cancelled.</span>",
        "status.cancelled.text": "Your order {number} was cancelled by the store. Since this is a demo project, no real charge was made.",
        "status.greeting": "Hello, {name}.",

        "payment.pix": "Pix (simulated)",
        "payment.boleto": "Boleto (simulated)",
        "payment.card": "Credit card — Stripe (test mode)"
    }
};
