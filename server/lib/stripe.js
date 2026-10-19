/* =========================
   CLIENTE DO STRIPE (MODO DE TESTE)

   Criado só na primeira vez que é usado, e só se houver
   STRIPE_SECRET_KEY no .env (o config.js recusa chaves reais).
========================= */

import Stripe from "stripe";

import { config } from "../config.js";

let client = null;

export function isStripeEnabled() {
    return Boolean(config.stripe.secretKey);
}

export function getStripe() {
    if (!client) {
        const options = {};

        // Testes automatizados apontam para um Stripe simulado.
        if (config.stripe.apiHost) {
            const [host, port] = config.stripe.apiHost.split(":");
            Object.assign(options, { host, port, protocol: "http" });
        }

        client = new Stripe(config.stripe.secretKey, options);
    }

    return client;
}
