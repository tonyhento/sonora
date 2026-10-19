/* =========================
   MIDDLEWARE DE VALIDAÇÃO

   Uso:  router.post("/rota", validate(schema), handler)
   Se o corpo for válido, req.body passa a ser a versão
   limpa (sem espaços extras, e-mail em minúsculas...).
   Se não for, responde 400 com o erro de cada campo:
   { error: "...", fields: { "address.cep": "..." } }

   As mensagens dos esquemas são chaves; o tratador de erros
   (error-handler.js) as traduz para o idioma da requisição.
========================= */

import { badRequest } from "../lib/http-error.js";

export function validate(schema) {
    return (req, res, next) => {
        const result = schema.safeParse(req.body ?? {});

        if (result.success) {
            req.body = result.data;
            return next();
        }

        const fields = {};

        for (const issue of result.error.issues) {
            const path = issue.path.join(".");

            // Guarda só a primeira mensagem de cada campo.
            if (path && !fields[path]) fields[path] = issue.message;
        }

        next(badRequest("errors.checkFields", fields));
    };
}
