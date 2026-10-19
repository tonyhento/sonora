/* =========================
   PAGAMENTO COM CARTÃO (STRIPE CHECKOUT)

   1. O pedido é criado como "awaiting_payment" (aguardando).
   2. createCheckoutSession abre uma sessão no Stripe com os
      itens e preços DO BANCO, e o cliente é levado para a
      página segura do Stripe. O cartão nunca passa pelo SONORA.
   3. Na volta (ou pelo webhook), settleSession pergunta ao
      Stripe se a sessão foi paga e, só então, confirma o pedido.
========================= */

import * as Orders from "../repositories/orders.js";
import * as SavedItems from "../repositories/saved-items.js";
import { getStripe } from "./stripe.js";
import { toCents } from "./money.js";
import { sendOrderConfirmedEmail } from "./notifications.js";

const CURRENCY = "brl";
const SESSION_MINUTES = 30; // mínimo aceito pelo Stripe

export async function createCheckoutSession(order, { baseUrl, lang }) {
    return getStripe().checkout.sessions.create({
        mode: "payment",
        allowed_payment_method_types: ["card"],

        line_items: order.items.map(item => ({
            quantity: item.quantity,
            price_data: {
                currency: CURRENCY,
                unit_amount: toCents(item.unitPrice),
                product_data: { name: item.name }
            }
        })),

        customer_email: order.customer.email,
        client_reference_id: order.number,
        metadata: { orderNumber: order.number },

        locale: lang === "en" ? "en" : "pt-BR",
        expires_at: Math.floor(Date.now() / 1000) + SESSION_MINUTES * 60,

        // {CHECKOUT_SESSION_ID} é trocado pelo Stripe pelo id da sessão.
        success_url: `${baseUrl}/checkout.html?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/checkout.html?payment=cancelled`
    });
}

/*
   Confere a sessão com o Stripe e confirma o pedido se ela foi
   paga com o valor certo. Pode ser chamada várias vezes (retorno
   do cliente e webhook): o pedido só muda de estado uma vez.
   Retorna o pedido atualizado, ou null se a sessão não for nossa.
   "baseUrl" é usado nos links do e-mail de confirmação.
*/
export async function settleSession(session, { baseUrl }) {
    const record = await Orders.findByStripeSession(session.id);
    if (!record) return null;

    const isPaid =
        session.payment_status === "paid" &&
        session.currency === CURRENCY &&
        session.amount_total === toCents(record.order.total);

    if (isPaid && record.order.status === Orders.AWAITING_PAYMENT) {
        const confirmed = await Orders.markPaid(record.id);

        if (confirmed) {
            // Compra concluída: a sacola salva na conta também é esvaziada.
            if (record.userId) await SavedItems.clearCart(record.userId);

            const updated = await Orders.findByStripeSession(session.id);

            // Só quem confirmou de fato envia o e-mail (uma vez por pedido).
            sendOrderConfirmedEmail({
                order: updated.order,
                hasAccount: Boolean(record.userId),
                lang: record.lang,
                baseUrl
            });

            return updated.order;
        }
    }

    return (await Orders.findByStripeSession(session.id)).order;
}

/* Sessão expirou sem pagamento: o pedido não vale mais (e o estoque volta).
   Retorna true se o pedido mudou agora. */
export function expireSession(session) {
    return Orders.markPaymentExpired(session.id);
}

export async function retrieveSession(sessionId) {
    return getStripe().checkout.sessions.retrieve(sessionId);
}
