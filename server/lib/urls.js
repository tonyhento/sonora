/* =========================
   ENDEREÇO DO SITE NOS LINKS

   Usado nos links dos e-mails (nova senha, pedido) e na volta
   do Stripe. Ele NUNCA vem do cabeçalho "Host" da requisição:
   quem pede "esqueci minha senha" poderia mandar um Host falso,
   e o e-mail verdadeiro levaria a vítima para o site do atacante
   junto com o código do link (ataque "password reset poisoning").

   Produção: PUBLIC_URL do .env (obrigatório, veja config.js).
   No computador: http://localhost:PORTA.
========================= */

import { config } from "../config.js";

export function getBaseUrl() {
    return config.publicUrl || `http://localhost:${config.port}`;
}
