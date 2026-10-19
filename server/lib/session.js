/* =========================
   SESSÕES DE LOGIN

   O express-session usa callbacks; estas funções os
   transformam em Promises para usar com async/await.
========================= */

import { query } from "../db.js";

export const SESSION_COOKIE = "sonora.sid";

/*
   Gera um ID de sessão NOVO no login. Isso impede o ataque de
   "session fixation" (alguém plantar um ID e esperar o login).
*/
export function startSession(req, userId) {
    return new Promise((resolve, reject) => {
        req.session.regenerate(error => {
            if (error) return reject(error);

            req.session.userId = userId;
            req.session.save(saveError => (saveError ? reject(saveError) : resolve()));
        });
    });
}

export function endSession(req, res) {
    return new Promise((resolve, reject) => {
        req.session.destroy(error => {
            if (error) return reject(error);

            res.clearCookie(SESSION_COOKIE);
            resolve();
        });
    });
}

/* Encerra todas as sessões do usuário (ex.: senha redefinida por e-mail). */
export async function endAllSessions(userId) {
    await query("DELETE FROM session WHERE (sess ->> 'userId')::int = $1", [userId]);
}

/* Encerra as outras sessões do usuário (ex.: após trocar a senha). */
export async function endOtherSessions(userId, currentSessionId) {
    await query(
        "DELETE FROM session WHERE (sess ->> 'userId')::int = $1 AND sid <> $2",
        [userId, currentSessionId]
    );
}
