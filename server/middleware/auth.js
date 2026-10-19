/* =========================
   MIDDLEWARE DE AUTENTICAÇÃO

   requireAuth:  bloqueia a rota para quem não está logado.
   requireAdmin: só contas com papel "admin" (painel administrativo).
========================= */

import { HttpError, unauthorized } from "../lib/http-error.js";
import * as Users from "../repositories/users.js";

export function requireAuth(req, res, next) {
    if (!req.session?.userId) {
        return next(unauthorized());
    }

    next();
}

/*
   O papel é lido do BANCO a cada requisição (não fica guardado na
   sessão): se alguém deixar de ser admin, perde o acesso na hora.
*/
export async function requireAdmin(req, res, next) {
    if (!req.session?.userId) return next(unauthorized());

    const user = await Users.findById(req.session.userId);

    if (!user?.isAdmin) return next(new HttpError(403, "errors.forbidden"));

    req.user = user;
    next();
}
