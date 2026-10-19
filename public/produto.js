/* =========================
   SONORA — PÁGINA DE PRODUTO

   Lê o ?id= da URL, busca o modelo no catálogo
   (products.js, vindo da API) e preenche a página: galeria em carrossel,
   quantidade, sacola, favorito e "Outros modelos".
========================= */

(function (Sonora) {
    "use strict";

    /* =========================
       01. CONFIGURAÇÃO
    ========================= */

    const MIN_QUANTITY = 1;
    const MAX_QUANTITY = 10;
    // Arraste mínimo (fração da largura) para trocar de imagem.
    const SWIPE_THRESHOLD = 0.15;
    // Arraste rápido também troca, mesmo que curto (px/ms).
    const SWIPE_VELOCITY = 0.5;
    // Resistência ao arrastar além da primeira/última imagem.
    const EDGE_RESISTANCE = 0.35;
    const FEEDBACK_MS = 1500;
    const COLLECTION_YEAR = 2026;


    /*
       Tudo abaixo depende do catálogo, que vem da API:
       a página só é montada depois que ele chega.
    */
    function startProductPage() {
        /* =========================
           02. PRODUTO ATUAL
        ========================= */

        const { t } = Sonora.i18n;
        const productId = new URLSearchParams(window.location.search).get("id");

        // "let": ao trocar o idioma, o produto é lido de novo já traduzido.
        let product = Sonora.findProduct(productId);

        // ID inválido ou ausente: volta para o catálogo.
        if (!product) {
            window.location.replace("index.html#products");
            return;
        }

        const objectNumber = String(product.id).padStart(3, "0");


        /* =========================
           03. ELEMENTOS DA PÁGINA
        ========================= */

        const elements = {
            breadcrumb: document.querySelector("#breadcrumb-current"),

            carousel: document.querySelector("#product-carousel"),
            track: document.querySelector("#carousel-track"),
            prevButton: document.querySelector("#carousel-prev"),
            nextButton: document.querySelector("#carousel-next"),
            imageLabel: document.querySelector("#image-label"),
            imageCounter: document.querySelector("#image-counter"),
            thumbnailList: document.querySelector("#thumbnail-list"),

            eyebrow: document.querySelector("#product-eyebrow"),
            code: document.querySelector("#product-code"),
            subtitle: document.querySelector("#product-subtitle"),
            price: document.querySelector("#detail-price"),
            stockNote: document.querySelector("#stock-note"),
            description: document.querySelector("#product-description"),

            quantityValue: document.querySelector("#quantity-value"),
            quantityMinus: document.querySelector("#quantity-minus"),
            quantityPlus: document.querySelector("#quantity-plus"),

            addButton: document.querySelector("#detail-add-button"),
            addButtonLabel: document.querySelector(".detail-add-label"),
            favoriteButton: document.querySelector("#detail-favorite"),
            purchaseActions: document.querySelector(".purchase-actions"),
            purchaseNote: document.querySelector("#purchase-note"),

            relatedGrid: document.querySelector("#related-grid"),

            concept: document.querySelector("#product-concept"),
            specs: document.querySelector("#product-specs"),
            materials: document.querySelector("#product-materials"),

            storyEyebrow: document.querySelector("#story-eyebrow"),
            storyTitle: document.querySelector("#story-title"),
            storyText: document.querySelector("#story-text"),
            storySignature: document.querySelector("#story-signature")
        };


        /* =========================
           04. ESTADO
        ========================= */

        const state = {
            imageIndex: 0,
            quantity: MIN_QUANTITY
        };

        let feedbackTimer = null;
        let isShowingFeedback = false;

        // Quantas unidades ainda dá para pôr na sacola (estoque e limite por compra).
        let maxQuantity = MAX_QUANTITY;
        let drag = null;


        /* =========================
           05. CONTEÚDO DO PRODUTO
        ========================= */

        function renderMeta() {
            document.title = `${product.name} — Beyond Vision`;

            const metaDescription = document.querySelector('meta[name="description"]');

            if (metaDescription) {
                metaDescription.content =
                    t("product.metaDescription", { name: product.name, tagline: product.tagline });
            }
        }

        function renderInfo() {
            elements.breadcrumb.textContent = product.name;

            elements.eyebrow.textContent = `${product.series} / ${objectNumber}`;
            elements.code.textContent = product.code;
            elements.subtitle.textContent = product.subtitle;
            elements.price.textContent = Sonora.formatPrice(product.price);
            elements.description.textContent = product.description;

            elements.concept.textContent = product.concept;
            elements.materials.textContent = product.materials;

            // Textos opcionais (produto novo do painel): sem conteúdo, a seção some.
            elements.concept.closest("details").hidden = !product.concept;
            elements.materials.closest("details").hidden = !product.materials;
        }

        function renderSpecs() {
            const fragment = document.createDocumentFragment();

            product.specs.forEach(([label, value]) => {
                const term = document.createElement("dt");
                const detail = document.createElement("dd");

                term.textContent = label;
                detail.textContent = value;

                fragment.append(term, detail);
            });

            elements.specs.replaceChildren(fragment);
            elements.specs.closest("details").hidden = product.specs.length === 0;
        }

        function renderStory() {
            const [firstLine, highlight] = product.story.title;
            const highlightSpan = document.createElement("span");

            highlightSpan.textContent = highlight;

            elements.storyEyebrow.textContent = product.story.eyebrow;
            elements.storyTitle.replaceChildren(`${firstLine} `, highlightSpan);
            elements.storyText.textContent = product.story.text;
            elements.storySignature.textContent = `SONORA® / OBJECT ${objectNumber}`;

            // Sem título nem texto, não há história para contar.
            elements.storyTitle.closest(".product-story").hidden =
                !firstLine && !highlight && !product.story.text;
        }


        /* =========================
           06. CARROSSEL DE IMAGENS
        ========================= */

        const lastIndex = product.gallery.length - 1;
        const hasMultipleImages = lastIndex > 0;

        function formatIndex(value) {
            return String(value).padStart(2, "0");
        }

        function clampIndex(index) {
            return Math.min(Math.max(index, 0), lastIndex);
        }

        function createSlide(image, index) {
            const slide = document.createElement("div");
            const img = document.createElement("img");

            slide.className = "carousel-slide";
            slide.setAttribute("role", "group");
            slide.setAttribute("aria-roledescription", "slide");
            img.src = image.src;
            img.draggable = false;
            img.decoding = "async";

            slide.append(img);
            labelSlide(slide, index);

            return slide;
        }

        /* Textos acessíveis da galeria (refeitos ao trocar o idioma). */
        function labelSlide(slide, index) {
            const total = product.gallery.length;

            slide.setAttribute("aria-label", t("product.slide", { index: index + 1, total }));
            slide.querySelector("img").alt = product.gallery[index].alt;
        }

        function labelThumbnail(button, index) {
            button.setAttribute(
                "aria-label",
                t("product.viewImage", { index: index + 1, total: product.gallery.length })
            );
        }

        function labelGallery() {
            Array.from(elements.track.children).forEach(labelSlide);
            elements.thumbnailList.querySelectorAll(".thumbnail").forEach(labelThumbnail);
        }

        function createThumbnail(image, index) {
            const button = document.createElement("button");
            const img = document.createElement("img");

            button.type = "button";
            button.className = "thumbnail";
            button.dataset.index = index;
            labelThumbnail(button, index);

            img.src = image.src;
            img.alt = "";
            img.loading = "lazy";

            button.append(img);

            return button;
        }

        function renderGallery() {
            const { gallery } = product;

            elements.imageLabel.textContent = `OBJECT ${objectNumber} — ${COLLECTION_YEAR}`;
            elements.track.replaceChildren(...gallery.map(createSlide));

            // Com uma única imagem não há o que navegar.
            if (!hasMultipleImages) {
                elements.thumbnailList.hidden = true;
                elements.imageCounter.hidden = true;
                elements.prevButton.hidden = true;
                elements.nextButton.hidden = true;
                goTo(0);
                return;
            }

            const columns = Math.min(Math.max(gallery.length, 3), 4);

            elements.thumbnailList.style.setProperty("--thumbnail-columns", columns);
            elements.thumbnailList.replaceChildren(...gallery.map(createThumbnail));

            elements.carousel.classList.add("is-interactive");
            elements.carousel.tabIndex = 0;

            goTo(0);
        }

        // Move a trilha para a imagem atual, somando o deslocamento do arraste.
        function setTrackOffset(offsetPx = 0) {
            elements.track.style.transform =
                `translateX(calc(${-state.imageIndex * 100}% + ${offsetPx}px))`;
        }

        function goTo(index) {
            state.imageIndex = clampIndex(index);
            setTrackOffset(0);

            elements.imageCounter.textContent =
                `${formatIndex(state.imageIndex + 1)} / ${formatIndex(product.gallery.length)}`;

            elements.prevButton.disabled = state.imageIndex === 0;
            elements.nextButton.disabled = state.imageIndex === lastIndex;

            Array.from(elements.track.children).forEach((slide, slideIndex) => {
                slide.setAttribute("aria-hidden", String(slideIndex !== state.imageIndex));
            });

            elements.thumbnailList.querySelectorAll(".thumbnail").forEach(thumbnail => {
                const isActive = Number(thumbnail.dataset.index) === state.imageIndex;

                thumbnail.classList.toggle("active", isActive);
                thumbnail.setAttribute("aria-pressed", String(isActive));
            });
        }


        /* ---------- Arrastar (mouse e toque) ---------- */

        function handlePointerDown(event) {
            if (!hasMultipleImages) return;
            if (event.pointerType === "mouse" && event.button !== 0) return;
            if (event.target.closest(".carousel-arrow")) return;

            drag = {
                pointerId: event.pointerId,
                startX: event.clientX,
                startTime: performance.now(),
                deltaX: 0
            };

            elements.carousel.setPointerCapture(event.pointerId);
            elements.carousel.classList.add("is-dragging");
        }

        function handlePointerMove(event) {
            if (!drag || event.pointerId !== drag.pointerId) return;

            let deltaX = event.clientX - drag.startX;

            const pullingPastStart = state.imageIndex === 0 && deltaX > 0;
            const pullingPastEnd = state.imageIndex === lastIndex && deltaX < 0;

            if (pullingPastStart || pullingPastEnd) {
                deltaX *= EDGE_RESISTANCE;
            }

            drag.deltaX = deltaX;
            setTrackOffset(deltaX);
        }

        function handlePointerUp(event) {
            if (!drag || event.pointerId !== drag.pointerId) return;

            const distance = Math.abs(drag.deltaX);
            const elapsed = Math.max(performance.now() - drag.startTime, 1);

            const passedThreshold = distance > elements.carousel.clientWidth * SWIPE_THRESHOLD;
            const isQuickSwipe = distance > 20 && distance / elapsed > SWIPE_VELOCITY;

            let nextIndex = state.imageIndex;

            if (passedThreshold || isQuickSwipe) {
                nextIndex += drag.deltaX < 0 ? 1 : -1;
            }

            endDrag();
            goTo(nextIndex);
        }

        // O navegador cancela o gesto (ex.: rolagem vertical no celular).
        function handlePointerCancel() {
            if (!drag) return;

            endDrag();
            goTo(state.imageIndex);
        }

        function endDrag() {
            drag = null;
            elements.carousel.classList.remove("is-dragging");
        }


        /* ---------- Miniaturas e teclado ---------- */

        function handleThumbnailClick(event) {
            const thumbnail = event.target.closest(".thumbnail");

            if (!thumbnail) return;

            goTo(Number(thumbnail.dataset.index));
        }

        function getArrowStep(event) {
            return { ArrowLeft: -1, ArrowRight: 1 }[event.key] || 0;
        }

        function handleCarouselKeydown(event) {
            const step = getArrowStep(event);

            if (!step || !hasMultipleImages) return;

            event.preventDefault();
            goTo(state.imageIndex + step);
        }

        function handleThumbnailKeydown(event) {
            const step = getArrowStep(event);

            if (!step) return;

            event.preventDefault();
            goTo(state.imageIndex + step);
            elements.thumbnailList.children[state.imageIndex].focus();
        }


        /* =========================
           07. CONTROLE DE QUANTIDADE
        ========================= */

        function setQuantity(value) {
            state.quantity = Math.min(Math.max(value, MIN_QUANTITY), maxQuantity);

            const canBuy = Sonora.cart.available(product.id) > 0;

            elements.quantityValue.textContent = state.quantity;
            elements.quantityMinus.disabled = !canBuy || state.quantity === MIN_QUANTITY;
            elements.quantityPlus.disabled = !canBuy || state.quantity >= maxQuantity;
        }


        /* =========================
           07b. ESTOQUE
           Esgotado: botão desligado. Poucas unidades: aviso.
           Tudo o que existe já está na sacola: não deixa pôr mais.
        ========================= */

        function renderStock() {
            const soldOut = Sonora.stock.isSoldOut(product);
            const available = Sonora.cart.available(product.id);

            if (soldOut) {
                elements.stockNote.textContent = t("stock.soldOutLong");
            } else if (Sonora.stock.isLow(product)) {
                elements.stockNote.textContent = product.stock === 1
                    ? t("stock.remainingOne")
                    : t("stock.remaining", { count: product.stock });
            }

            elements.stockNote.hidden = !soldOut && !Sonora.stock.isLow(product);
            elements.stockNote.classList.toggle("is-out", soldOut);

            elements.addButton.disabled = soldOut || available === 0;

            if (!isShowingFeedback || elements.addButton.disabled) {
                elements.addButtonLabel.textContent = soldOut
                    ? t("product.soldOut")
                    : available === 0 ? t("product.allInBag") : t("product.addToBag");
            }

            maxQuantity = Math.max(MIN_QUANTITY, Math.min(MAX_QUANTITY, available));
            setQuantity(state.quantity);
        }


        /* =========================
           08. ADICIONAR À SACOLA
        ========================= */

        function handleAddToCart() {
            // Nunca mais do que o estoque ainda permite.
            const quantity = Math.min(state.quantity, Sonora.cart.available(product.id));
            if (quantity < 1) return;

            isShowingFeedback = true;
            const saved = Sonora.cart.add(product.id, quantity);

            if (!saved) {
                isShowingFeedback = false;
                elements.purchaseNote.textContent = t("product.saveError");
                return;
            }

            elements.purchaseNote.textContent = quantity === 1
                ? t("product.addedOne", { name: product.name })
                : t("product.addedMany", { count: quantity, name: product.name });

            elements.addButtonLabel.textContent = t("product.added");

            clearTimeout(feedbackTimer);
            feedbackTimer = setTimeout(() => {
                isShowingFeedback = false;
                renderAddButton();
            }, FEEDBACK_MS);

            // Mostra a sacola para o cliente conferir ou finalizar.
            Sonora.cartUI.open();
            setQuantity(MIN_QUANTITY);
        }


        /* =========================
           09. FAVORITO E OUTROS MODELOS
        ========================= */

        function renderAddButton() {
            renderStock();
        }

        function renderFavoriteButton() {
            elements.favoriteButton.dataset.favoriteId = product.id;
            elements.favoriteButton.innerHTML = Sonora.ui.HEART_ICON;
            Sonora.ui.syncFavoriteButtons(elements.purchaseActions);
        }

        function renderRelated() {
            const others = Sonora.products.filter(item => item.id !== product.id);

            elements.relatedGrid.innerHTML = others.map(Sonora.ui.createProductCard).join("");
            Sonora.reveal.scan(elements.relatedGrid);
        }


        /* =========================
           10. EVENTOS
        ========================= */

        elements.carousel.addEventListener("pointerdown", handlePointerDown);
        elements.carousel.addEventListener("pointermove", handlePointerMove);
        elements.carousel.addEventListener("pointerup", handlePointerUp);
        elements.carousel.addEventListener("pointercancel", handlePointerCancel);
        elements.carousel.addEventListener("keydown", handleCarouselKeydown);

        elements.prevButton.addEventListener("click", () => goTo(state.imageIndex - 1));
        elements.nextButton.addEventListener("click", () => goTo(state.imageIndex + 1));

        elements.thumbnailList.addEventListener("click", handleThumbnailClick);
        elements.thumbnailList.addEventListener("keydown", handleThumbnailKeydown);

        elements.quantityMinus.addEventListener("click", () => setQuantity(state.quantity - 1));
        elements.quantityPlus.addEventListener("click", () => setQuantity(state.quantity + 1));

        elements.addButton.addEventListener("click", handleAddToCart);

        Sonora.ui.bindFavoriteButtons(elements.purchaseActions);
        Sonora.ui.bindFavoriteButtons(elements.relatedGrid);

        // A sacola mudou (aqui, no painel lateral ou em outra aba).
        window.addEventListener(Sonora.cart.CHANGE_EVENT, renderStock);

        // Catálogo buscado de novo (ex.: o estoque mudou durante a compra).
        window.addEventListener(Sonora.catalog.READY_EVENT, () => {
            product = Sonora.findProduct(productId) || product;
            renderStock();
        });

        // Troca de idioma: refaz os textos sem perder a imagem atual.
        window.addEventListener(Sonora.i18n.CHANGE_EVENT, () => {
            product = Sonora.findProduct(productId);
            clearTimeout(feedbackTimer);
            isShowingFeedback = false;

            renderMeta();
            renderInfo();
            renderSpecs();
            renderStory();
            labelGallery();
            renderAddButton();
            renderRelated();
        });


        /* =========================
           11. INICIALIZAÇÃO
        ========================= */

        renderMeta();
        renderInfo();
        renderSpecs();
        renderStory();
        renderGallery();
        renderAddButton();
        renderFavoriteButton();
        renderRelated();
        renderStock();
    }

    Sonora.catalog.ready.then(isLoaded => {
        if (isLoaded) {
            startProductPage();
            return;
        }

        // Sem catálogo não há o que mostrar: só a mensagem de erro.
        Sonora.catalog.renderError(document.querySelector(".product-detail"));
        document.querySelectorAll(".related, .product-story").forEach(section => {
            section.hidden = true;
        });
    });
})(window.Sonora);
