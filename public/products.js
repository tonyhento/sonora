/* =========================
   SONORA — CATÁLOGO (CLIENTE DA API)

   Os produtos vêm do banco de dados pela rota GET /api/products
   — a mesma fonte que o servidor usa para cobrar os pedidos.
   Para mudar preço, texto ou foto, altere as tabelas
   products, product_translations e product_images
   (veja database/schema.sql). Nada de produto fica neste arquivo.

   A busca é feita uma vez por página. Quem precisa do catálogo
   espera por ela:

     Sonora.catalog.ready.then(isLoaded => { ... })

   Depois disso, Sonora.products e Sonora.findProduct funcionam
   como uma lista comum, já no idioma atual do site.
========================= */

window.Sonora = window.Sonora || {};

(function (Sonora) {
    "use strict";

    const ENDPOINT = "/api/products";
    const READY_EVENT = "sonora:catalog-ready";

    // Um catálogo por idioma, montado uma vez só.
    let catalogs = { pt: [], en: [] };
    let isLoaded = false;


    /* =========================
       01. MONTAGEM POR IDIOMA
       A API manda os textos em PT e EN de uma vez, então a
       troca de idioma não precisa buscar nada de novo.
    ========================= */

    // Caminho a partir da raiz: funciona em qualquer página (inclusive na 404).
    const fromRoot = src => (/^(\/|https?:)/.test(src) ? src : `/${src}`);

    function localize(product, lang) {
        const text = product.texts[lang] || product.texts.pt;

        const gallery = product.gallery.map(image => ({
            src: fromRoot(image.src),
            alt: image.alt[lang] || image.alt.pt
        }));

        return Object.freeze({
            id: product.id,
            code: product.code,
            name: product.name,
            series: product.series,
            subtitle: product.subtitle,
            price: product.price,
            // null = sem controle de estoque; 0 = esgotado.
            stock: product.stock ?? null,
            tagline: text.tagline,
            description: text.description,
            concept: text.concept,
            materials: text.materials,
            specs: text.specs,
            gallery,
            image: gallery[0].src,
            story: {
                eyebrow: product.story.eyebrow,
                title: product.story.title,
                text: text.storyText
            }
        });
    }

    function build(products) {
        catalogs = {
            pt: Object.freeze(products.map(product => localize(product, "pt"))),
            en: Object.freeze(products.map(product => localize(product, "en")))
        };
    }


    /* =========================
       02. BUSCA
       Sempre resolve: true se carregou, false se falhou
       (assim cada página decide como mostrar o erro).
    ========================= */

    function load() {
        return fetch(ENDPOINT, { credentials: "same-origin", cache: "no-store" })
            .then(response => {
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                return response.json();
            })
            .then(data => {
                build(data.products);
                isLoaded = true;
                window.dispatchEvent(new CustomEvent(READY_EVENT));
                return true;
            })
            .catch(error => {
                console.error("[catálogo] Não foi possível carregar os produtos.", error);
                return false;
            });
    }

    const ready = load();


    /* =========================
       03. ACESSO
    ========================= */

    Object.defineProperty(Sonora, "products", {
        enumerable: true,
        get() {
            return catalogs[Sonora.i18n?.lang] || catalogs.pt;
        }
    });

    Sonora.findProduct = function (id) {
        const productId = Number(id);
        return Sonora.products.find(product => product.id === productId) || null;
    };

    /* Sempre em reais; só a escrita muda (R$ 899,90 / R$899.90). */
    Sonora.formatPrice = function (value) {
        return value.toLocaleString(Sonora.i18n?.locale || "pt-BR", {
            style: "currency",
            currency: "BRL"
        });
    };

    /*
       Estoque visto pela loja. Até 99 unidades por item na sacola
       (mesmo limite do servidor); com estoque, nunca mais que ele.
    */
    const MAX_PER_ITEM = 99;
    const LOW_STOCK = 5;

    Sonora.stock = {
        isSoldOut: product => product.stock === 0,
        isLow: product => product.stock !== null && product.stock > 0 && product.stock <= LOW_STOCK,
        limit: product => (product.stock === null ? MAX_PER_ITEM : Math.min(product.stock, MAX_PER_ITEM))
    };

    /* Mensagem de erro padrão para onde o catálogo deveria aparecer. */
    function renderError(container) {
        if (!container) return;

        const message = document.createElement("p");

        message.className = "catalog-error";
        message.setAttribute("role", "alert");
        message.dataset.i18n = "catalog.error";
        message.textContent = Sonora.i18n.t("catalog.error");

        container.replaceChildren(message);
    }

    Sonora.catalog = {
        READY_EVENT,
        ready,
        renderError,
        // Busca de novo (ex.: o estoque mudou durante a compra).
        refresh: load,
        get isLoaded() {
            return isLoaded;
        }
    };
})(window.Sonora);
