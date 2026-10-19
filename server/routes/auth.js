/* =========================
   ROTAS DE AUTENTICAÇÃO — /api/auth

   POST /register   cria a conta e já entra
   POST /login      entra com e-mail e senha
   POST /logout     sai
   GET  /me         usuário logado (ou null)

   POST /forgot-password   envia o link de nova senha por e-mail
   POST /reset-password    cria a nova senha com o código do link
========================= */

import { Router } from "express";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import { getLang, t } from "../lib/i18n.js";

import * as Users from "../repositories/users.js";
import * as PasswordResets from "../repositories/password-resets.js";
import { validate } from "../middleware/validate.js";
import { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } from "../schemas.js";
import { badRequest, conflict, HttpError } from "../lib/http-error.js";
import { startSession, endSession, endAllSessions } from "../lib/session.js";
import { getBaseUrl } from "../lib/urls.js";
import { RESET_LINK_MINUTES, sendPasswordResetEmail } from "../lib/notifications.js";

export const BCRYPT_ROUNDS = 12;

// Hash válido de uma senha aleatória: usado quando o e-mail não existe,
// para o login levar o mesmo tempo e não revelar quais e-mails têm conta.
const DUMMY_HASH = bcrypt.hashSync("sonora-dummy-password", BCRYPT_ROUNDS);

// Limita tentativas por IP para dificultar ataques de força bruta.
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    message: req => ({ error: t(req, "auth.tooManyAttempts") })
});

// Pedidos de link por e-mail: limite próprio, contando todas as tentativas.
const forgotLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: req => ({ error: t(req, "auth.tooManyAttempts") })
});

// Intervalo mínimo entre dois links para a mesma conta.
const RESET_COOLDOWN_SECONDS = 60;

const hashToken = token => crypto.createHash("sha256").update(token).digest("hex");

export const authRouter = Router();


authRouter.post("/register", authLimiter, validate(registerSchema), async (req, res) => {
    const { name, email, password } = req.body;

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = await Users.create({ name, email, passwordHash });

    if (!user) {
        throw conflict("auth.emailTaken");
    }

    await startSession(req, user.id);
    res.status(201).json({ user });
});


authRouter.post("/login", authLimiter, validate(loginSchema), async (req, res) => {
    const { email, password } = req.body;

    const found = await Users.findByEmailWithPassword(email);
    const passwordMatches = await bcrypt.compare(password, found?.passwordHash ?? DUMMY_HASH);

    if (!found || !passwordMatches) {
        // Mesma mensagem nos dois casos: não revela se o e-mail existe.
        throw new HttpError(401, "auth.invalidCredentials");
    }

    await startSession(req, found.user.id);
    res.json({ user: found.user });
});


authRouter.post("/logout", async (req, res) => {
    await endSession(req, res);
    res.status(204).end();
});


/*
   Responde SEMPRE do mesmo jeito, exista ou não a conta: assim a
   página não serve para descobrir quais e-mails estão cadastrados.
*/
authRouter.post("/forgot-password", forgotLimiter, validate(forgotPasswordSchema), async (req, res) => {
    const found = await Users.findByEmailWithPassword(req.body.email);

    if (found && !(await PasswordResets.hasRecent(found.user.id, RESET_COOLDOWN_SECONDS))) {
        const token = crypto.randomBytes(32).toString("base64url");

        await PasswordResets.create({
            userId: found.user.id,
            tokenHash: hashToken(token),
            expiresAt: new Date(Date.now() + RESET_LINK_MINUTES * 60 * 1000)
        });

        sendPasswordResetEmail({
            user: found.user,
            token,
            lang: getLang(req),
            baseUrl: getBaseUrl()
        });
    }

    res.json({ ok: true });
});


authRouter.post("/reset-password", authLimiter, validate(resetPasswordSchema), async (req, res) => {
    const reset = await PasswordResets.findValid(hashToken(req.body.token));

    if (!reset) throw badRequest("auth.resetInvalid");

    const passwordHash = await bcrypt.hash(req.body.password, BCRYPT_ROUNDS);
    const changed = await PasswordResets.resetPassword({
        resetId: reset.id,
        userId: reset.userId,
        passwordHash
    });

    if (!changed) throw badRequest("auth.resetInvalid");

    // Senha nova: todos os aparelhos conectados precisam entrar de novo.
    await endAllSessions(reset.userId);

    res.json({ ok: true });
});


authRouter.get("/me", async (req, res) => {
    const userId = req.session.userId;

    if (!userId) {
        return res.json({ user: null });
    }

    const user = await Users.findById(userId);

    // Conta removida enquanto a sessão ainda existia.
    if (!user) {
        await endSession(req, res);
        return res.json({ user: null });
    }

    res.json({ user });
});
