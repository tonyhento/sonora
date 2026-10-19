/* =========================
   APLICAÇÃO EXPRESS

   Monta a aplicação: segurança, sessão, API e os arquivos
   do site (pasta public/). Fica separado do index.js para
   poder ser usado em testes sem abrir uma porta.
========================= */

import path from "node:path";
import { fileURLToPath } from "node:url";

import express from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import helmet from "helmet";

import { config } from "./config.js";
import { pool } from "./db.js";
import { SESSION_COOKIE } from "./lib/session.js";
import { authRouter } from "./routes/auth.js";
import { usersRouter } from "./routes/users.js";
import { ordersRouter } from "./routes/orders.js";
import { productsRouter } from "./routes/products.js";
import { paymentsRouter, stripeWebhookRouter } from "./routes/payments.js";
import { adminRouter } from "./routes/admin.js";
import { cartRouter, favoritesRouter } from "./routes/saved-items.js";
import { errorHandler, notFoundHandler } from "./middleware/error-handler.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, "..", "public");

const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

export function createApp() {
    const app = express();
    const PgStore = connectPgSimple(session);

    // Atrás de um proxy (Render, Railway...) o HTTPS chega pelo proxy.
    if (config.isProduction) app.set("trust proxy", 1);

    app.disable("x-powered-by");


    /* ---------- Cabeçalhos de segurança ---------- */

    app.use(helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'"],
                styleSrc: ["'self'", "https://fonts.googleapis.com"],
                fontSrc: ["'self'", "https://fonts.gstatic.com"],
                imgSrc: ["'self'", "data:"],
                connectSrc: ["'self'", "https://viacep.com.br"],
                objectSrc: ["'none'"],
                frameAncestors: ["'none'"],
                upgradeInsecureRequests: config.isProduction ? [] : null
            }
        }
    }));


    /* ---------- Corpo das requisições ---------- */

    // O webhook do Stripe lê o corpo original (para conferir a
    // assinatura), então vem antes do express.json.
    app.use("/api/payments/webhook", stripeWebhookRouter);

    app.use(express.json({ limit: "20kb" }));


    /* ---------- Sessão de login (guardada no PostgreSQL) ---------- */

    app.use(session({
        name: SESSION_COOKIE,
        secret: config.sessionSecret,
        store: new PgStore({
            pool,
            tableName: "session",
            pruneSessionInterval: 60 * 60 // limpa sessões vencidas a cada hora
        }),
        resave: false,
        saveUninitialized: false, // só cria cookie depois do login
        rolling: true,            // renova o prazo a cada visita
        cookie: {
            httpOnly: true,        // o JavaScript da página não lê o cookie
            sameSite: "lax",       // protege contra envio por outros sites
            secure: config.isProduction,
            maxAge: SEVEN_DAYS
        }
    }));


    /* ---------- API ---------- */

    app.use("/api/products", productsRouter);
    app.use("/api/auth", authRouter);
    app.use("/api/users", usersRouter);
    app.use("/api/orders", ordersRouter);
    app.use("/api/payments", paymentsRouter);
    app.use("/api/admin", adminRouter);
    app.use("/api/cart", cartRouter);
    app.use("/api/favorites", favoritesRouter);
    app.use("/api", notFoundHandler);


    /* ---------- Site (HTML, CSS, JS e imagens) ---------- */

    app.use(express.static(PUBLIC_DIR, {
        extensions: ["html"], // /login funciona igual a /login.html
        index: "index.html"
    }));

    app.use((req, res) => {
        res.status(404).sendFile(path.join(PUBLIC_DIR, "404.html"));
    });

    app.use(errorHandler);

    return app;
}
