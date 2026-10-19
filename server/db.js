/* =========================
   CONEXÃO COM O POSTGRESQL

   Um "pool" mantém algumas conexões abertas e reaproveita
   entre as requisições, em vez de abrir uma por consulta.
========================= */

import pg from "pg";
import { config } from "./config.js";

const poolOptions = config.databaseUrl
    ? { connectionString: config.databaseUrl }
    : {}; // Usa PGHOST, PGPORT, PGUSER, PGPASSWORD e PGDATABASE do .env

if (config.databaseSsl) {
    poolOptions.ssl = { rejectUnauthorized: false };
}

export const pool = new pg.Pool({
    ...poolOptions,
    max: 10,
    idleTimeoutMillis: 30_000
});

pool.on("error", error => {
    console.error("[db] Erro inesperado em uma conexão ociosa:", error.message);
});

/* Consulta simples com parâmetros ($1, $2...) — evita SQL injection. */
export function query(text, params) {
    return pool.query(text, params);
}

/*
   Executa várias consultas como uma única operação:
   se qualquer uma falhar, nada é salvo (ROLLBACK).
*/
export async function withTransaction(callback) {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");
        const result = await callback(client);
        await client.query("COMMIT");
        return result;
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}

/* Confere a conexão ao iniciar, para avisar cedo se o banco estiver fora. */
export async function checkConnection() {
    const { rows } = await pool.query("SELECT current_database() AS database");
    return rows[0].database;
}
