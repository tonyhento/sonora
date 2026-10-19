/* =========================
   SONORA — COMPONENTES COMPARTILHADOS

   Peças de interface usadas em mais de uma página:
   card de produto, botão de favorito e newsletter do rodapé.
========================= */

(function (Sonora) {
    "use strict";

    const HEART_ICON = `
        <svg class="heart-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M12 20.3 4.6 13a4.8 4.8 0 0 1 6.8-6.8l.6.6.6-.6a4.8 4.8 0 0 1 6.8 6.8z"/>
        </svg>
    `;

    /*
       Escapa texto antes de inserir em HTML. Obrigatório para
       qualquer dado digitado por usuários (nome, endereço...),
       para evitar que vire código na página (XSS).
    */
    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, char => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[char]);
    }

    function getProductUrl(product) {
        return `produto.html?id=${product.id}`;
    }

    function getFavoriteLabel(product, isFavorite) {
        return Sonora.i18n.t(isFavorite ? "favorite.remove" : "favorite.add", { name: product.name });
    }

    /* Selo de estoque no card: "Esgotado" ou "Últimas unidades". */
    function stockBadge(product) {
        if (Sonora.stock.isSoldOut(product)) {
            return `<span class="stock-badge stock-badge--out">${Sonora.i18n.t("stock.soldOut")}</span>`;
        }

        if (Sonora.stock.isLow(product)) {
            return `<span class="stock-badge">${Sonora.i18n.t("stock.lastUnits")}</span>`;
        }

        return "";
    }

    /*
       Card da coleção: o card inteiro leva à página do produto.
       Os textos vêm do painel administrativo, então são escapados.
    */
    function createProductCard(product) {
        const isFavorite = Sonora.favorites.has(product.id);
        const esc = escapeHTML;

        return `
            <article class="product-card${Sonora.stock.isSoldOut(product) ? " is-sold-out" : ""}" data-reveal>
                <a class="product-link" href="${getProductUrl(product)}">
                    <div class="product-image">
                        <img
                            src="${esc(product.image)}"
                            alt="${esc(Sonora.i18n.t("card.imageAlt", { name: product.name }))}"
                            loading="lazy"
                        >
                        ${stockBadge(product)}
                    </div>

                    <div class="product-info">
                        <span class="product-category">${esc(product.series)}</span>
                        <h3 class="product-name">${esc(product.name)}</h3>
                        <p class="product-tagline">${esc(product.tagline)}</p>
                        <span class="product-price">
                            ${Sonora.formatPrice(product.price)}
                        </span>
                    </div>
                </a>

                <button
                    type="button"
                    class="favorite-button"
                    data-favorite-id="${product.id}"
                    aria-pressed="${isFavorite}"
                    aria-label="${esc(getFavoriteLabel(product, isFavorite))}"
                >${HEART_ICON}</button>
            </article>
        `;
    }

    /* Atualiza todos os botões de favorito dentro de "root". */
    function syncFavoriteButtons(root = document) {
        root.querySelectorAll("[data-favorite-id]").forEach(button => {
            const product = Sonora.findProduct(button.dataset.favoriteId);
            if (!product) return;

            const isFavorite = Sonora.favorites.has(product.id);

            button.setAttribute("aria-pressed", String(isFavorite));
            button.setAttribute("aria-label", getFavoriteLabel(product, isFavorite));
        });
    }

    /*
       Liga os botões de favorito de um container (delegação),
       então funciona também para cards criados depois.
    */
    function bindFavoriteButtons(root) {
        root.addEventListener("click", event => {
            const button = event.target.closest("[data-favorite-id]");
            if (!button) return;

            event.preventDefault();
            Sonora.favorites.toggle(button.dataset.favoriteId);
        });
    }

    /*
       Newsletter do rodapé (demonstração): valida o e-mail e
       mostra uma confirmação. Nenhum dado é enviado.
    */
    const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    function bindNewsletter(form) {
        const input = form.querySelector("input[type='email']");
        const message = form.querySelector(".newsletter-message");

        form.addEventListener("submit", event => {
            event.preventDefault();

            const email = input.value.trim();
            const isValid = EMAIL_PATTERN.test(email);

            input.setAttribute("aria-invalid", String(!isValid));
            message.classList.toggle("is-error", !isValid);

            if (!isValid) {
                message.textContent = Sonora.i18n.t("newsletter.invalid");
                input.focus();
                return;
            }

            message.textContent = Sonora.i18n.t("newsletter.success");
            form.reset();
        });
    }

    document.querySelectorAll("[data-newsletter]").forEach(bindNewsletter);


    /*
       Lista "Modelos" do rodapé: montada com os produtos À VENDA do
       catálogo (o mesmo da coleção). Um modelo tirado de venda no
       painel some daqui sozinho. Com muitos modelos, mostra os
       primeiros e um link para a coleção completa.
       Se o catálogo não carregar, ficam os links escritos no HTML.
    */
    const FOOTER_MODELS_LIMIT = 6;

    function renderFooterModels() {
        const products = Sonora.products;

        document.querySelectorAll("[data-footer-models]").forEach(list => {
            const links = products.slice(0, FOOTER_MODELS_LIMIT).map(product => {
                const link = document.createElement("a");

                // Caminho a partir da raiz: funciona também na página 404.
                link.href = `/${getProductUrl(product)}`;
                link.textContent = product.name;
                return link;
            });

            if (products.length > FOOTER_MODELS_LIMIT) {
                const all = document.createElement("a");

                all.href = "/index.html#products";
                all.dataset.i18n = "footer.allModels";
                all.textContent = Sonora.i18n.t("footer.allModels");
                links.push(all);
            }

            list.querySelectorAll("a").forEach(link => link.remove());
            list.append(...links);
        });
    }

    Sonora.catalog.ready.then(isLoaded => {
        if (isLoaded) renderFooterModels();
    });

    // Qualquer mudança (nesta ou em outra aba) reflete nos botões.
    window.addEventListener(Sonora.favorites.CHANGE_EVENT, () => syncFavoriteButtons());
    window.addEventListener(Sonora.i18n.CHANGE_EVENT, () => {
        syncFavoriteButtons();

        // A mensagem da newsletter estava no idioma anterior.
        document.querySelectorAll(".newsletter-message").forEach(message => {
            message.textContent = "";
        });
    });

    Sonora.ui = {
        HEART_ICON,
        EMAIL_PATTERN,
        escapeHTML,
        getProductUrl,
        createProductCard,
        syncFavoriteButtons,
        bindFavoriteButtons
    };
})(window.Sonora);
