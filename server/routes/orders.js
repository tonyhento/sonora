/* =========================
   ROTAS DE PEDIDOS — /api/orders

   POST /           cria um pedido (com ou sem login)
                    Cartão: responde também "paymentUrl", a página
                    do Stripe onde o cliente paga (modo de teste).
   GET  /           pedidos do usuário logado
   GET  /:number    um pedido do usuário logado
========================= */

import { Router } from "express";
import rateLimit from "express-rate-limit";
import { t } from "../lib/i18n.js";

import * as Orders from "../repositories/orders.js";
import * as SavedItems from "../repositories/saved-items.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { createOrderSchema } from "../schemas.js";
import { badRequest, notFound, HttpError } from "../lib/http-error.js";
import { getLang } from "../lib/i18n.js";
import { isStripeEnabled } from "../lib/stripe.js";
import { createCheckoutSession } from "../lib/payments.js";
import { getBaseUrl } from "../lib/urls.js";
import { sendOrderConfirmedEmail } from "../lib/notifications.js";
import { toCents, fromCents } from "../lib/money.js";

const PIX_DISCOUNT = 0.05;

const orderLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: req => ({ error: t(req, "orders.tooMany") })
});

export const ordersRouter = Router();


/*
   Monta os itens com nome e preço VINDOS DO BANCO.
   O navegador só informa quais produtos e quantas unidades.
*/
async function priceItems(requestedItems) {
    // Agrupa repetidos: [{id:1, q:1}, {id:1, q:2}] → {1: 3}
    const quantities = new Map();

    for (const { id, quantity } of requestedItems) {
        quantities.set(id, (quantities.get(id) || 0) + quantity);
    }

    const products = await Orders.findActiveProducts([...quantities.keys()]);

    if (products.length !== quantities.size) {
        throw badRequest("orders.productUnavailable");
    }

    return products.map(product => ({
        productId: product.id,
        name: product.name,
        unitPrice: product.price,
        quantity: Math.min(quantities.get(product.id), 99)
    }));
}

function calculateTotals(items, payment) {
    const subtotalCents = items.reduce(
        (total, item) => total + toCents(item.unitPrice) * item.quantity,
        0
    );

    const discountCents = payment === "pix" ? Math.round(subtotalCents * PIX_DISCOUNT) : 0;

    return {
        subtotal: fromCents(subtotalCents),
        discount: fromCents(discountCents),
        total: fromCents(subtotalCents - discountCents)
    };
}


ordersRouter.post("/", orderLimiter, validate(createOrderSchema), async (req, res) => {
    const { customer, address, payment, items: requestedItems } = req.body;

    const items = await priceItems(requestedItems);
    const totals = calculateTotals(items, payment);

    const userId = req.session.userId ?? null;
    const isCard = payment === "card";
    const lang = getLang(req);
    const baseUrl = getBaseUrl();

    if (isCard && !isStripeEnabled()) {
        throw new HttpError(503, "payments.unavailable");
    }

    let order;

    try {
        order = await Orders.create({
            userId, customer, address, payment, items, totals, lang,
            // Cartão só vale depois que o Stripe confirmar o pagamento.
            status: isCard ? Orders.AWAITING_PAYMENT : Orders.CONFIRMED
        });
    } catch (error) {
        // Alguém comprou as últimas unidades antes: nada foi gravado.
        if (error instanceof Orders.OutOfStockError) throw new HttpError(409, "orders.outOfStock");
        throw error;
    }

    if (!isCard) {
        // Pix e boleto (simulados): compra concluída na hora.
        if (userId) await SavedItems.clearCart(userId);
        sendOrderConfirmedEmail({ order, hasAccount: Boolean(userId), lang, baseUrl });
        return res.status(201).json({ order });
    }

    try {
        const checkoutSession = await createCheckoutSession(order, { baseUrl, lang });

        await Orders.setStripeSession(order.number, checkoutSession.id);

        res.status(201).json({ order, paymentUrl: checkoutSession.url });
    } catch (error) {
        console.error("[stripe] Não foi possível criar a sessão de pagamento.", error.message);
        await Orders.cancelUnpaid(order.number);
        throw new HttpError(502, "payments.startFailed");
    }
});


ordersRouter.get("/", requireAuth, async (req, res) => {
    const orders = await Orders.findByUser(req.session.userId);
    res.json({ orders });
});


ordersRouter.get("/:number", requireAuth, async (req, res) => {
    const order = await Orders.findByNumberForUser(req.params.number, req.session.userId);

    if (!order) throw notFound("orders.notFound");

    res.json({ order });
});
