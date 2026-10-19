/* =========================
   ROTAS DA SACOLA E DOS FAVORITOS (requer login)

   /api/cart
     GET            sacola salva na conta
     PUT            substitui pela sacola atual do navegador
     POST /merge    junta a sacola de visitante com a da conta

   /api/favorites
     GET            favoritos da conta
     PUT            substitui pelos favoritos atuais
     POST /merge    junta os favoritos de visitante com os da conta
========================= */

import { Router } from "express";

import * as SavedItems from "../repositories/saved-items.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { cartSchema, favoritesSchema } from "../schemas.js";


/* ---------- Sacola ---------- */

export const cartRouter = Router();

cartRouter.use(requireAuth);

cartRouter.get("/", async (req, res) => {
    res.json({ items: await SavedItems.getCart(req.session.userId) });
});

cartRouter.put("/", validate(cartSchema), async (req, res) => {
    res.json({ items: await SavedItems.replaceCart(req.session.userId, req.body.items) });
});

cartRouter.post("/merge", validate(cartSchema), async (req, res) => {
    res.json({ items: await SavedItems.mergeCart(req.session.userId, req.body.items) });
});


/* ---------- Favoritos ---------- */

export const favoritesRouter = Router();

favoritesRouter.use(requireAuth);

favoritesRouter.get("/", async (req, res) => {
    res.json({ ids: await SavedItems.getFavorites(req.session.userId) });
});

favoritesRouter.put("/", validate(favoritesSchema), async (req, res) => {
    res.json({ ids: await SavedItems.replaceFavorites(req.session.userId, req.body.ids) });
});

favoritesRouter.post("/merge", validate(favoritesSchema), async (req, res) => {
    res.json({ ids: await SavedItems.mergeFavorites(req.session.userId, req.body.ids) });
});
