/* =========================
   SONORA — HOME

   Renderiza a coleção com filtro por série, ordenação por
   preço e favoritos. A sacola fica em cart-ui.js.

   Dados: products.js (catálogo da API) | Favoritos: favorites.js
   Componentes: ui.js | Animação: reveal.js
========================= */

(function (Sonora) {
    "use strict";

    /* =========================
       01. CONFIGURAÇÃO
    ========================= */

    // Quantidade de cards antes do banner do catálogo.
    const PRODUCTS_BEFORE_BANNER = 3;

    const FILTER_ALL = "all";
    const FILTER_FAVORITES = "favorites";

    const SORTERS = {
        featured: () => 0,
        "price-asc": (a, b) => a.price - b.price,
        "price-desc": (a, b) => b.price - a.price
    };


    /* =========================
       02. ELEMENTOS DO HTML
    ========================= */

    const productGrid = document.querySelector("#product-grid");
    const filterGroup = document.querySelector("#collection-filters");
    const sortSelect = document.querySelector("#collection-sort");
    const resultsCount = document.querySelector("#collection-count");


    /* =========================
       03. ESTADO
    ========================= */

    const state = {
        filter: FILTER_ALL,
        sort: "featured"
    };

    // Séries únicas, na ordem do catálogo (preenchidas quando ele chega).
    let seriesList = [];

    // Só desenha depois que o catálogo chegou da API.
    let isStarted = false;


    /* =========================
       04. FILTROS
    ========================= */

    function formatSeriesLabel(series) {
        return series
            .toLowerCase()
            .replace(/(^|\s)\S/g, letter => letter.toUpperCase());
    }

    function createFilterButton(value, label, extraClass = "") {
        const isActive = state.filter === value;

        return `
            <button
                type="button"
                class="filter-chip ${extraClass}"
                data-filter="${value}"
                aria-pressed="${isActive}"
            >${label}</button>
        `;
    }

    function renderFilters() {
        const { t } = Sonora.i18n;
        const favoritesCount = Sonora.favorites.count();

        filterGroup.innerHTML = [
            createFilterButton(FILTER_ALL, t("collection.all")),
            ...seriesList.map(series => createFilterButton(series, formatSeriesLabel(series))),
            createFilterButton(
                FILTER_FAVORITES,
                `${Sonora.ui.HEART_ICON} ${t("collection.favorites")} <span class="filter-count">${favoritesCount}</span>`,
                "filter-chip--favorites"
            )
        ].join("");
    }

    function getVisibleProducts() {
        const filtered = Sonora.products.filter(product => {
            if (state.filter === FILTER_ALL) return true;
            if (state.filter === FILTER_FAVORITES) return Sonora.favorites.has(product.id);
            return product.series === state.filter;
        });

        return [...filtered].sort(SORTERS[state.sort] || SORTERS.featured);
    }


    /* =========================
       05. CATÁLOGO
       Na vista padrão (Todos + Destaques) o layout editorial
       mantém o banner. Com filtro ou ordenação, vira grade.
    ========================= */

    function createBanner() {
        return `
            <div class="grid-banner" data-reveal>
                <img
                    src="assets/brand/banner.jpg"
                    alt="${Sonora.i18n.t("collection.bannerAlt")}"
                    loading="lazy"
                >
            </div>
        `;
    }

    function createEmptyState() {
        const { t } = Sonora.i18n;
        const message = t(state.filter === FILTER_FAVORITES
            ? "collection.emptyFavorites"
            : "collection.emptyFilter");

        return `
            <div class="collection-empty">
                <p>${message}</p>
                <button type="button" class="text-button" data-filter="${FILTER_ALL}">
                    ${t("collection.seeAll")}
                </button>
            </div>
        `;
    }

    function updateCount(total) {
        resultsCount.textContent = total === 1
            ? Sonora.i18n.t("collection.countOne")
            : Sonora.i18n.t("collection.countMany", { count: total });
    }

    function renderProducts() {
        const products = getVisibleProducts();
        const isEditorialView = state.filter === FILTER_ALL && state.sort === "featured";

        updateCount(products.length);

        if (products.length === 0) {
            productGrid.innerHTML = createEmptyState();
            return;
        }

        const cards = products.map(Sonora.ui.createProductCard);

        if (isEditorialView && cards.length > PRODUCTS_BEFORE_BANNER) {
            cards.splice(PRODUCTS_BEFORE_BANNER, 0, createBanner());
        }

        productGrid.innerHTML = cards.join("");
        Sonora.reveal.scan(productGrid);
    }

    function setFilter(value) {
        if (state.filter === value) return;

        state.filter = value;
        renderFilters();
        renderProducts();
    }


    /* =========================
       06. EVENTOS
    ========================= */

    filterGroup.addEventListener("click", event => {
        if (!isStarted) return;

        const button = event.target.closest("[data-filter]");
        if (button) setFilter(button.dataset.filter);
    });

    // Botão "Ver todos" do estado vazio.
    productGrid.addEventListener("click", event => {
        const button = event.target.closest("[data-filter]");
        if (button) setFilter(button.dataset.filter);
    });

    sortSelect.addEventListener("change", () => {
        state.sort = sortSelect.value;
        if (!isStarted) return;

        renderProducts();
    });

    Sonora.ui.bindFavoriteButtons(productGrid);

    window.addEventListener(Sonora.favorites.CHANGE_EVENT, () => {
        if (!isStarted) return;

        renderFilters();

        // Na aba de favoritos a lista muda; nas outras, só o botão.
        if (state.filter === FILTER_FAVORITES) renderProducts();
    });

    window.addEventListener(Sonora.i18n.CHANGE_EVENT, () => {
        if (!isStarted) return;

        renderFilters();
        renderProducts();
    });


    /* =========================
       07. INICIALIZAÇÃO
    ========================= */

    Sonora.catalog.ready.then(isLoaded => {
        if (!isLoaded) {
            Sonora.catalog.renderError(productGrid);
            return;
        }

        seriesList = [...new Set(Sonora.products.map(product => product.series))];
        isStarted = true;

        renderFilters();
        renderProducts();
    });
})(window.Sonora);
