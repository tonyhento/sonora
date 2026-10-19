/* =========================
   LINKS DE REDEFINIÇÃO DE SENHA — ACESSO AO BANCO

   O link enviado por e-mail leva um código aleatório. No banco
   fica só o HASH (SHA-256) dele: quem visse a tabela não teria
   como montar um link válido. Cada link vale uma vez só.
========================= */

import { query, withTransaction } from "../db.js";

export async function create({ userId, tokenHash, expiresAt }) {
    await query(
        "INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES ($1, $2, $3)",
        [userId, tokenHash, expiresAt]
    );
}

/* Já pediu um link há pouco? (evita lotar a caixa de entrada de alguém) */
export async function hasRecent(userId, seconds) {
    const { rows } = await query(
        `SELECT 1 FROM password_resets
         WHERE user_id = $1 AND created_at > now() - make_interval(secs => $2)
         LIMIT 1`,
        [userId, seconds]
    );

    return rows.length > 0;
}

/* Link válido: existe, não foi usado e não venceu. */
export async function findValid(tokenHash) {
    const { rows } = await query(
        `SELECT id, user_id FROM password_resets
         WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()`,
        [tokenHash]
    );

    return rows[0] ? { id: rows[0].id, userId: rows[0].user_id } : null;
}

/*
   Troca a senha e invalida TODOS os links pendentes do usuário,
   na mesma transação. Retorna false se o link foi usado por outra
   requisição no meio do caminho (dois cliques ao mesmo tempo).
*/
export async function resetPassword({ resetId, userId, passwordHash }) {
    return withTransaction(async client => {
        const { rowCount } = await client.query(
            "UPDATE password_resets SET used_at = now() WHERE id = $1 AND used_at IS NULL",
            [resetId]
        );

        if (rowCount !== 1) return false;

        await client.query(
            "UPDATE password_resets SET used_at = now() WHERE user_id = $1 AND used_at IS NULL",
            [userId]
        );
        await client.query("UPDATE users SET password_hash = $2 WHERE id = $1", [userId, passwordHash]);

        return true;
    });
}
