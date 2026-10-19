/* =========================
   TRADUÇÃO AUTOMÁTICA (painel admin) — DeepL, opcional

   Com DEEPL_API_KEY no .env, o painel traduz pelo servidor (melhor
   qualidade e funciona em qualquer navegador). Sem a chave, o painel
   usa o tradutor embutido do Chrome/Edge no computador, se houver.

   A chave fica só no servidor: o navegador nunca a vê.
========================= */

import { config } from "../config.js";
import { HttpError } from "./http-error.js";

// Idioma do site → código do DeepL (origem e destino são diferentes).
const SOURCE = { pt: "PT", en: "EN" };
const TARGET = { pt: "PT-BR", en: "EN-US" };

const TIMEOUT_MS = 15_000;

/* "deepl" quando há chave configurada; senão null. */
export function translationProvider() {
    return config.translate.deeplKey ? "deepl" : null;
}

/*
   Traduz uma lista de textos (mesma ordem na resposta).
   Textos vazios voltam vazios, sem gastar a cota.
*/
export async function translateTexts({ from, to, texts }) {
    if (!translationProvider()) throw new HttpError(503, "translate.unavailable");

    const filled = texts
        .map((text, index) => ({ text, index }))
        .filter(item => item.text.trim());

    const result = texts.map(() => "");
    if (filled.length === 0) return result;

    let response;

    try {
        response = await fetch(`${config.translate.deeplUrl}/v2/translate`, {
            method: "POST",
            headers: {
                Authorization: `DeepL-Auth-Key ${config.translate.deeplKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                text: filled.map(item => item.text),
                source_lang: SOURCE[from],
                target_lang: TARGET[to],
                preserve_formatting: true
            }),
            signal: AbortSignal.timeout(TIMEOUT_MS)
        });
    } catch (error) {
        console.error("[tradução] DeepL fora do ar:", error.message);
        throw new HttpError(502, "translate.failed");
    }

    if (!response.ok) {
        console.error(`[tradução] DeepL respondeu ${response.status}`);

        if (response.status === 403) throw new HttpError(502, "translate.badKey");
        if (response.status === 456) throw new HttpError(502, "translate.quota");
        if (response.status === 429) throw new HttpError(429, "translate.tooMany");
        throw new HttpError(502, "translate.failed");
    }

    const data = await response.json().catch(() => null);
    const translations = data?.translations;

    if (!Array.isArray(translations) || translations.length !== filled.length) {
        throw new HttpError(502, "translate.failed");
    }

    filled.forEach((item, position) => {
        result[item.index] = String(translations[position].text ?? "");
    });

    return result;
}
