/* =========================
   SONORA — FAVORITOS (DADOS)

   Lista de IDs favoritados, salva no localStorage.
   Dispara "sonora:favorites-change" a cada alteração
   (inclusive quando a mudança vem de outra aba).
========================= */

(function (Sonora) {
    "use strict";

    const STORAGE_KEY = "sonora-favorites";
    const CHANGE_EVENT = "sonora:favorites-change";

    function readStorage() {
        try {
            const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));

            if (!Array.isArray(saved)) return new Set();

            return new Set(saved.map(Number).filter(isValidId));
        } catch (error) {
            return new Set();
        }
    }

    // Antes do catálogo chegar, aceita qualquer ID válido; depois,
    // só os que existem no catálogo.
    function isValidId(id) {
        if (!(id > 0)) return false;
        return !Sonora.catalog.isLoaded || Boolean(Sonora.findProduct(id));
    }

    let ids = readStorage();

    function notify() {
        window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
    }

    function persist() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
        } catch (error) {
            // Sem armazenamento: os favoritos valem só nesta visita.
        }

        notify();
    }

    // Catálogo carregado: tira dos favoritos o que saiu de linha.
    window.addEventListener(Sonora.catalog.READY_EVENT, () => {
        const valid = new Set([...ids].filter(isValidId));

        if (valid.size !== ids.size) {
            ids = valid;
            persist();
        }
    });

    window.addEventListener("storage", event => {
        if (event.key !== STORAGE_KEY) return;

        ids = readStorage();
        notify();
    });

    Sonora.favorites = {
        CHANGE_EVENT,

        has(id) {
            return ids.has(Number(id));
        },

        /* Alterna o favorito e retorna o novo estado. */
        toggle(id) {
            const productId = Number(id);

            if (!Sonora.findProduct(productId)) return false;

            if (ids.has(productId)) {
                ids.delete(productId);
            } else {
                ids.add(productId);
            }

            persist();
            return ids.has(productId);
        },

        count() {
            return ids.size;
        },

        getIds() {
            return [...ids];
        },

        /* Troca todos os favoritos (ex.: pelos salvos na conta). */
        replace(list) {
            ids = new Set(
                (Array.isArray(list) ? list : [])
                    .map(Number)
                    .filter(isValidId)
            );
            persist();
        },

        clear() {
            ids = new Set();
            persist();
        }
    };
})(window.Sonora);
