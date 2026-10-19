/* =========================
   CONFERÊNCIA AUTOMÁTICA DOS PAGAMENTOS (Stripe)

   Sem webhook (o normal rodando no próprio PC), um pedido no
   cartão só é confirmado quando o cliente VOLTA do Stripe. Se ele
   paga e fecha a aba, o pedido ficaria "aguardando pagamento" para
   sempre; se desiste, as unidades ficariam presas no estoque.

   Por isso, a cada poucos minutos o servidor pergunta ao Stripe
   como estão os pedidos parados:
   - pago     → confirma (e envia o e-mail de pedido confirmado);
   - expirado → o pedido perde o efeito e o estoque volta.
   A sessão de pagamento expira 30 minutos depois de aberta.
========================= */

import * as Orders from "../repositories/orders.js";
import { isStripeEnabled } from "./stripe.js";
import { expireSession, retrieveSession, settleSession } from "./payments.js";
import { getBaseUrl } from "./urls.js";

const INTERVAL_MS = 5 * 60 * 1000;   // a cada 5 minutos
const MIN_AGE_MINUTES = 2;           // dá tempo de o cliente voltar sozinho
const NO_SESSION_MINUTES = 10;       // pedido que nem chegou a abrir o Stripe

let running = false;

/* Uma rodada de conferência. Retorna o que mudou (útil nos testes). */
export async function syncPendingPayments() {
    if (!isStripeEnabled() || running) return { confirmed: 0, expired: 0 };

    running = true;
    const result = { confirmed: 0, expired: 0 };

    try {
        const pending = await Orders.findAwaitingPayment({ olderThanMinutes: MIN_AGE_MINUTES });

        for (const order of pending) {
            try {
                if (!order.sessionId) {
                    // A sessão do Stripe não chegou a ser criada.
                    const ageMinutes = (Date.now() - new Date(order.createdAt)) / 60000;
                    if (ageMinutes >= NO_SESSION_MINUTES && await Orders.cancelUnpaid(order.number)) {
                        result.expired++;
                    }
                    continue;
                }

                const session = await retrieveSession(order.sessionId);

                if (session.payment_status === "paid") {
                    const settled = await settleSession(session, { baseUrl: getBaseUrl() });
                    if (settled?.status === Orders.CONFIRMED) result.confirmed++;
                } else if (session.status === "expired") {
                    if (await expireSession(session)) result.expired++;
                }
            } catch (error) {
                // Um pedido com problema não impede a conferência dos outros.
                console.error(`[pagamentos] Não foi possível conferir ${order.number}:`, error.message);
            }
        }
    } finally {
        running = false;
    }

    if (result.confirmed || result.expired) {
        console.log(`[pagamentos] Conferência: ${result.confirmed} confirmado(s), ${result.expired} expirado(s).`);
    }

    return result;
}

/* Liga a conferência: uma vez ao iniciar e depois a cada 5 minutos. */
export function startPaymentSync() {
    if (!isStripeEnabled()) return;

    const run = () => syncPendingPayments().catch(error => {
        console.error("[pagamentos] Falha na conferência:", error.message);
    });

    run();
    setInterval(run, INTERVAL_MS).unref();
}
