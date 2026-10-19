/* =========================
   SONORA — PAINEL ADMINISTRATIVO (admin.html)

   Três seções, abertas pelo endereço (#visao-geral, #pedidos,
   #produtos):
   - Visão geral: faturamento, pedidos por status, mais vendidos.
   - Pedidos: busca, filtro e mudança de status (o cliente vê a
     mudança em "Meus pedidos" e recebe um e-mail).
   - Produtos: lista com busca e filtro; ao clicar, uma janela
     edita preço, à venda ou não e textos em PT/EN.

   Quem decide o acesso é o servidor (/api/admin só responde a
   admins). Esta página apenas mostra o aviso de área restrita.

   Atenção: nome, e-mail e endereço foram digitados por clientes,
   por isso tudo que vem da API passa por escapeHTML.
========================= */

(function (Sonora) {
    "use strict";

    const { api, forms } = Sonora;
    const { t } = Sonora.i18n;
    const { escapeHTML: esc } = Sonora.ui;

    const PAGE_SIZE = 20;
    const CANCEL_CONFIRM_MS = 5000;
    const SEARCH_DELAY_MS = 350;

    const TABS = {
        "#visao-geral": "overview",
        "#pedidos": "orders",
        "#produtos": "products"
    };

    // Próximo passo de cada status (o servidor confere de novo).
    const ACTIONS = {
        confirmed: [
            { status: "shipped", label: "admin.ship" },
            { status: "cancelled", label: "admin.cancel", danger: true }
        ],
        shipped: [
            { status: "delivered", label: "admin.deliver" }
        ]
    };

    const main = document.querySelector("#main");
    const layout = document.querySelector("#admin-layout");
    const denied = document.querySelector("#admin-denied");

    const overview = {
        kpis: document.querySelector("#admin-kpis"),
        statusList: document.querySelector("#admin-status-list"),
        topProducts: document.querySelector("#admin-top-products")
    };

    const ordersUI = {
        filter: document.querySelector("#orders-filter"),
        search: document.querySelector("#orders-search"),
        status: document.querySelector("#orders-status"),
        message: document.querySelector("#orders-message"),
        count: document.querySelector("#orders-count"),
        list: document.querySelector("#admin-orders"),
        more: document.querySelector("#orders-more")
    };

    const productsUI = {
        filter: document.querySelector("#products-filter"),
        search: document.querySelector("#products-search"),
        status: document.querySelector("#products-status"),
        count: document.querySelector("#products-count"),
        list: document.querySelector("#admin-products"),
        more: document.querySelector("#products-more"),
        create: document.querySelector("#product-new")
    };

    const productDialog = {
        element: document.querySelector("#product-dialog"),
        body: document.querySelector("#product-dialog-body")
    };

    const state = {
        summary: null,
        orders: [],
        ordersTotal: 0,
        products: [],
        productsTotal: 0,
        loaded: { overview: false, orders: false, products: false }
    };

    let searchTimer = null;
    let ordersRequest = 0;
    let productSearchTimer = null;
    let productsRequest = 0;

    const price = value => Sonora.formatPrice(value);
    const statusLabel = status => t(`orders.status.${status}`);
    const formatDate = value => new Intl.DateTimeFormat(Sonora.i18n.locale, {
        day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
    }).format(new Date(value));

    function showMessage(element, text, type = "error") {
        element.textContent = text;
        element.dataset.type = type;
        element.hidden = !text;
    }


    /* =========================
       01. SEÇÕES (abas pelo endereço)
    ========================= */

    function currentTab() {
        return TABS[window.location.hash] || "overview";
    }

    function showTab() {
        const tab = currentTab();

        document.querySelectorAll("[data-admin-panel]").forEach(panel => {
            panel.hidden = panel.dataset.adminPanel !== tab;
        });

        document.querySelectorAll("[data-admin-tab]").forEach(link => {
            if (link.dataset.adminTab === tab) link.setAttribute("aria-current", "page");
            else link.removeAttribute("aria-current");
        });

        // Cada seção busca os dados na primeira vez que aparece.
        if (!state.loaded[tab]) {
            state.loaded[tab] = true;
            ({ overview: loadSummary, orders: () => loadOrders(), products: () => loadProducts() })[tab]();
        }
    }


    /* =========================
       02. VISÃO GERAL
    ========================= */

    async function loadSummary() {
        try {
            const { summary } = await api.get("/api/admin/summary");
            state.summary = summary;
            renderSummary();
        } catch (error) {
            state.loaded.overview = false;
            overview.kpis.innerHTML = `<p class="admin-error">${esc(error.message || t("admin.loadError"))}</p>`;
        }
    }

    function kpi(label, value, hint = "") {
        return `
            <div class="admin-kpi">
                <p class="admin-kpi-label">${label}</p>
                <p class="admin-kpi-value">${value}</p>
                ${hint ? `<p class="admin-kpi-hint">${hint}</p>` : ""}
            </div>
        `;
    }

    function renderSummary() {
        const summary = state.summary;
        if (!summary) return;

        overview.kpis.innerHTML = [
            kpi(t("admin.kpiRevenue"), price(summary.revenue),
                t("admin.kpiRevenue30", { value: price(summary.revenueLast30Days) })),
            kpi(t("admin.kpiOrders"), summary.soldOrders),
            kpi(t("admin.kpiAverage"), price(summary.averageTicket)),
            kpi(t("admin.kpiToShip"), summary.byStatus.confirmed, t("admin.kpiToShipHint")),
            kpi(t("admin.kpiCustomers"), summary.customers)
        ].join("");

        const statuses = [
            ["confirmed", summary.byStatus.confirmed],
            ["shipped", summary.byStatus.shipped],
            ["delivered", summary.byStatus.delivered],
            ["cancelled", summary.byStatus.cancelled],
            ["awaiting_payment", summary.byStatus.awaitingPayment]
        ];

        overview.statusList.innerHTML = statuses.map(([status, count]) => `
            <li>
                <span class="order-status order-status--${status}">${esc(statusLabel(status))}</span>
                <strong>${count}</strong>
            </li>
        `).join("");

        overview.topProducts.innerHTML = summary.topProducts.length
            ? summary.topProducts.map(product => `
                <li>
                    <span>${esc(product.name)}</span>
                    <span class="admin-list-meta">${t("admin.units", { count: product.quantity })} · ${price(product.revenue)}</span>
                </li>
            `).join("")
            : `<li class="admin-list-empty">${t("admin.topEmpty")}</li>`;
    }


    /* =========================
       03. PEDIDOS
    ========================= */

    async function loadOrders({ append = false } = {}) {
        const requestId = ++ordersRequest;
        const params = new URLSearchParams({
            status: ordersUI.status.value,
            search: ordersUI.search.value.trim(),
            limit: PAGE_SIZE,
            offset: append ? state.orders.length : 0
        });

        ordersUI.more.disabled = true;

        try {
            const data = await api.get(`/api/admin/orders?${params}`);

            // Uma busca mais nova já foi feita: ignora esta resposta.
            if (requestId !== ordersRequest) return;

            state.orders = append ? state.orders.concat(data.orders) : data.orders;
            state.ordersTotal = data.total;
            renderOrders();
        } catch (error) {
            if (requestId !== ordersRequest) return;
            state.loaded.orders = false;
            showMessage(ordersUI.message, error.message || t("admin.loadError"));
        } finally {
            ordersUI.more.disabled = false;
        }
    }

    function formatAddress({ street, number, complement, district, city, state: uf, cep }) {
        return [
            `${esc(street)}, ${esc(number)}${complement ? ` — ${esc(complement)}` : ""}`,
            esc(district),
            `${esc(city)} — ${esc(uf)}`,
            `CEP ${esc(Sonora.forms.masks.cep(cep))}`
        ].join("<br>");
    }

    function orderActions(order) {
        const actions = ACTIONS[order.status] || [];

        return actions.map(action => `
            <button
                type="button"
                class="admin-action${action.danger ? " admin-action--danger" : ""}"
                data-order="${esc(order.number)}"
                data-status="${action.status}"
                data-label="${action.label}"
            >${t(action.label)}</button>
        `).join("");
    }

    function createOrderCard(order) {
        const itemsCount = order.items.reduce((total, item) => total + item.quantity, 0);
        const items = order.items.map(item => `
            <li>${esc(item.quantity)} × ${esc(item.name)} <span>${price(item.unitPrice * item.quantity)}</span></li>
        `).join("");
        const actions = orderActions(order);

        return `
            <article class="order-card admin-order" data-order-card="${esc(order.number)}">
                <header class="order-header">
                    <div>
                        <h3 class="order-number">${esc(order.number)}</h3>
                        <p class="order-date">
                            <time datetime="${esc(order.createdAt)}">${formatDate(order.createdAt)}</time>
                            · ${itemsCount} ${t(itemsCount === 1 ? "orders.itemOne" : "orders.itemMany")}
                        </p>
                    </div>

                    <span class="order-status order-status--${esc(order.status)}">${esc(statusLabel(order.status))}</span>

                    <p class="order-total">${price(order.total)}</p>
                </header>

                <p class="admin-order-customer">
                    <strong>${esc(order.customer.name)}</strong>
                    · ${esc(order.customer.email)}
                    · ${esc(t(`payment.${order.payment}`))}
                </p>

                ${actions ? `<div class="admin-actions">${actions}</div>` : ""}

                <details class="order-details">
                    <summary>${t("orders.details")}</summary>

                    <div class="order-details-grid">
                        <div>
                            <h4>${t("orders.items")}</h4>
                            <ul class="admin-order-items">${items}</ul>
                        </div>

                        <div class="order-meta">
                            <h4>${t("orders.delivery")}</h4>
                            <p>${formatAddress(order.address)}<br>${esc(order.customer.phone)}</p>
                        </div>
                    </div>
                </details>
            </article>
        `;
    }

    function renderOrders() {
        const total = state.ordersTotal;

        ordersUI.count.textContent = total === 1
            ? t("admin.countOne")
            : t("admin.countMany", { count: total });

        ordersUI.list.innerHTML = state.orders.length
            ? state.orders.map(createOrderCard).join("")
            : `<p class="admin-empty">${t("admin.ordersEmpty")}</p>`;

        ordersUI.more.hidden = state.orders.length >= total;
    }

    /*
       Cancelar pede um segundo clique (o botão vira "CONFIRMAR
       CANCELAMENTO" por alguns segundos), sem janela de confirmação.
    */
    function armCancel(button) {
        button.dataset.armed = "true";
        button.textContent = t("admin.confirmCancel");

        setTimeout(() => {
            if (!document.contains(button) || button.disabled) return;
            delete button.dataset.armed;
            button.textContent = t(button.dataset.label);
        }, CANCEL_CONFIRM_MS);
    }

    async function changeStatus(button) {
        const { order: number, status } = button.dataset;

        if (status === "cancelled" && button.dataset.armed !== "true") {
            armCancel(button);
            return;
        }

        const card = button.closest("[data-order-card]");
        card.querySelectorAll(".admin-action").forEach(action => {
            action.disabled = true;
        });

        try {
            const { order } = await api.patch(`/api/admin/orders/${encodeURIComponent(number)}`, { status });

            const index = state.orders.findIndex(item => item.number === number);
            if (index !== -1) state.orders[index] = order;

            // Saiu do filtro atual (ex.: filtrando "Confirmado" e marcou como enviado).
            const filter = ordersUI.status.value;
            if (filter !== "all" && filter !== order.status && index !== -1) {
                state.orders.splice(index, 1);
                state.ordersTotal -= 1;
            }

            renderOrders();
            showMessage(ordersUI.message, t("admin.statusChanged", {
                number: order.number,
                status: statusLabel(order.status).toLowerCase()
            }), "success");

            // A visão geral precisa ser refeita na próxima vez.
            state.loaded.overview = false;
        } catch (error) {
            showMessage(ordersUI.message, error.message);
            card.querySelectorAll(".admin-action").forEach(action => {
                action.disabled = false;
            });
        }
    }

    function scheduleSearch() {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
            showMessage(ordersUI.message, "");
            loadOrders();
        }, SEARCH_DELAY_MS);
    }


    /* =========================
       04. PRODUTOS
       Lista compacta (uma linha por produto, 20 por vez) com
       busca e filtro — funciona igual com 4 ou 1.000 produtos.
       O formulário de edição abre numa janela (<dialog>).
    ========================= */

    async function loadProducts({ append = false } = {}) {
        const requestId = ++productsRequest;
        const params = new URLSearchParams({
            status: productsUI.status.value,
            search: productsUI.search.value.trim(),
            limit: PAGE_SIZE,
            offset: append ? state.products.length : 0
        });

        productsUI.more.disabled = true;

        try {
            const data = await api.get(`/api/admin/products?${params}`);

            // Uma busca mais nova já foi feita: ignora esta resposta.
            if (requestId !== productsRequest) return;

            state.products = append ? state.products.concat(data.products) : data.products;
            state.productsTotal = data.total;
            renderProductRows();
        } catch (error) {
            if (requestId !== productsRequest) return;
            state.loaded.products = false;
            productsUI.list.innerHTML = `<p class="admin-error">${esc(error.message || t("admin.loadError"))}</p>`;
        } finally {
            productsUI.more.disabled = false;
        }
    }

    // Caminho a partir da raiz, como no catálogo da loja.
    const productImage = product => (product.image ? `/${String(product.image).replace(/^\//, "")}` : "");

    function saleBadge(product) {
        return product.isActive
            ? `<span class="order-status order-status--delivered">${t("admin.onSale")}</span>`
            : `<span class="order-status order-status--cancelled">${t("admin.offSale")}</span>`;
    }

    /* "12 em estoque", "Esgotado" ou nada (sem controle de estoque). */
    function stockLabel(product) {
        if (product.stock === null || product.stock === undefined) return "";
        if (product.stock === 0) return t("admin.stockOut");
        return product.stock === 1 ? t("admin.stockOne") : t("admin.stockMany", { count: product.stock });
    }

    function createProductRow(product) {
        const image = productImage(product);
        const stock = stockLabel(product);

        return `
            <li>
                <button
                    type="button"
                    class="admin-product-row${product.isActive ? "" : " is-off-sale"}"
                    data-edit-product="${product.id}"
                    aria-haspopup="dialog"
                >
                    <span class="admin-product-thumb">${image ? `<img src="${esc(image)}" alt="" loading="lazy">` : ""}</span>
                    <span class="admin-product-name">
                        <strong>${esc(product.name)}</strong>
                        <small>${esc(product.series)} · ${esc(product.code)}${stock ? ` · <span class="admin-stock${product.stock === 0 ? " is-out" : ""}">${stock}</span>` : ""}</small>
                    </span>
                    <span class="admin-product-price">${price(product.price)}</span>
                    ${saleBadge(product)}
                    <span class="admin-product-edit">${t("admin.edit")} <span aria-hidden="true">→</span></span>
                </button>
            </li>
        `;
    }

    function renderProductRows() {
        if (!state.loaded.products) return;

        const total = state.productsTotal;

        productsUI.count.textContent = total === 1
            ? t("admin.productsCountOne")
            : t("admin.productsCountMany", { count: total });

        productsUI.list.innerHTML = state.products.length
            ? `<ul class="admin-product-list">${state.products.map(createProductRow).join("")}</ul>`
            : `<p class="admin-empty">${t("admin.productsEmpty")}</p>`;

        productsUI.more.hidden = state.products.length >= total;
    }

    function scheduleProductSearch() {
        clearTimeout(productSearchTimer);
        productSearchTimer = setTimeout(() => loadProducts(), SEARCH_DELAY_MS);
    }


    /* ---------- Janela de edição e de produto novo ---------- */

    /*
       "editor" guarda o que está aberto na janela:
       - product: como está salvo no servidor (null = produto novo);
       - gallery: a galeria do jeito que o admin está arrumando
         (ordem, textos alternativos, fotos tiradas). Só vale ao salvar.
    */
    const editor = { open: false, product: null, gallery: [] };
    let seriesOptions = null;

    const LANGS = ["pt", "en"];

    const specsToText = specs => (specs || []).map(([label, value]) => `${label}: ${value}`).join("\n");

    // "Linha: Limited Lab" → ["Linha", "Limited Lab"]. Linha sem ":" segue
    // com valor vazio para o servidor apontar o erro.
    function textToSpecs(text) {
        return text.split("\n")
            .map(line => line.trim())
            .filter(Boolean)
            .map(line => {
                const index = line.indexOf(":");
                return index === -1
                    ? [line, ""]
                    : [line.slice(0, index).trim(), line.slice(index + 1).trim()];
            });
    }

    function field({ name, label, value = "", hint = "", type = "text", textarea = false, rows = 3, attrs = "", wide = true }) {
        const id = `editor-${name.replace(/\./g, "-")}`;
        const describedBy = `${id}-error${hint ? ` ${id}-hint` : ""}`;
        const control = textarea
            ? `<textarea id="${id}" name="${name}" rows="${rows}" aria-describedby="${describedBy}" ${attrs}>${esc(value)}</textarea>`
            : `<input id="${id}" name="${name}" type="${type}" value="${esc(value)}" aria-describedby="${describedBy}" ${attrs}>`;

        return `
            <div class="field${wide ? " field--full" : ""}">
                <label for="${id}">${label}</label>
                ${control}
                <p class="field-error" id="${id}-error"></p>
                ${hint ? `<p class="field-hint" id="${id}-hint">${hint}</p>` : ""}
            </div>
        `;
    }

    function textFields(product, lang) {
        const text = product?.texts?.[lang] || {};

        // O site é escrito em português; o inglês sai do botão de tradução.
        const translateRow = lang === "en"
            ? `<div class="admin-translate-row">
                   <button type="button" class="admin-translate" data-translate-en ${translation.provider ? "" : "hidden"}>
                       <span aria-hidden="true">↻</span>
                       <span data-label>${t("admin.translateFromPt")}</span>
                   </button>
                   <p class="admin-translate-status" data-translate-status role="status" aria-live="polite"></p>
               </div>
               <p class="field-hint" data-translate-hint>${translateHint(product)}</p>`
            : "";

        return `
            <fieldset class="admin-texts" data-lang-section="${lang}">
                <legend>${t(lang === "pt" ? "admin.textsPt" : "admin.textsEn")}</legend>
                ${translateRow}
                ${field({ name: `${lang}.tagline`, label: t("admin.tagline"), value: text.tagline, attrs: 'maxlength="160"' })}
                ${field({ name: `${lang}.description`, label: t("admin.description"), value: text.description, textarea: true, rows: 4, attrs: 'maxlength="2000"' })}
                ${field({ name: `${lang}.concept`, label: t("admin.concept"), value: text.concept, textarea: true, attrs: 'maxlength="1000"' })}
                ${field({ name: `${lang}.materials`, label: t("admin.materials"), value: text.materials, textarea: true, rows: 2, attrs: 'maxlength="1000"' })}
                ${field({ name: `${lang}.specs`, label: t("admin.specs"), value: specsToText(text.specs), textarea: true, rows: 4, hint: t("admin.specsHint") })}
                ${field({ name: `${lang}.storyText`, label: t("admin.storyText"), value: text.storyText, textarea: true, attrs: 'maxlength="1000"' })}
            </fieldset>
        `;
    }

    function photoCard(image, index) {
        const total = editor.gallery.length;

        return `
            <li class="admin-photo" data-photo-index="${index}">
                <div class="admin-photo-image">
                    <img src="/${esc(image.src.replace(/^\//, ""))}" alt="">
                    ${index === 0 ? `<span class="admin-photo-cover">${t("admin.cover")}</span>` : ""}
                </div>

                <div class="admin-photo-tools">
                    <button type="button" data-photo-move="-1" aria-label="${t("admin.moveLeft")}" ${index === 0 ? "disabled" : ""}>←</button>
                    <button type="button" data-photo-move="1" aria-label="${t("admin.moveRight")}" ${index === total - 1 ? "disabled" : ""}>→</button>
                    <button type="button" data-photo-remove aria-label="${t("admin.removePhoto")}">×</button>
                </div>

                <label class="admin-photo-alt">
                    <span>${t("admin.altPt")}</span>
                    <input data-photo-alt="pt" maxlength="160" value="${esc(image.alt.pt)}">
                </label>
                <label class="admin-photo-alt">
                    <span>${t("admin.altEn")}</span>
                    <input data-photo-alt="en" maxlength="160" value="${esc(image.alt.en)}">
                </label>
            </li>
        `;
    }

    function photosSection() {
        const full = editor.gallery.length >= MAX_PHOTOS;

        return `
            <fieldset class="admin-texts admin-photos" data-photos>
                <legend>${t("admin.photos")}</legend>
                <p class="field-hint">${t("admin.photosHint")}</p>

                ${editor.gallery.length
                    ? `<ol class="admin-photo-grid">${editor.gallery.map(photoCard).join("")}</ol>`
                    : `<p class="admin-photo-empty">${t("admin.noPhotos")}</p>`}

                <p class="admin-upload-status" data-upload-status role="status" aria-live="polite"></p>

                <label class="admin-action admin-upload${full ? " is-disabled" : ""}">
                    ${t("admin.addPhotos")}
                    <input type="file" class="visually-hidden" data-photo-input accept="image/jpeg,image/png,image/webp" multiple ${full ? "disabled" : ""}>
                </label>
            </fieldset>
        `;
    }

    function translateHint(product) {
        if (translation.provider === undefined) return "";
        if (!translation.provider) return t("admin.translateHint.none");
        return t(product ? "admin.translateHint.edit" : "admin.translateHint.new");
    }

    function createProductForm(product) {
        const isNew = !product;
        const story = product?.story || {};
        const image = product ? productImage(product) : "";

        const head = isNew
            ? `<h2 id="product-dialog-title">${t("admin.newProductTitle")}</h2>
               <p class="admin-draft-note">${t("admin.draftHint")}</p>`
            : `<div class="admin-product-head">
                   ${image ? `<img src="${esc(image)}" alt="">` : ""}
                   <div>
                       <p class="admin-product-series">${esc(product.series)} · ${esc(product.code)}</p>
                       <h2 id="product-dialog-title">${esc(product.name)}</h2>
                       ${saleBadge(product)}
                   </div>
               </div>`;

        return `
            <form class="admin-product" data-product-id="${product?.id ?? ""}" novalidate>
                ${head}

                <p class="form-message" data-form-message role="status" hidden></p>

                <fieldset class="admin-texts">
                    <legend>${t("admin.sectionData")}</legend>

                    <div class="admin-field-grid">
                        ${isNew
                            ? field({ name: "code", label: t("admin.code"), hint: t("admin.codeHint"), attrs: 'maxlength="10" autocapitalize="characters" autocomplete="off"', wide: false })
                            : ""}
                        ${field({ name: "name", label: t("admin.name"), value: product?.name, attrs: 'maxlength="120"', wide: false })}
                        ${field({ name: "series", label: t("admin.series"), value: product?.series, attrs: 'maxlength="60" list="series-options" autocomplete="off"', wide: false })}
                        ${field({ name: "price", label: t("admin.price"), value: product ? product.price.toFixed(2) : "", type: "number", attrs: 'inputmode="decimal" min="1" max="99999.99" step="0.01"', wide: false })}
                        ${field({ name: "stock", label: t("admin.stock"), value: product?.stock ?? "", type: "number", hint: t("admin.stockHint"), attrs: 'inputmode="numeric" min="0" max="99999" step="1"', wide: false })}
                        ${field({ name: "subtitle", label: t("admin.subtitle"), value: product?.subtitle, hint: t("admin.subtitleHint"), attrs: 'maxlength="120"' })}
                    </div>

                    ${isNew ? "" : `
                        <label class="admin-switch">
                            <input type="checkbox" id="editor-isActive" name="isActive" aria-describedby="editor-isActive-error" ${product.isActive ? "checked" : ""}>
                            <span>
                                <strong>${t("admin.onSale")}</strong>
                                <small>${t("admin.onSaleHint")}</small>
                            </span>
                        </label>
                        <p class="field-error" id="editor-isActive-error"></p>
                    `}
                </fieldset>

                ${isNew ? "" : photosSection()}

                ${textFields(product, "pt")}
                ${textFields(product, "en")}

                <fieldset class="admin-texts">
                    <legend>${t("admin.story")}</legend>
                    <p class="field-hint">${t("admin.storyHint")}</p>
                    <div class="admin-field-grid">
                        ${field({ name: "story.eyebrow", label: t("admin.storyEyebrow"), value: story.eyebrow, attrs: 'maxlength="60"', wide: false })}
                        ${field({ name: "story.title", label: t("admin.storyTitle"), value: story.title, attrs: 'maxlength="60"', wide: false })}
                        ${field({ name: "story.highlight", label: t("admin.storyHighlight"), value: story.highlight, attrs: 'maxlength="60"', wide: false })}
                    </div>
                </fieldset>

                <datalist id="series-options">
                    ${(seriesOptions || []).map(series => `<option value="${esc(series)}">`).join("")}
                </datalist>

                <button type="submit" class="button-primary button-primary--auto">
                    <span data-label>${t(isNew ? "admin.create" : "admin.save")}</span>
                    <span aria-hidden="true">↗</span>
                </button>
            </form>
        `;
    }

    /*
       Desenha a janela. Com keepEdits, o que já foi digitado e ainda
       não salvo continua nos campos (ex.: ao trocar o idioma).
    */
    function renderEditor({ keepEdits = false } = {}) {
        const oldForm = productDialog.body.querySelector("form");
        const edits = keepEdits && oldForm
            ? Array.from(oldForm.elements)
                .filter(element => element.name)
                .map(element => [element.name, element.type === "checkbox" ? element.checked : element.value])
            : [];

        productDialog.body.innerHTML = createProductForm(editor.product);

        const form = productDialog.body.querySelector("form");
        edits.forEach(([name, value]) => {
            const element = form.elements[name];
            if (!element) return;
            if (element.type === "checkbox") element.checked = value;
            else element.value = value;
        });

        updateTranslateUI();

        return form;
    }

    /* Só a parte das fotos (ao reordenar, tirar ou enviar). */
    function renderPhotos() {
        const section = productDialog.body.querySelector("[data-photos]");
        if (!section) return;

        section.outerHTML = photosSection();
    }

    async function loadSeriesOptions() {
        if (seriesOptions) return;

        try {
            ({ series: seriesOptions } = await api.get("/api/admin/products/series"));
            const list = productDialog.body.querySelector("#series-options");
            if (list) list.innerHTML = seriesOptions.map(series => `<option value="${esc(series)}">`).join("");
        } catch (error) {
            seriesOptions = [];
        }
    }

    function openEditor(product) {
        editor.open = true;
        editor.product = product;
        editor.gallery = product ? product.gallery.map(image => ({ src: image.src, alt: { ...image.alt } })) : [];
        undoEnglish = null;

        const form = renderEditor();
        productDialog.element.showModal();
        (form.elements.code || form.elements.name).focus();

        loadSeriesOptions();
        loadTranslation();
    }

    function closeEditor() {
        if (productDialog.element.open) productDialog.element.close();
    }

    /* Leva para a janela o produto que o servidor devolveu (e a lista). */
    function applySavedProduct(product) {
        editor.product = product;
        editor.gallery = product.gallery.map(image => ({ src: image.src, alt: { ...image.alt } }));

        const index = state.products.findIndex(item => item.id === product.id);
        if (index !== -1) state.products[index] = product;

        renderProductRows();
        state.loaded.overview = false;
    }

    function readProductForm(form) {
        const value = name => form.elements[name]?.value.trim() ?? "";
        const texts = Object.fromEntries(LANGS.map(lang => [lang, {
            tagline: value(`${lang}.tagline`),
            description: value(`${lang}.description`),
            concept: value(`${lang}.concept`),
            materials: value(`${lang}.materials`),
            storyText: value(`${lang}.storyText`),
            specs: textToSpecs(form.elements[`${lang}.specs`].value)
        }]));

        const data = {
            name: value("name"),
            series: value("series"),
            subtitle: value("subtitle"),
            price: Number(form.elements.price.value),
            // Em branco = sem controle de estoque.
            stock: value("stock") === "" ? null : Number(value("stock")),
            story: {
                eyebrow: value("story.eyebrow"),
                title: value("story.title"),
                highlight: value("story.highlight")
            },
            texts
        };

        if (editor.product) {
            data.isActive = form.elements.isActive.checked;
            data.gallery = editor.gallery;
        } else {
            data.code = value("code");
        }

        return data;
    }

    /* "texts.pt.specs.2.1" → "pt.specs"; "story.title" fica igual. */
    function fieldNameFromApi(apiName) {
        const text = apiName.match(/^texts\.(pt|en)\.(\w+)/);
        if (text) return `${text[1]}.${text[2]}`;
        return apiName.split(".").slice(0, apiName.startsWith("story.") ? 2 : 1).join(".");
    }

    async function saveProduct(form) {
        const button = form.querySelector("[type='submit']");
        const isNew = !editor.product;
        const pt = readLangTexts(form, "pt");

        // Produto novo com o inglês todo em branco: traduz sozinho antes de criar.
        const autoTranslate = isNew && Boolean(translation.provider) &&
            isEmptyTexts(readLangTexts(form, "en")) && Boolean(pt.tagline || pt.description);
        let translated = false;

        forms.clearErrors(form);
        forms.setMessage(form, "");
        forms.setBusy(button, true, t(!isNew ? "admin.saving" : autoTranslate ? "admin.translating" : "admin.creating"));

        if (autoTranslate) {
            try {
                writeLangTexts(form, "en", await translateTexts(pt, "pt", "en", loaded => {
                    forms.setMessage(form, t("admin.downloadingTranslator", { percent: Math.round(loaded * 100) }), "info");
                }));
                translated = true;
                forms.setMessage(form, "");
            } catch (error) {
                forms.setMessage(form, translationError(error));
                forms.setBusy(button, false);
                button.focus();
                return;
            }

            button.querySelector("[data-label]").textContent = t("admin.creating");
        }

        try {
            const data = readProductForm(form);
            const { product } = isNew
                ? await api.post("/api/admin/products", data)
                : await api.put(`/api/admin/products/${editor.product.id}`, data);

            applySavedProduct(product);

            // Produto novo: a lista ganha o item e a janela vira edição (com fotos).
            if (isNew) loadProducts();

            const fresh = renderEditor();
            const message = !isNew ? "admin.saved" : translated ? "admin.createdTranslated" : "admin.created";

            forms.setMessage(fresh, t(message, { name: product.name }), "success");
            fresh.scrollIntoView({ block: "start" });
        } catch (error) {
            const fields = Object.fromEntries(
                Object.entries(error.fields || {}).map(([name, message]) => [fieldNameFromApi(name), message])
            );
            const firstInvalid = forms.showErrors(form, fields);

            forms.setMessage(form, error.message);
            (firstInvalid || button).focus();
            forms.setBusy(button, false);
        }
    }


    /* ---------- Tradução automática ----------

       Dois caminhos, sem nada a configurar no navegador:
       - "deepl": o servidor traduz (com DEEPL_API_KEY no .env);
       - "browser": o tradutor embutido do Chrome/Edge no computador
         (roda no próprio PC; na primeira vez baixa o idioma).
       null = nenhum disponível: o admin escreve os dois idiomas.
    */
    const translation = { provider: undefined, loading: null };
    const TEXT_KEYS = ["tagline", "description", "concept", "materials", "storyText"];

    const browserTranslator = () => ("Translator" in self ? self.Translator : null);

    function loadTranslation() {
        translation.loading ||= api.get("/api/admin/translate")
            .then(({ provider }) => provider, () => null)
            .then(server => {
                translation.provider = server || (browserTranslator() ? "browser" : null);
                updateTranslateUI();
            });

        return translation.loading;
    }

    /* Ajusta a janela aberta quando se descobre qual tradutor existe. */
    function updateTranslateUI() {
        const form = productDialog.body.querySelector("form");
        if (!form || translation.provider === undefined) return;

        const button = form.querySelector("[data-translate-en]");
        if (button) button.hidden = !translation.provider;

        const hint = form.querySelector("[data-translate-hint]");
        if (hint) hint.textContent = translateHint(editor.product);
    }

    const isEmptyTexts = texts => TEXT_KEYS.every(key => !texts[key]) && texts.specs.length === 0;

    function readLangTexts(form, lang) {
        const value = name => form.elements[`${lang}.${name}`]?.value.trim() ?? "";

        return {
            ...Object.fromEntries(TEXT_KEYS.map(key => [key, value(key)])),
            specs: textToSpecs(form.elements[`${lang}.specs`].value)
        };
    }

    function writeLangTexts(form, lang, texts) {
        TEXT_KEYS.forEach(key => {
            form.elements[`${lang}.${key}`].value = texts[key];
        });
        form.elements[`${lang}.specs`].value = specsToText(texts.specs);

        // Os textos novos substituem os antigos: some o erro desses campos.
        [...TEXT_KEYS, "specs"].forEach(key => forms.setFieldError(form.elements[`${lang}.${key}`], ""));
    }

    async function translateStrings(strings, from, to, onProgress) {
        if (translation.provider === "deepl") {
            const { texts } = await api.post("/api/admin/translate", { from, to, texts: strings });
            return texts;
        }

        const Translator = browserTranslator();
        const options = { sourceLanguage: from, targetLanguage: to };

        if (!Translator || await Translator.availability(options) === "unavailable") {
            throw new Error(t("admin.translateHint.none"));
        }

        const translator = await Translator.create({
            ...options,
            monitor(monitor) {
                monitor.addEventListener("downloadprogress", event => onProgress?.(event.loaded));
            }
        });

        try {
            const result = [];
            for (const text of strings) {
                result.push(text.trim() ? await translator.translate(text) : "");
            }
            return result;
        } finally {
            translator.destroy?.();
        }
    }

    /* Todos os textos de um idioma (especificações: rótulo e valor). */
    async function translateTexts(texts, from, to, onProgress) {
        const strings = [...TEXT_KEYS.map(key => texts[key]), ...texts.specs.flat()];
        const output = (await translateStrings(strings, from, to, onProgress)).map(text => String(text).trim());
        const specs = output.slice(TEXT_KEYS.length);

        return {
            ...Object.fromEntries(TEXT_KEYS.map((key, index) => [key, output[index]])),
            specs: texts.specs.map((pair, index) => [specs[index * 2], specs[index * 2 + 1]])
        };
    }

    /*
       Mensagem do servidor (DeepL) quando houver. Do tradutor do navegador,
       os erros comuns ganham uma explicação; o detalhe vai para o console.
    */
    function translationError(error) {
        console.error("[tradução]", error);

        let reason = "";
        if (error.name === "ApiError" || error.message === t("admin.translateHint.none")) reason = error.message;
        else if (error.name === "NotAllowedError") reason = t("admin.translateNotAllowed");
        else if (error.name === "NetworkError" || error.name === "AbortError") reason = t("admin.translateDownload");

        return t("admin.translateFailed", { reason });
    }

    /*
       "Traduzir do português": preenche os textos em inglês na hora.
       O que estava antes pode voltar com "Desfazer". Nada é salvo até
       clicar em Criar/Salvar.
    */
    let undoEnglish = null;

    function setTranslateStatus(form, text, type = "", withUndo = false) {
        const status = form.querySelector("[data-translate-status]");
        if (!status) return;

        status.dataset.type = type;
        status.textContent = text;

        if (withUndo) {
            const undo = document.createElement("button");
            undo.type = "button";
            undo.className = "admin-translate-undo";
            undo.dataset.translateUndo = "";
            undo.textContent = t("admin.undo");
            status.append(" ", undo);
        }
    }

    async function translateEnglish(button) {
        const form = button.closest("form");
        const label = button.querySelector("[data-label]");
        const source = readLangTexts(form, "pt");

        if (!source.tagline && !source.description) {
            setTranslateStatus(form, t("admin.translateEmpty"), "error");
            return;
        }

        const previous = readLangTexts(form, "en");

        button.disabled = true;
        label.textContent = t("admin.translatingShort");
        setTranslateStatus(form, "");

        try {
            const translated = await translateTexts(source, "pt", "en", loaded => {
                setTranslateStatus(form, t("admin.downloadingTranslator", { percent: Math.round(loaded * 100) }));
            });

            writeLangTexts(form, "en", translated);
            undoEnglish = isEmptyTexts(previous) ? null : previous;
            setTranslateStatus(form, t("admin.translated"), "success", Boolean(undoEnglish));
            form.elements["en.tagline"].focus();
        } catch (error) {
            setTranslateStatus(form, translationError(error), "error");
        } finally {
            button.disabled = false;
            label.textContent = t("admin.translateFromPt");
        }
    }

    function undoTranslation(form) {
        if (!undoEnglish) return;

        writeLangTexts(form, "en", undoEnglish);
        undoEnglish = null;
        setTranslateStatus(form, t("admin.translateUndone"));
    }


    /* ---------- Fotos ---------- */

    // Mesmo limite do servidor (5 MB, até 8 fotos): avisa antes de enviar.
    const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
    const MAX_PHOTOS = 8;
    const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

    function setUploadStatus(text, isError = false) {
        const status = productDialog.body.querySelector("[data-upload-status]");
        if (!status) return;

        status.textContent = text;
        status.classList.toggle("is-error", isError);
    }

    /*
       Envia uma foto por vez (o corpo é o próprio arquivo). Cada envio
       já fica salvo; a nova foto entra no fim da galeria que o admin
       está arrumando, sem desfazer a ordem ainda não salva.
    */
    async function uploadPhotos(files) {
        const id = editor.product.id;
        const list = Array.from(files);
        let lastError = "";

        for (const [index, file] of list.entries()) {
            if (editor.gallery.length >= MAX_PHOTOS) {
                lastError = t("admin.tooManyPhotos");
                break;
            }

            if (!PHOTO_TYPES.includes(file.type) || file.size > MAX_PHOTO_BYTES) {
                lastError = t("admin.photoInvalid", { name: file.name });
                continue;
            }

            setUploadStatus(t("admin.uploading", { current: index + 1, total: list.length }));

            try {
                const response = await fetch(`/api/admin/products/${id}/images`, {
                    method: "POST",
                    credentials: "same-origin",
                    headers: { "Content-Type": file.type, "Accept-Language": Sonora.i18n.locale },
                    body: file
                });
                const data = await response.json().catch(() => ({}));

                if (!response.ok) throw new Error(data.error || t("generic.error"));

                // Acrescenta só as fotos que ainda não estão na galeria local.
                const known = new Set(editor.gallery.map(image => image.src));
                data.product.gallery
                    .filter(image => !known.has(image.src))
                    .forEach(image => editor.gallery.push({ src: image.src, alt: { ...image.alt } }));

                editor.product = { ...editor.product, gallery: data.product.gallery, image: data.product.image };
            } catch (error) {
                lastError = error.message;
            }

            renderPhotos();
        }

        setUploadStatus(lastError, Boolean(lastError));

        // A miniatura da lista pode ter mudado (primeira foto).
        const index = state.products.findIndex(item => item.id === id);
        if (index !== -1) {
            state.products[index] = { ...state.products[index], image: editor.product.image };
            renderProductRows();
        }
    }

    function handlePhotoClick(event) {
        const card = event.target.closest("[data-photo-index]");
        if (!card) return;

        const index = Number(card.dataset.photoIndex);
        const move = event.target.closest("[data-photo-move]");

        if (move) {
            const target = index + Number(move.dataset.photoMove);
            [editor.gallery[index], editor.gallery[target]] = [editor.gallery[target], editor.gallery[index]];
            renderPhotos();
            productDialog.body.querySelector(`[data-photo-index="${target}"] [data-photo-move="${move.dataset.photoMove}"]`)?.focus();
            return;
        }

        if (event.target.closest("[data-photo-remove]")) {
            editor.gallery.splice(index, 1);
            renderPhotos();
        }
    }


    /* =========================
       05. EVENTOS E INICIALIZAÇÃO
    ========================= */

    window.addEventListener("hashchange", showTab);

    ordersUI.filter.addEventListener("submit", event => {
        event.preventDefault();
        clearTimeout(searchTimer);
        loadOrders();
    });
    ordersUI.search.addEventListener("input", scheduleSearch);
    ordersUI.status.addEventListener("change", () => {
        showMessage(ordersUI.message, "");
        loadOrders();
    });
    ordersUI.more.addEventListener("click", () => loadOrders({ append: true }));

    ordersUI.list.addEventListener("click", event => {
        const button = event.target.closest(".admin-action");
        if (button && !button.disabled) changeStatus(button);
    });

    productsUI.filter.addEventListener("submit", event => {
        event.preventDefault();
        clearTimeout(productSearchTimer);
        loadProducts();
    });
    productsUI.search.addEventListener("input", scheduleProductSearch);
    productsUI.status.addEventListener("change", () => loadProducts());
    productsUI.more.addEventListener("click", () => loadProducts({ append: true }));

    productsUI.list.addEventListener("click", event => {
        const row = event.target.closest("[data-edit-product]");
        if (!row) return;

        const product = state.products.find(item => item.id === Number(row.dataset.editProduct));
        if (product) openEditor(product);
    });

    productsUI.create.addEventListener("click", () => openEditor(null));

    productDialog.body.addEventListener("submit", event => {
        event.preventDefault();
        saveProduct(event.target);
    });

    productDialog.body.addEventListener("input", event => {
        const target = event.target;

        if (target.getAttribute("aria-invalid") === "true") forms.setFieldError(target, "");

        // Texto alternativo de uma foto: guarda na galeria em edição.
        if (target.dataset.photoAlt) {
            const index = Number(target.closest("[data-photo-index]").dataset.photoIndex);
            editor.gallery[index].alt[target.dataset.photoAlt] = target.value;
        }
    });

    productDialog.body.addEventListener("click", event => {
        const translateButton = event.target.closest("[data-translate-en]");
        if (translateButton) {
            if (!translateButton.disabled) translateEnglish(translateButton);
            return;
        }

        if (event.target.closest("[data-translate-undo]")) {
            undoTranslation(event.target.closest("form"));
            return;
        }

        handlePhotoClick(event);
    });

    productDialog.body.addEventListener("change", event => {

        if (event.target.matches("[data-photo-input]") && event.target.files.length) {
            uploadPhotos(event.target.files);
        }
    });

    productDialog.element.addEventListener("click", event => {
        // Clique fora do conteúdo (no fundo escuro) ou no "×" fecha.
        if (event.target === productDialog.element || event.target.closest("[data-close-dialog]")) {
            closeEditor();
        }
    });

    // Ao fechar (Esc, × ou fundo), o foco volta para a linha do produto.
    productDialog.element.addEventListener("close", () => {
        const id = editor.product?.id;
        const row = id && productsUI.list.querySelector(`[data-edit-product="${id}"]`);

        editor.open = false;
        editor.product = null;
        editor.gallery = [];
        productDialog.body.innerHTML = "";

        (row || productsUI.create).focus();
    });

    // Troca de idioma: redesenha com os textos novos.
    window.addEventListener(Sonora.i18n.CHANGE_EVENT, () => {
        renderSummary();
        if (state.loaded.orders) renderOrders();
        renderProductRows();
        if (editor.open) renderEditor({ keepEdits: true });
        showMessage(ordersUI.message, "");
    });

    Sonora.auth.requireUser().then(user => {
        main.setAttribute("aria-busy", "false");

        if (!user.isAdmin) {
            layout.hidden = true;
            denied.hidden = false;
            return;
        }

        showTab();
    });
})(window.Sonora);
