/* =========================
   SONORA — HISTÓRICO DE PEDIDOS (pedidos.html)

   Busca os pedidos do usuário na API e mostra cada um em um
   card com status, total e detalhes expansíveis.

   Atenção: endereço e nome foram digitados por usuários, por
   isso todo texto vindo da API passa por escapeHTML.
========================= */

(function (Sonora) {
    "use strict";

    const { escapeHTML: esc } = Sonora.ui;
    const { t } = Sonora.i18n;

    const list = document.querySelector("#orders-list");
    const status = document.querySelector("#orders-status");
    const emptyState = document.querySelector("#orders-empty");
    const summary = document.querySelector("#orders-summary");

    // Status e pagamentos conhecidos (chaves do dicionário em i18n.js).
    const STATUSES = ["confirmed", "shipped", "delivered", "cancelled"];
    const PAYMENTS = ["pix", "card", "boleto"];

    const statusLabel = value => (STATUSES.includes(value) ? t(`orders.status.${value}`) : value);
    const paymentLabel = value => (PAYMENTS.includes(value) ? t(`payment.${value}`) : value);

    const formatDate = value => new Intl.DateTimeFormat(Sonora.i18n.locale, {
        day: "2-digit",
        month: "long",
        year: "numeric"
    }).format(new Date(value));

    const price = value => Sonora.formatPrice(value);

    // Pedidos já carregados: ao trocar o idioma, só redesenha.
    let loadedOrders = null;


    /* =========================
       01. PEDAÇOS DO CARD
    ========================= */

    // Foto do catálogo; se o produto sair do catálogo, mostra só o nome.
    function getImage(productId) {
        const product = Sonora.findProduct(productId);
        return product ? product.image : null;
    }

    function createThumb(item) {
        const image = getImage(item.productId);

        return `
            <li class="order-thumb">
                ${image ? `<img src="${image}" alt="">` : ""}
                <span class="order-thumb-qty" aria-hidden="true">${item.quantity}</span>
            </li>
        `;
    }

    function createItemRow(item) {
        const image = getImage(item.productId);
        const product = Sonora.findProduct(item.productId);
        const name = product
            ? `<a href="${Sonora.ui.getProductUrl(product)}">${esc(item.name)}</a>`
            : esc(item.name);

        return `
            <li class="order-item">
                ${image ? `<img src="${image}" alt="">` : "<span class='order-item-placeholder'></span>"}
                <div>
                    <p class="order-item-name">${name}</p>
                    <p class="order-item-meta">${item.quantity} × ${price(item.unitPrice)}</p>
                </div>
                <p class="order-item-total">${price(item.unitPrice * item.quantity)}</p>
            </li>
        `;
    }

    function formatAddress({ street, number, complement, district, city, state, cep }) {
        const formattedCep = Sonora.forms.masks.cep(cep);

        return [
            `${esc(street)}, ${esc(number)}${complement ? ` — ${esc(complement)}` : ""}`,
            esc(district),
            `${esc(city)} — ${esc(state)}`,
            `CEP ${esc(formattedCep)}`
        ].join("<br>");
    }

    function createOrderCard(order) {
        const itemsCount = order.items.reduce((total, item) => total + item.quantity, 0);

        return `
            <article class="order-card" data-reveal>
                <header class="order-header">
                    <div>
                        <h3 class="order-number">${t("orders.order", { number: esc(order.number) })}</h3>
                        <p class="order-date">
                            <time datetime="${esc(order.createdAt)}">${formatDate(order.createdAt)}</time>
                            · ${itemsCount} ${t(itemsCount === 1 ? "orders.itemOne" : "orders.itemMany")}
                        </p>
                    </div>

                    <span class="order-status order-status--${esc(order.status)}">${esc(statusLabel(order.status))}</span>

                    <p class="order-total">${price(order.total)}</p>
                </header>

                <ul class="order-thumbs" aria-hidden="true">
                    ${order.items.map(createThumb).join("")}
                </ul>

                <details class="order-details">
                    <summary>${t("orders.details")}</summary>

                    <div class="order-details-grid">
                        <div>
                            <h4>${t("orders.items")}</h4>
                            <ul class="order-items">
                                ${order.items.map(createItemRow).join("")}
                            </ul>
                        </div>

                        <div class="order-meta">
                            <h4>${t("orders.delivery")}</h4>
                            <p>${esc(order.customer.name)}<br>${formatAddress(order.address)}</p>

                            <h4>${t("orders.payment")}</h4>
                            <p>${esc(paymentLabel(order.payment))}</p>

                            <dl class="order-totals">
                                <div><dt>${t("orders.subtotal")}</dt><dd>${price(order.subtotal)}</dd></div>
                                ${order.discount > 0
                                    ? `<div class="is-discount"><dt>${t("orders.pixDiscount")}</dt><dd>− ${price(order.discount)}</dd></div>`
                                    : ""}
                                <div><dt>${t("orders.shipping")}</dt><dd>${t("orders.free")}</dd></div>
                                <div class="is-total"><dt>${t("orders.total")}</dt><dd>${price(order.total)}</dd></div>
                            </dl>
                        </div>
                    </div>
                </details>
            </article>
        `;
    }


    /* =========================
       02. RENDERIZAÇÃO
    ========================= */

    function renderOrders(orders) {
        loadedOrders = orders;
        status.hidden = true;

        if (orders.length === 0) {
            emptyState.hidden = false;
            summary.textContent = t("orders.none");
            return;
        }

        const totalSpent = orders.reduce((total, order) => total + order.total, 0);

        summary.textContent = orders.length === 1
            ? t("orders.summaryOne", { total: price(totalSpent) })
            : t("orders.summaryMany", { count: orders.length, total: price(totalSpent) });

        list.innerHTML = orders.map(createOrderCard).join("");
        Sonora.reveal?.scan(list);
    }

    function renderError(message) {
        status.textContent = message;
        status.dataset.state = "error";
    }


    /* =========================
       03. INICIALIZAÇÃO
    ========================= */

    // As fotos dos itens vêm do catálogo; sem ele, o pedido aparece sem foto.
    Sonora.account.ready
        .then(() => Promise.all([Sonora.api.get("/api/orders"), Sonora.catalog.ready]))
        .then(([data]) => renderOrders(data.orders))
        .catch(error => renderError(error.message));

    window.addEventListener(Sonora.i18n.CHANGE_EVENT, () => {
        if (loadedOrders) renderOrders(loadedOrders);
    });
})(window.Sonora);
