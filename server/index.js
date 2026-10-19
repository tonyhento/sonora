/* =========================
   SONORA — SERVIDOR

   npm run dev   → inicia e reinicia sozinho a cada alteração
   npm start     → inicia (produção)
========================= */

import { config } from "./config.js";
import { checkConnection, pool } from "./db.js";
import { createApp } from "./app.js";
import { startPaymentSync } from "./lib/payment-sync.js";

async function start() {
    try {
        const database = await checkConnection();
        console.log(`[db] Conectado ao banco "${database}".`);
    } catch (error) {
        console.error(
            "\n[db] Não foi possível conectar ao PostgreSQL.\n" +
            "     Confira se ele está rodando e se os dados do .env estão certos.\n" +
            `     Detalhe: ${error.message}\n`
        );
        process.exit(1);
    }

    const app = createApp();

    const server = app.listen(config.port, () => {
        console.log(`[sonora] Rodando em http://localhost:${config.port}`);

        // Confere com o Stripe os pedidos no cartão que ficaram parados.
        startPaymentSync();
    });

    // Encerra com calma (Ctrl+C): termina as requisições e fecha o banco.
    const shutdown = () => {
        server.close(() => pool.end().then(() => process.exit(0)));
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
}

start();
