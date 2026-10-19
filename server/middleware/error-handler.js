/* =========================
   TRATAMENTO DE ERROS

   Último middleware da cadeia. Erros conhecidos (HttpError)
   viram respostas com a mensagem certa; erros inesperados
   viram um 500 genérico — o detalhe fica só no terminal,
   nunca é enviado ao navegador.

   As mensagens chegam como chaves (lib/i18n.js) e saem no
   idioma pedido pelo navegador (Accept-Language).
========================= */

import { HttpError } from "../lib/http-error.js";
import { getLang, t, translate } from "../lib/i18n.js";

export function notFoundHandler(req, res) {
    res.status(404).json({ error: t(req, "errors.routeNotFound") });
}

function translateFields(lang, fields) {
    return Object.fromEntries(
        Object.entries(fields).map(([field, key]) => [field, translate(lang, key)])
    );
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(error, req, res, next) {
    if (error instanceof HttpError) {
        const lang = getLang(req);

        return res.status(error.status).json({
            error: translate(lang, error.message),
            ...(error.details && { fields: translateFields(lang, error.details) })
        });
    }

    // Corpo maior que o limite (ex.: foto acima de 5 MB).
    if (error.type === "entity.too.large") {
        return res.status(413).json({ error: t(req, "errors.tooLarge") });
    }

    // JSON malformado no corpo da requisição.
    if (error.type === "entity.parse.failed") {
        return res.status(400).json({ error: t(req, "errors.invalidRequest") });
    }

    console.error("[erro]", error);
    res.status(500).json({ error: t(req, "errors.unexpected") });
}
