/* =========================
   SONORA — CLIENTE DA API

   Única porta de saída para o servidor. Envia e recebe JSON,
   manda o cookie de login e transforma erros em ApiError:
   { status, message, fields } — "fields" traz o erro de cada
   campo do formulário, quando houver.
========================= */

window.Sonora = window.Sonora || {};

(function (Sonora) {
    "use strict";

    class ApiError extends Error {
        constructor(status, message, fields = {}) {
            super(message);
            this.name = "ApiError";
            this.status = status;
            this.fields = fields;
        }
    }

    async function request(method, url, body, { keepalive = false } = {}) {
        let response;

        try {
            response = await fetch(url, {
                method,
                credentials: "same-origin",
                headers: {
                    // O servidor responde as mensagens de erro neste idioma.
                    "Accept-Language": Sonora.i18n.locale,
                    ...(body ? { "Content-Type": "application/json" } : {})
                },
                body: body ? JSON.stringify(body) : undefined,
                // keepalive: o envio termina mesmo se a página fechar.
                keepalive
            });
        } catch (error) {
            throw new ApiError(0, Sonora.i18n.t("network.error"));
        }

        // 204 = sucesso sem conteúdo (ex.: logout).
        if (response.status === 204) return null;

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new ApiError(
                response.status,
                data.error || Sonora.i18n.t("generic.error"),
                data.fields
            );
        }

        return data;
    }

    Sonora.api = {
        ApiError,
        get: url => request("GET", url),
        post: (url, body) => request("POST", url, body),
        put: (url, body, options) => request("PUT", url, body, options),
        patch: (url, body) => request("PATCH", url, body),
        delete: (url, body) => request("DELETE", url, body)
    };
})(window.Sonora);
