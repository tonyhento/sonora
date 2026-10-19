/* =========================
   CONFIGURAÇÃO

   Lê as variáveis do arquivo .env (veja .env.example).
   Falha cedo, com mensagem clara, se algo essencial faltar.
========================= */

import dotenv from "dotenv";

dotenv.config({ quiet: true });

const isProduction = process.env.NODE_ENV === "production";

function required(name) {
    const value = process.env[name];

    if (!value) {
        throw new Error(
            `Variável de ambiente "${name}" não definida. ` +
            "Copie o arquivo .env.example para .env e preencha os valores."
        );
    }

    return value;
}

const sessionSecret = required("SESSION_SECRET");

// Pagamento com cartão (Stripe). Opcional: sem a chave, Pix e boleto
// continuam funcionando e o cartão responde que não está configurado.
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || null;

// Projeto de estudo: só chaves de TESTE (nenhuma cobrança real).
if (stripeSecretKey && !/^(sk|rk)_test_/.test(stripeSecretKey)) {
    throw new Error(
        "STRIPE_SECRET_KEY precisa ser uma chave de TESTE (começa com sk_test_). " +
        "Este projeto não aceita chaves reais."
    );
}

// Links dos e-mails e volta do Stripe usam este endereço (veja lib/urls.js).
if (isProduction && !process.env.PUBLIC_URL) {
    throw new Error(
        'PUBLIC_URL não definida. Em produção, informe o endereço do site ' +
        '(ex.: PUBLIC_URL=https://sonora.onrender.com).'
    );
}

if (isProduction && sessionSecret.length < 32) {
    throw new Error("SESSION_SECRET precisa ter pelo menos 32 caracteres em produção.");
}

export const config = {
    isProduction,
    port: Number(process.env.PORT) || 3000,
    sessionSecret,

    // Em produção (Render, Railway, Neon...) normalmente vem uma URL única.
    // Localmente, o pacote "pg" lê PGHOST, PGUSER, PGPASSWORD... sozinho.
    databaseUrl: process.env.DATABASE_URL || null,
    databaseSsl: process.env.DATABASE_SSL === "true",

    // Endereço público do site (ex.: https://sonora.onrender.com), usado nos
    // links de volta do Stripe. Sem ele, vale o endereço da própria requisição.
    publicUrl: process.env.PUBLIC_URL?.replace(/\/+$/, "") || null,

    email: {
        // Remetente que aparece para o cliente.
        from: process.env.EMAIL_FROM || "SONORA <no-reply@sonora.local>",

        // Com SMTP_HOST, os e-mails são enviados de verdade (Gmail,
        // Mailtrap, Resend...). Sem ele, cada e-mail vira um arquivo
        // .html na pasta "outbox/" — dá para abrir no navegador.
        smtp: process.env.SMTP_HOST
            ? {
                host: process.env.SMTP_HOST,
                port: Number(process.env.SMTP_PORT) || 587,
                secure: process.env.SMTP_SECURE === "true", // true na porta 465
                auth: process.env.SMTP_USER
                    ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
                    : undefined
            }
            : null
    },

    // Tradução automática no painel (opcional). Chave grátis em deepl.com
    // (plano "DeepL API Free": termina com ":fx" e usa o endereço api-free).
    translate: {
        deeplKey: process.env.DEEPL_API_KEY || null,
        deeplUrl: (process.env.DEEPL_API_URL ||
            (process.env.DEEPL_API_KEY?.endsWith(":fx")
                ? "https://api-free.deepl.com"
                : "https://api.deepl.com")).replace(/\/+$/, "")
    },

    stripe: {
        secretKey: stripeSecretKey,
        // Opcional: confirma pagamentos mesmo se o cliente fechar a aba (webhook).
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || null,
        // Só para testes automatizados (Stripe simulado), ex.: localhost:12111
        apiHost: process.env.STRIPE_API_HOST || null
    }
};
