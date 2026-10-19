/* =========================
   ROTAS DE PAGAMENTO — /api/payments (Stripe, modo de teste)

   POST /confirm    o cliente voltou do Stripe: confere a sessão
                    com o Stripe e devolve o pedido confirmado
   POST /webhook    aviso do próprio Stripe (opcional, precisa de
                    STRIPE_WEBHOOK_SECRET): confirma o pedido mesmo
                    se o cliente fechar a aba antes de voltar
========================= */

import express, { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";

import { config } from "../config.js";
import { t } from "../lib/i18n.js";
import { HttpError, notFound } from "../lib/http-error.js";
import { getStripe, isStripeEnabled } from "../lib/stripe.js";
import { expireSession, retrieveSession, settleSession } from "../lib/payments.js";
import * as Orders from "../repositories/orders.js";
import { validate } from "../middleware/validate.js";
import { getBaseUrl } from "../lib/urls.js";

const confirmSchema = z.object({
    sessionId: z.string().regex(/^cs_[A-Za-z0-9_]{1,250}$/, "payments.invalidSession")
});

const confirmLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 60,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: req => ({ error: t(req, "orders.tooMany") })
});

export const paymentsRouter = Router();


/* ---------- Volta do cliente ---------- */

paymentsRouter.post("/confirm", confirmLimiter, validate(confirmSchema), async (req, res) => {
    if (!isStripeEnabled()) throw new HttpError(503, "payments.unavailable");

    let checkoutSession;

    try {
        checkoutSession = await retrieveSession(req.body.sessionId);
    } catch (error) {
        // Sessão inexistente (ou de outra conta do Stripe).
        throw notFound("orders.notFound");
    }

    const order = await settleSession(checkoutSession, { baseUrl: getBaseUrl() });

    if (!order) throw notFound("orders.notFound");
    if (order.status === Orders.AWAITING_PAYMENT || order.status === Orders.PAYMENT_EXPIRED) {
        throw new HttpError(409, "payments.notPaid");
    }

    res.json({ order });
});


/* ---------- Webhook do Stripe ----------
   Precisa do corpo ORIGINAL (bytes) para conferir a assinatura,
   por isso este roteador é montado antes do express.json (app.js). */

export const stripeWebhookRouter = Router();

stripeWebhookRouter.post("/", express.raw({ type: "application/json", limit: "1mb" }), async (req, res) => {
    if (!config.stripe.webhookSecret || !isStripeEnabled()) {
        return res.status(404).json({ error: t(req, "errors.routeNotFound") });
    }

    let event;

    try {
        event = getStripe().webhooks.constructEvent(
            req.body,
            req.headers["stripe-signature"],
            config.stripe.webhookSecret
        );
    } catch (error) {
        // Assinatura inválida: não veio do Stripe.
        return res.status(400).json({ error: t(req, "errors.invalidRequest") });
    }

    const checkoutSession = event.data.object;

    switch (event.type) {
        case "checkout.session.completed":
        case "checkout.session.async_payment_succeeded":
            await settleSession(checkoutSession, { baseUrl: getBaseUrl() });
            break;

        case "checkout.session.expired":
            await expireSession(checkoutSession);
            break;

        default:
            // Outros eventos não interessam a esta loja.
            break;
    }

    res.json({ received: true });
});
