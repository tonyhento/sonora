/* =========================
   SONORA — SACOLA LATERAL (INTERFACE)

   Monta o painel da sacola em qualquer página que carregar
   este arquivo. No HTML basta ter:

   - um botão com  data-cart-open   (abre a sacola)
   - um elemento com data-cart-count (mostra a quantidade)

   Acessível: o foco fica preso dentro do painel enquanto ele
   está aberto, Esc fecha e o foco volta para o botão de origem.
========================= */

(function (Sonora) {
    "use strict";

    const CHECKOUT_URL = "checkout.html";

    const FOCUSABLE = [
        "a[href]:not([aria-disabled='true'])",
        "button:not([disabled])",
        "input:not([disabled])",
        "select:not([disabled])",
        "[tabindex]:not([tabindex='-1'])"
    ].join(",");


    /* =========================
       01. ESTRUTURA DO PAINEL
    ========================= */

    function createDrawer() {
        const overlay = document.createElement("div");

        overlay.className = "cart-overlay";
        overlay.hidden = true;
        overlay.innerHTML = `
            <section
                class="cart-panel"
                role="dialog"
                aria-modal="true"
                aria-labelledby="cart-title"
            >
                <div class="cart-header">
                    <h2 id="cart-title">Your bag<span>.</span></h2>

                    <button
                        type="button"
                        class="cart-close"
                        data-cart-close
                        data-i18n-attr="aria-label:cart.close"
                    >×</button>
                </div>

                <div class="cart-items" data-cart-items></div>

                <div class="cart-footer">
                    <p>
                        <span data-i18n="cart.subtotal"></span>
                        <strong data-cart-subtotal>R$ 0,00</strong>
                    </p>

                    <p class="cart-warning" data-cart-warning role="status" hidden></p>

                    <a class="checkout-button" href="${CHECKOUT_URL}" data-cart-checkout data-i18n="cart.checkout"></a>

                    <p class="cart-note" data-i18n="cart.note"></p>
                </div>
            </section>
        `;

        document.body.append(overlay);
        Sonora.i18n.translateDom(overlay);

        return {
            overlay,
            panel: overlay.querySelector(".cart-panel"),
            closeButton: overlay.querySelector("[data-cart-close]"),
            items: overlay.querySelector("[data-cart-items]"),
            subtotal: overlay.querySelector("[data-cart-subtotal]"),
            warning: overlay.querySelector("[data-cart-warning]"),
            checkout: overlay.querySelector("[data-cart-checkout]")
        };
    }

    const drawer = createDrawer();
    const openButtons = document.querySelectorAll("[data-cart-open]");
    const countElements = document.querySelectorAll("[data-cart-count]");

    let lastFocusedElement = null;


    /* =========================
       02. CONTEÚDO
    ========================= */

    // Textos vindos do painel administrativo: sempre escapados.
    const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[char]);

    function stockLine(item) {
        const { t } = Sonora.i18n;

        if (Sonora.stock.isSoldOut(item)) {
            return `<p class="cart-item-stock is-out">${t("stock.soldOutRemove")}</p>`;
        }

        if (item.quantity > Sonora.stock.limit(item)) {
            return `<p class="cart-item-stock is-out">${t("stock.onlyLeft", { count: item.stock })}</p>`;
        }

        if (Sonora.cart.available(item.id) === 0 && item.stock !== null) {
            return `<p class="cart-item-stock">${t("stock.maxInBag")}</p>`;
        }

        return "";
    }

    function createCartItem(item) {
        const { t } = Sonora.i18n;

        const productUrl = Sonora.ui
            ? Sonora.ui.getProductUrl(item)
            : `produto.html?id=${item.id}`;

        const canIncrease = Sonora.cart.available(item.id) > 0;

        return `
            <article class="cart-item${Sonora.stock.isSoldOut(item) ? " is-sold-out" : ""}">
                <a href="${productUrl}" tabindex="-1">
                    <img src="${esc(item.image)}" alt="${esc(item.name)}">
                </a>

                <div class="cart-item-info">
                    <h3><a href="${productUrl}">${esc(item.name)}</a></h3>
                    <p>${esc(item.series)}</p>
                    <p>${Sonora.formatPrice(item.price)}</p>
                    ${stockLine(item)}

                    <div class="quantity-controls">
                        <button
                            type="button"
                            data-action="decrease"
                            data-product-id="${item.id}"
                            aria-label="${esc(t("cart.decrease", { name: item.name }))}"
                        >−</button>

                        <span aria-label="${t("cart.quantity")}">${item.quantity}</span>

                        <button
                            type="button"
                            data-action="increase"
                            data-product-id="${item.id}"
                            aria-label="${esc(t("cart.increase", { name: item.name }))}"
                            ${canIncrease ? "" : "disabled"}
                        >+</button>
                    </div>
                </div>

                <button
                    type="button"
                    class="remove-item"
                    data-action="remove"
                    data-product-id="${item.id}"
                    aria-label="${esc(t("cart.remove", { name: item.name }))}"
                >×</button>
            </article>
        `;
    }

    function render() {
        const items = Sonora.cart.getItems();
        const isEmpty = items.length === 0;
        const hasUnavailable = Sonora.cart.hasUnavailable();

        countElements.forEach(element => {
            element.textContent = Sonora.cart.count();
        });

        drawer.subtotal.textContent = Sonora.formatPrice(Sonora.cart.subtotal());

        // Sem itens (ou com item esgotado), o link de checkout fica desativado.
        const blocked = isEmpty || hasUnavailable;

        drawer.checkout.setAttribute("aria-disabled", String(blocked));
        drawer.checkout.tabIndex = blocked ? -1 : 0;

        drawer.warning.hidden = !hasUnavailable;
        drawer.warning.textContent = hasUnavailable ? Sonora.i18n.t("stock.fixBag") : "";

        drawer.items.innerHTML = isEmpty
            ? `
                <div class="cart-empty">
                    <p>${Sonora.i18n.t("cart.emptyTitle")}</p>
                    <span>${Sonora.i18n.t("cart.emptyText")}</span>
                </div>
            `
            : items.map(createCartItem).join("");
    }


    /* =========================
       03. ABRIR, FECHAR E FOCO
    ========================= */

    function isOpen() {
        return !drawer.overlay.hidden;
    }

    function open() {
        if (isOpen()) return;

        lastFocusedElement = document.activeElement;

        drawer.overlay.hidden = false;
        document.body.classList.add("is-locked");
        drawer.closeButton.focus();
    }

    function close() {
        if (!isOpen()) return;

        drawer.overlay.hidden = true;
        document.body.classList.remove("is-locked");

        if (lastFocusedElement && document.contains(lastFocusedElement)) {
            lastFocusedElement.focus();
        }
    }

    // Mantém o Tab circulando apenas dentro do painel.
    function trapFocus(event) {
        if (event.key !== "Tab") return;

        const focusable = Array.from(drawer.panel.querySelectorAll(FOCUSABLE))
            .filter(element => element.offsetParent !== null);

        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    }


    /* =========================
       04. EVENTOS
    ========================= */

    function handleItemAction(event) {
        const button = event.target.closest("[data-action]");
        if (!button) return;

        const { action, productId } = button.dataset;
        const actions = {
            increase: () => Sonora.cart.increase(productId),
            decrease: () => Sonora.cart.decrease(productId),
            remove: () => Sonora.cart.remove(productId)
        };

        if (!actions[action]) return;

        actions[action]();

        // Após remover um item, mantém o foco dentro do painel.
        if (!document.contains(button)) {
            drawer.closeButton.focus();
        }
    }

    openButtons.forEach(button => {
        button.setAttribute("aria-haspopup", "dialog");
        button.addEventListener("click", open);
    });

    drawer.closeButton.addEventListener("click", close);
    drawer.items.addEventListener("click", handleItemAction);
    drawer.panel.addEventListener("keydown", trapFocus);

    drawer.checkout.addEventListener("click", event => {
        if (drawer.checkout.getAttribute("aria-disabled") === "true") {
            event.preventDefault();
        }
    });

    drawer.overlay.addEventListener("click", event => {
        if (event.target === drawer.overlay) close();
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape" && isOpen()) close();
    });

    window.addEventListener(Sonora.cart.CHANGE_EVENT, render);
    window.addEventListener(Sonora.i18n.CHANGE_EVENT, render);
    window.addEventListener(Sonora.catalog.READY_EVENT, render);


    /* =========================
       05. INICIALIZAÇÃO
    ========================= */

    render();

    Sonora.cartUI = { open, close };
})(window.Sonora);
