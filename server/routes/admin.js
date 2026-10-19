/* =========================
   PAINEL ADMINISTRATIVO — /api/admin (só contas admin)

   GET   /summary              números da visão geral
   GET   /orders               pedidos (?status=&search=&limit=&offset=)
   PATCH /orders/:number       muda o status (enviado, entregue, cancelado)
   GET   /products             produtos, inclusive fora de linha
                               (?status=&search=&limit=&offset=)
   GET   /products/series      séries já usadas (sugestões)
   POST  /products             cria um produto (sempre como rascunho)
   PUT   /products/:id         salva tudo: dados, textos PT/EN e galeria
   POST  /products/:id/images  envia uma foto (o corpo é a imagem)
   GET   /translate            tradução pelo servidor disponível? (DeepL)
   POST  /translate            traduz textos de PT para EN ou o contrário

   Quem é admin: coluna users.role (npm run admin -- email).
========================= */

import express, { Router } from "express";
import rateLimit from "express-rate-limit";

import * as Orders from "../repositories/orders.js";
import * as Products from "../repositories/products.js";
import { requireAdmin } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
    adminOrdersQuerySchema,
    adminProductsQuerySchema,
    createProductSchema,
    translateSchema,
    updateOrderStatusSchema,
    updateProductSchema
} from "../schemas.js";
import { deleteUploadedImage, detectImageType, MAX_IMAGE_BYTES, saveProductImage } from "../lib/uploads.js";
import { badRequest, conflict, HttpError, notFound } from "../lib/http-error.js";
import { getBaseUrl } from "../lib/urls.js";
import { t } from "../lib/i18n.js";
import { translateTexts, translationProvider } from "../lib/translate.js";
import { sendOrderStatusEmail } from "../lib/notifications.js";

export const adminRouter = Router();

adminRouter.use(requireAdmin);


/* ---------- Visão geral ---------- */

adminRouter.get("/summary", async (req, res) => {
    res.json({ summary: await Orders.getSummary() });
});


/* ---------- Pedidos ---------- */

adminRouter.get("/orders", async (req, res) => {
    const parsed = adminOrdersQuerySchema.safeParse(req.query);
    if (!parsed.success) throw badRequest("errors.invalidRequest");

    res.json(await Orders.listForAdmin(parsed.data));
});

adminRouter.patch("/orders/:number", validate(updateOrderStatusSchema), async (req, res) => {
    const result = await Orders.updateStatus(req.params.number, req.body.status);

    if (!result) {
        // Não existe ou o status atual não permite essa mudança.
        throw new HttpError(409, "admin.invalidTransition");
    }

    // O cliente fica sabendo por e-mail (enviado, entregue ou cancelado).
    sendOrderStatusEmail({
        order: result.order,
        hasAccount: Boolean(result.userId),
        lang: result.lang,
        baseUrl: getBaseUrl()
    });

    res.json({ order: result.order });
});


/* ---------- Produtos ---------- */

adminRouter.get("/products", async (req, res) => {
    const parsed = adminProductsQuerySchema.safeParse(req.query);
    if (!parsed.success) throw badRequest("errors.invalidRequest");

    res.json(await Products.listForAdmin(parsed.data));
});

adminRouter.get("/products/series", async (req, res) => {
    res.json({ series: await Products.listSeries() });
});

function productId(req) {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) throw notFound("admin.productNotFound");
    return id;
}

adminRouter.post("/products", validate(createProductSchema), async (req, res) => {
    const id = await Products.createForAdmin(req.body);

    if (!id) throw badRequest("errors.checkFields", { code: "admin.codeTaken" });

    res.status(201).json({ product: await Products.findForAdmin(id) });
});

adminRouter.put("/products/:id", validate(updateProductSchema), async (req, res) => {
    const id = productId(req);
    const { status, removed } = await Products.updateForAdmin(id, req.body);

    if (status === "not-found") throw notFound("admin.productNotFound");
    if (status === "needs-image") {
        throw badRequest("errors.checkFields", { isActive: "admin.needsImage" });
    }

    // Fotos que saíram da galeria: o arquivo também sai da pasta.
    for (const src of removed) {
        if (!(await Products.isImageInUse(src))) await deleteUploadedImage(src);
    }

    res.json({ product: await Products.findForAdmin(id) });
});

/*
   Envio de foto: o corpo da requisição é o próprio arquivo
   (Content-Type image/jpeg, image/png ou image/webp), sem formulário.
   Arquivo maior que 5 MB é recusado antes de chegar aqui.
*/
const imageBody = express.raw({
    type: ["image/jpeg", "image/png", "image/webp"],
    limit: MAX_IMAGE_BYTES
});

adminRouter.post("/products/:id/images", imageBody, async (req, res) => {
    const id = productId(req);
    const product = await Products.findForAdmin(id);

    if (!product) throw notFound("admin.productNotFound");

    const extension = detectImageType(req.body);
    if (!extension) throw badRequest("admin.imageInvalid");

    if (product.gallery.length >= Products.MAX_IMAGES) throw conflict("admin.tooManyImages");

    const position = product.gallery.length + 1;
    const src = await saveProductImage({ code: product.code, position, buffer: req.body, extension });

    const added = await Products.addImage(id, {
        src,
        altPt: `${product.name} — foto ${position}`,
        altEn: `${product.name} — photo ${position}`
    });

    if (!added) {
        // Não coube na galeria (outro envio chegou antes): não deixa arquivo solto.
        await deleteUploadedImage(src);
        throw conflict("admin.tooManyImages");
    }

    res.status(201).json({ product: await Products.findForAdmin(id) });
});


/* ---------- Tradução automática ---------- */

// "deepl" = o servidor traduz; null = o painel tenta o tradutor do navegador.
adminRouter.get("/translate", (req, res) => {
    res.json({ provider: translationProvider() });
});

// Protege a cota do DeepL de cliques repetidos.
const translateLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 20,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: req => ({ error: t(req, "translate.tooMany") })
});

adminRouter.post("/translate", translateLimiter, async (req, res) => {
    const parsed = translateSchema.safeParse(req.body ?? {});
    if (!parsed.success) throw badRequest(parsed.error.issues[0].message);

    res.json({ texts: await translateTexts(parsed.data) });
});
