/* =========================
   E-MAILS DA LOJA

   Monta e envia (em segundo plano) os e-mails do SONORA.
   As rotas só chamam estas funções.
========================= */

import { sendMailInBackground } from "./mailer.js";
import { orderConfirmedEmail, orderStatusEmail, passwordResetEmail } from "../emails/templates.js";

export const RESET_LINK_MINUTES = 60;

export function sendPasswordResetEmail({ user, token, lang, baseUrl }) {
    sendMailInBackground(() => ({
        to: user.email,
        ...passwordResetEmail({
            lang,
            name: user.name,
            url: `${baseUrl}/redefinir-senha.html?token=${encodeURIComponent(token)}`,
            minutes: RESET_LINK_MINUTES
        })
    }));
}

/* Pedido confirmado: com conta, o botão leva aos pedidos; sem conta, à loja. */
export function sendOrderConfirmedEmail({ order, hasAccount, lang, baseUrl }) {
    sendMailInBackground(() => ({
        to: order.customer.email,
        ...orderConfirmedEmail({
            lang,
            order,
            ordersUrl: hasAccount ? `${baseUrl}/pedidos.html` : null,
            storeUrl: `${baseUrl}/index.html`
        })
    }));
}

/* Status mudou no painel (enviado, entregue ou cancelado). */
export function sendOrderStatusEmail({ order, hasAccount, lang, baseUrl }) {
    sendMailInBackground(() => ({
        to: order.customer.email,
        ...orderStatusEmail({
            lang,
            order,
            ordersUrl: hasAccount ? `${baseUrl}/pedidos.html` : null,
            storeUrl: `${baseUrl}/index.html`
        })
    }));
}
