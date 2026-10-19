/* =========================
   SONORA — CHECKOUT

   - Resumo do pedido lido da sacola (cart.js).
   - Validação no navegador (resposta imediata) + validação
     no servidor (a que vale de verdade).
   - Máscaras de celular e CEP; busca de endereço no ViaCEP.
   - Pix aplica 5% de desconto no total.
   - Ao confirmar, o pedido é salvo no PostgreSQL pela API.
     Com login, ele aparece em "Meus pedidos".

   Pagamento:
   - Pix e boleto: simulados, o pedido vale na hora.
   - Cartão: o cliente vai para a página do Stripe (modo de
     teste) e volta para cá com ?session_id=... — aí o servidor
     confere com o Stripe e só então confirma o pedido.
========================= */

(function (Sonora) {
    "use strict";

    /* =========================
       01. CONFIGURAÇÃO
    ========================= */

    const PIX_DISCOUNT = 0.05;
    const CEP_TIMEOUT_MS = 6000;

    const STATES = [
        "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO",
        "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI",
        "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"
    ];

    const PAYMENT_LABELS = {
        pix: () => t("payment.pix"),
        card: () => t("checkout.cardPaid"),
        boleto: () => t("payment.boleto")
    };

    // Nome do campo na API → name do input no formulário.
    const API_FIELD_MAP = {
        "customer.name": "name",
        "customer.email": "email",
        "customer.phone": "phone",
        "address.cep": "cep",
        "address.street": "street",
        "address.number": "number",
        "address.complement": "complement",
        "address.district": "district",
        "address.city": "city",
        "address.state": "state"
    };

    const { forms } = Sonora;
    const { t } = Sonora.i18n;


    /* =========================
       02. ELEMENTOS
    ========================= */

    const form = document.querySelector("#checkout-form");
    const submitButton = document.querySelector("#checkout-submit");
    const pageHeading = document.querySelector(".checkout-heading");
    const accountNote = document.querySelector("#checkout-account");
    const cepStatus = document.querySelector("#cep-status");

    const views = {
        checkout: document.querySelector("#checkout-view"),
        empty: document.querySelector("#checkout-empty"),
        success: document.querySelector("#checkout-success")
    };

    const summary = {
        items: document.querySelector("#summary-items"),
        subtotal: document.querySelector("#summary-subtotal"),
        discountRow: document.querySelector("#summary-discount-row"),
        discount: document.querySelector("#summary-discount"),
        total: document.querySelector("#summary-total")
    };

    const statusMessage = document.querySelector("#checkout-status");
    const submitLabel = submitButton.querySelector("[data-label]");

    // Volta do Stripe (pagou ou desistiu).
    const returnParams = new URLSearchParams(window.location.search);
    const returningSessionId = returnParams.get("session_id");
    const paymentCancelled = returnParams.get("payment") === "cancelled";

    const success = {
        number: document.querySelector("#success-number"),
        message: document.querySelector("#success-message"),
        details: document.querySelector("#success-details"),
        ordersLink: document.querySelector("#success-orders-link")
    };

    let isSubmitting = false;
    let cepController = null;
    let confirmedOrder = null;
    let isConfirmingPayment = false;


    /* =========================
       03. TOTAIS (prévia)
       O valor final é recalculado no servidor com os preços
       do banco; aqui é só a prévia para o cliente.
    ========================= */

    function getPaymentMethod() {
        return form.elements.payment.value || "pix";
    }

    function calculateTotals() {
        const subtotal = Sonora.cart.subtotal();
        const discount = getPaymentMethod() === "pix" ? subtotal * PIX_DISCOUNT : 0;

        return { subtotal, discount, total: subtotal - discount };
    }


    /* =========================
       04. VALIDAÇÃO NO NAVEGADOR
       Cada regra retorna a mensagem de erro ou "" se ok.
    ========================= */

    const required = key => value => (value.trim() ? "" : t(key));

    const rules = {
        name(value) {
            const words = value.trim().split(/\s+/).filter(Boolean);
            if (!value.trim()) return t("validation.name");
            return words.length >= 2 ? "" : t("validation.fullName");
        },

        email(value) {
            if (!value.trim()) return t("validation.email");
            return Sonora.ui.EMAIL_PATTERN.test(value.trim()) ? "" : t("validation.emailInvalid");
        },

        phone(value) {
            const digits = forms.onlyDigits(value);
            if (!digits) return t("validation.phone");
            return digits.length >= 10 ? "" : t("validation.phoneShort");
        },

        cep(value) {
            const digits = forms.onlyDigits(value);
            if (!digits) return t("validation.cep");
            return digits.length === 8 ? "" : t("validation.cepLength");
        },

        street: required("validation.street"),
        number: required("validation.number"),
        district: required("validation.district"),
        city: required("validation.city"),
        state: required("validation.state")
    };

    function validateField(input) {
        const rule = rules[input.name];
        if (!rule) return true;

        const message = rule(input.value);
        forms.setFieldError(input, message);

        return !message;
    }

    function validateForm() {
        return Object.keys(rules)
            .map(name => form.elements[name])
            .filter(input => !validateField(input));
    }

    // Valida ao sair do campo; depois do primeiro erro, também ao digitar.
    function handleBlur(event) {
        if (rules[event.target.name]) validateField(event.target);
    }

    function handleLiveValidation(event) {
        const input = event.target;
        if (input.getAttribute("aria-invalid") === "true") validateField(input);
    }


    /* =========================
       05. BUSCA DE CEP (ViaCEP)
    ========================= */

    function setCepStatus(message, type = "") {
        cepStatus.textContent = message;
        cepStatus.dataset.state = type;
    }

    function fillAddress(data) {
        const fields = {
            street: data.logradouro,
            district: data.bairro,
            city: data.localidade,
            state: data.uf
        };

        Object.entries(fields).forEach(([name, value]) => {
            if (!value) return;

            form.elements[name].value = value;
            forms.setFieldError(form.elements[name], "");
        });
    }

    async function lookupCep(cep) {
        // Cancela uma busca anterior que ainda esteja em andamento.
        if (cepController) cepController.abort();

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), CEP_TIMEOUT_MS);

        cepController = controller;
        setCepStatus(t("checkout.cepLoading"), "loading");

        try {
            const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`, {
                signal: controller.signal
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = await response.json();

            if (data.erro) {
                setCepStatus(t("checkout.cepNotFound"), "error");
                return;
            }

            fillAddress(data);
            setCepStatus(t("checkout.cepFound", { city: data.localidade, state: data.uf }), "success");

            // Leva o cliente direto ao próximo campo que falta.
            const nextField = !form.elements.street.value
                ? form.elements.street
                : form.elements.number;

            nextField.focus();
        } catch (error) {
            // Uma busca mais nova substituiu esta: não mostra erro.
            if (cepController !== controller) return;

            setCepStatus(t("checkout.cepError"), "error");
        } finally {
            clearTimeout(timeout);
        }
    }

    function handleCepInput() {
        const digits = forms.onlyDigits(form.elements.cep.value);

        if (digits.length === 8) {
            lookupCep(digits);
        } else {
            setCepStatus(t("checkout.cepHint"));
        }
    }


    /* =========================
       06. RESUMO DO PEDIDO
    ========================= */

    function createSummaryItem(item) {
        const esc = Sonora.ui.escapeHTML;

        // Esgotado ou mais unidades do que o estoque: o cliente precisa ajustar.
        const stockProblem = Sonora.stock.isSoldOut(item)
            ? t("stock.soldOutRemove")
            : item.quantity > Sonora.stock.limit(item) ? t("stock.onlyLeft", { count: item.stock }) : "";

        return `
            <article class="summary-item">
                <div class="summary-thumb">
                    <img src="${esc(item.image)}" alt="">
                    <span class="summary-qty" aria-label="${t("cart.quantity")}">${item.quantity}</span>
                </div>

                <div class="summary-info">
                    <h3>${esc(item.name)}</h3>
                    <p>${esc(item.series)}</p>
                    ${stockProblem ? `<p class="summary-stock">${stockProblem}</p>` : ""}
                    ${Sonora.stock.isSoldOut(item)
                        ? `<button type="button" class="summary-remove" data-remove-item="${item.id}">${t("checkout.removeItem")}</button>`
                        : ""}
                </div>

                <p class="summary-price">${Sonora.formatPrice(item.price * item.quantity)}</p>
            </article>
        `;
    }

    function renderSummary() {
        const items = Sonora.cart.getItems();
        const { subtotal, discount, total } = calculateTotals();
        const payment = getPaymentMethod();

        summary.items.innerHTML = items.map(createSummaryItem).join("");
        summary.subtotal.textContent = Sonora.formatPrice(subtotal);
        summary.total.textContent = Sonora.formatPrice(total);

        summary.discountRow.hidden = discount === 0;
        summary.discount.textContent = `− ${Sonora.formatPrice(discount)}`;

        renderSubmitLabel(payment);
    }

    /* Cartão: o botão avisa que o próximo passo é a página do Stripe. */
    function renderSubmitLabel(payment = getPaymentMethod()) {
        if (submitButton.disabled) return;

        submitLabel.dataset.i18n = payment === "card" ? "checkout.payWithCard" : "checkout.confirm";
        submitLabel.textContent = t(submitLabel.dataset.i18n);
    }


    /* =========================
       07. CONTA (login opcional)
    ========================= */

    function renderAccountNote(user) {
        accountNote.hidden = false;

        // O texto vem do dicionário; o nome (digitado pelo usuário) entra
        // só como textContent, nunca como HTML.
        if (user) {
            accountNote.innerHTML = t("checkout.buyingAs", { name: "" });
            accountNote.querySelector("strong").textContent = user.name;
            return;
        }

        accountNote.innerHTML = t("checkout.guestNote");
    }

    /* Preenche os dados de contato com o perfil, sem apagar o que já foi digitado. */
    function prefillFromUser(user) {
        if (!user) return;

        const values = {
            name: user.name,
            email: user.email,
            phone: user.phone ? forms.masks.phone(user.phone) : ""
        };

        Object.entries(values).forEach(([name, value]) => {
            const input = form.elements[name];
            if (value && !input.value) input.value = value;
        });
    }


    /* =========================
       08. TROCA DE ESTADOS
    ========================= */

    function showView(name) {
        Object.entries(views).forEach(([key, element]) => {
            element.hidden = key !== name;
        });

        // Na confirmação, o título "Checkout." sai de cena.
        pageHeading.hidden = name === "success";
    }

    function syncWithCart() {
        // Depois de confirmado, a tela de sucesso permanece.
        if (!views.success.hidden || isConfirmingPayment) return;

        if (Sonora.cart.count() === 0) {
            showView("empty");
            return;
        }

        showView("checkout");
        renderSummary();
    }


    /* =========================
       09. CONFIRMAR PEDIDO
    ========================= */

    function buildPayload() {
        const data = new FormData(form);
        const value = name => String(data.get(name) || "").trim();

        return {
            customer: {
                name: value("name"),
                email: value("email"),
                phone: value("phone")
            },
            address: {
                cep: value("cep"),
                street: value("street"),
                number: value("number"),
                complement: value("complement"),
                district: value("district"),
                city: value("city"),
                state: value("state")
            },
            payment: value("payment"),
            // Só id e quantidade: o servidor busca nome e preço no banco.
            items: Sonora.cart.getItems().map(({ id, quantity }) => ({ id, quantity }))
        };
    }

    function formatAddress(address) {
        return [
            `${address.street}, ${address.number}`,
            address.complement,
            address.district,
            `${address.city} — ${address.state}`,
            forms.masks.cep(address.cep)
        ].filter(Boolean).join(" · ");
    }

    /* Textos da confirmação (refeitos também ao trocar o idioma). */
    function fillSuccess(order) {
        const firstName = order.customer.name.split(" ")[0];
        const isLoggedIn = Boolean(Sonora.auth.user);

        success.number.textContent = order.number;
        success.message.textContent = t(isLoggedIn ? "checkout.thanksUser" : "checkout.thanksGuest", {
            name: firstName
        });

        const rows = [
            [t("checkout.items"), order.items.map(item => `${item.quantity}× ${item.name}`).join(", ")],
            [t("checkout.delivery"), formatAddress(order.address)],
            [t("checkout.payment"), PAYMENT_LABELS[order.payment]?.() || order.payment],
            [t("checkout.total"), Sonora.formatPrice(order.total)]
        ];

        success.details.innerHTML = "";

        rows.forEach(([label, value]) => {
            const row = document.createElement("div");
            const term = document.createElement("dt");
            const detail = document.createElement("dd");

            term.textContent = label;
            detail.textContent = value;

            row.append(term, detail);
            success.details.append(row);
        });

        success.ordersLink.hidden = !isLoggedIn;
    }

    function renderSuccess(order) {
        confirmedOrder = order;
        fillSuccess(order);

        showView("success");
        window.scrollTo({ top: 0, behavior: "smooth" });
        views.success.focus({ preventScroll: true });
    }

    async function handleSubmit(event) {
        event.preventDefault();

        if (isSubmitting) return;

        forms.setMessage(form, "");

        const invalidFields = validateForm();

        if (invalidFields.length > 0) {
            invalidFields[0].focus();
            return;
        }

        // Item esgotado na sacola: nem envia (o servidor recusaria).
        if (Sonora.cart.hasUnavailable()) {
            forms.setMessage(form, t("stock.fixCheckout"));
            submitButton.focus();
            return;
        }

        isSubmitting = true;
        forms.setBusy(submitButton, true, t("checkout.processing"));

        let isLeavingToStripe = false;

        try {
            const { order, paymentUrl } = await Sonora.api.post("/api/orders", buildPayload());

            // Cartão: o pagamento acontece na página do Stripe. A sacola
            // fica intacta até o pagamento ser confirmado na volta.
            if (paymentUrl) {
                isLeavingToStripe = true;
                saveDraft();
                submitLabel.textContent = t("checkout.redirecting");
                window.location.assign(paymentUrl);
                return;
            }

            renderSuccess(order);
            Sonora.cart.clear();
            form.reset();
        } catch (error) {
            // Estoque mudou durante a compra: busca o catálogo de novo, e a
            // sacola e o resumo se ajustam ao que ainda existe.
            if (error.status === 409) await Sonora.catalog.refresh();

            const firstInvalid = forms.showErrors(form, error.fields, API_FIELD_MAP);

            forms.setMessage(form, error.message);
            (firstInvalid || submitButton).focus();
        } finally {
            if (!isLeavingToStripe) {
                isSubmitting = false;
                forms.setBusy(submitButton, false);
            }
        }
    }


    /* =========================
       10. VOLTA DO STRIPE
    ========================= */

    /*
       Rascunho do formulário: guardado ao ir para o Stripe e
       devolvido se a pessoa desistir, para não digitar tudo de novo.
       Fica no sessionStorage (só nesta aba, apagado ao fechá-la).
    */
    const DRAFT_KEY = "sonora-checkout-draft";
    const DRAFT_FIELDS = [
        "name", "email", "phone", "cep", "street", "number",
        "complement", "district", "city", "state", "payment"
    ];

    function saveDraft() {
        const draft = Object.fromEntries(
            DRAFT_FIELDS.map(name => [name, form.elements[name].value])
        );

        try {
            sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
        } catch (error) {
            // Sem armazenamento: a pessoa preenche de novo.
        }
    }

    function takeDraft() {
        try {
            const draft = JSON.parse(sessionStorage.getItem(DRAFT_KEY));
            sessionStorage.removeItem(DRAFT_KEY);
            return draft && typeof draft === "object" ? draft : null;
        } catch (error) {
            return null;
        }
    }

    function restoreDraft() {
        const draft = takeDraft();
        if (!draft) return;

        DRAFT_FIELDS.forEach(name => {
            if (typeof draft[name] === "string" && draft[name]) {
                form.elements[name].value = draft[name];
            }
        });

        renderSummary();
    }

    async function confirmPayment(sessionId) {
        isConfirmingPayment = true;

        showView("none");
        statusMessage.textContent = t("checkout.confirmingPayment");
        statusMessage.hidden = false;

        try {
            const [{ order }] = await Promise.all([
                Sonora.api.post("/api/payments/confirm", { sessionId }),
                Sonora.auth.load()
            ]);

            statusMessage.hidden = true;
            isConfirmingPayment = false;

            takeDraft(); // pago: o rascunho não serve mais
            renderSuccess(order);
            Sonora.cart.clear();
        } catch (error) {
            statusMessage.hidden = true;
            isConfirmingPayment = false;

            syncWithCart();
            restoreDraft();
            forms.setMessage(form, error.message);
        }
    }

    // Botão "voltar" do navegador na página do Stripe: a página pode
    // voltar da memória (bfcache) com o botão ainda "ABRINDO O STRIPE…".
    window.addEventListener("pageshow", event => {
        if (!event.persisted || !isSubmitting) return;

        isSubmitting = false;
        forms.setBusy(submitButton, false);
        renderSubmitLabel();
    });


    /* =========================
       11. EVENTOS
    ========================= */

    forms.bindMasks(form);
    form.addEventListener("input", handleLiveValidation);
    form.addEventListener("focusout", handleBlur);
    form.addEventListener("submit", handleSubmit);

    form.elements.cep.addEventListener("input", handleCepInput);

    form.addEventListener("change", event => {
        if (event.target.name === "payment") renderSummary();
    });

    // A sacola pode mudar em outra aba.
    window.addEventListener(Sonora.cart.CHANGE_EVENT, syncWithCart);

    // Item esgotado: dá para tirar da sacola direto no resumo.
    summary.items.addEventListener("click", event => {
        const button = event.target.closest("[data-remove-item]");
        if (!button) return;

        Sonora.cart.remove(button.dataset.removeItem);
        forms.setMessage(form, "");
    });

    // Troca de idioma: refaz os textos montados por este arquivo.
    window.addEventListener(Sonora.i18n.CHANGE_EVENT, () => {
        if (confirmedOrder) fillSuccess(confirmedOrder);
        if (!views.checkout.hidden) renderSummary();
        if (Sonora.auth.user !== undefined && !accountNote.hidden) renderAccountNote(Sonora.auth.user);
    });


    /* =========================
       12. INICIALIZAÇÃO
    ========================= */

    form.elements.state.insertAdjacentHTML(
        "beforeend",
        STATES.map(uf => `<option value="${uf}">${uf}</option>`).join("")
    );

    // Tira o ?session_id / ?payment da barra de endereço (recarregar
    // a página não deve repetir a confirmação).
    if (returningSessionId || paymentCancelled) {
        history.replaceState(null, "", window.location.pathname);
    }

    // O resumo usa nome, foto e preço do catálogo (vindo da API).
    Sonora.catalog.ready.then(isLoaded => {
        if (returningSessionId) {
            confirmPayment(returningSessionId);
            return;
        }

        syncWithCart();

        if (!isLoaded) {
            forms.setMessage(form, t("catalog.error"));
        } else if (paymentCancelled) {
            restoreDraft();
            forms.setMessage(form, t("checkout.paymentCancelled"), "info");
        }
    });

    Sonora.auth.load().then(user => {
        renderAccountNote(user);
        prefillFromUser(user);
    });
})(window.Sonora);
