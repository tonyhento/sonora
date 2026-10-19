/* =========================
   ROTA DO CATÁLOGO — /api/products

   GET /    todos os produtos ativos, com textos em PT e EN
            (o site troca de idioma sem precisar buscar de novo)
========================= */

import { Router } from "express";

import * as Products from "../repositories/products.js";

export const productsRouter = Router();

productsRouter.get("/", async (req, res) => {
    // "no-cache": o navegador pode guardar, mas confirma com o
    // servidor a cada visita (ETag). Preço novo aparece na hora.
    res.set("Cache-Control", "no-cache");
    res.json({ products: await Products.listCatalog() });
});
