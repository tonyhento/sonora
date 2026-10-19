/* =========================
   ROTAS DO PERFIL — /api/users  (requer login)

   PATCH  /me            atualiza nome e celular
   PATCH  /me/password   troca a senha
   DELETE /me            exclui a conta (pede a senha)
========================= */

import { Router } from "express";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";

import * as Users from "../repositories/users.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { updateProfileSchema, changePasswordSchema, deleteAccountSchema } from "../schemas.js";
import { badRequest, notFound } from "../lib/http-error.js";
import { endAllSessions, endOtherSessions, endSession } from "../lib/session.js";
import { t } from "../lib/i18n.js";
import { BCRYPT_ROUNDS } from "./auth.js";

// Senha errada várias vezes seguidas: espera um pouco (contra tentativa e erro).
const deleteLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    message: req => ({ error: t(req, "auth.tooManyAttempts") })
});

export const usersRouter = Router();

usersRouter.use(requireAuth);


usersRouter.patch("/me", validate(updateProfileSchema), async (req, res) => {
    const user = await Users.updateProfile(req.session.userId, req.body);

    if (!user) throw notFound("users.notFound");

    res.json({ user });
});


usersRouter.patch("/me/password", validate(changePasswordSchema), async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const userId = req.session.userId;

    const currentHash = await Users.findPasswordHash(userId);
    const isCurrentValid = currentHash && await bcrypt.compare(currentPassword, currentHash);

    if (!isCurrentValid) {
        throw badRequest("errors.checkFields", {
            currentPassword: "users.wrongPassword"
        });
    }

    if (currentPassword === newPassword) {
        throw badRequest("errors.checkFields", {
            newPassword: "users.samePassword"
        });
    }

    await Users.updatePassword(userId, await bcrypt.hash(newPassword, BCRYPT_ROUNDS));

    // Desconecta os outros dispositivos que usavam a senha antiga.
    await endOtherSessions(userId, req.sessionID);

    res.status(204).end();
});


/*
   Exclui a conta de vez: confere a senha, apaga o usuário e encerra
   todas as sessões (inclusive em outros aparelhos).
*/
usersRouter.delete("/me", deleteLimiter, validate(deleteAccountSchema), async (req, res) => {
    const userId = req.session.userId;
    const currentHash = await Users.findPasswordHash(userId);
    const isValid = currentHash && await bcrypt.compare(req.body.password, currentHash);

    if (!isValid) {
        throw badRequest("errors.checkFields", { password: "users.wrongPassword" });
    }

    await Users.remove(userId);
    await endAllSessions(userId);
    await endSession(req, res);

    res.status(204).end();
});
