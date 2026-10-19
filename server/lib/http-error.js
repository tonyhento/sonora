/* =========================
   ERROS HTTP

   Lançar um HttpError em qualquer rota faz o tratador de
   erros responder com o status e a mensagem certos.
   "message" é uma chave de lib/i18n.js (ex.: "orders.notFound").
========================= */

export class HttpError extends Error {
    constructor(status, message, details) {
        super(message);
        this.name = "HttpError";
        this.status = status;
        this.details = details;
    }
}

export const badRequest = (message, details) => new HttpError(400, message, details);
export const unauthorized = (message = "errors.loginRequired") => new HttpError(401, message);
export const notFound = (message = "errors.notFound") => new HttpError(404, message);
export const conflict = message => new HttpError(409, message);
