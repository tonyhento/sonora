/* =========================
   SONORA — REVELAR AO ROLAR

   Elementos com o atributo  data-reveal  surgem suavemente
   quando entram na tela. Para conteúdo criado depois (ex.:
   cards renderizados pelo JS), chame  Sonora.reveal.scan().

   - Sem JavaScript, nada fica escondido (a classe que ativa
     o efeito só é aplicada aqui).
   - Com "reduzir movimento" ativo no sistema, tudo aparece
     direto, sem animação.
========================= */

(function (Sonora) {
    "use strict";

    const READY_CLASS = "reveal-ready";
    const VISIBLE_CLASS = "is-visible";
    const STAGGER_MS = 90;
    const MAX_STAGGER_STEPS = 3;

    const prefersReducedMotion =
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const supportsObserver = "IntersectionObserver" in window;

    function show(element) {
        element.classList.add(VISIBLE_CLASS);
    }

    const observer = supportsObserver
        ? new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;

                show(entry.target);
                observer.unobserve(entry.target);
            });
        }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 })
        : null;

    function isInViewport(element) {
        const rect = element.getBoundingClientRect();
        return rect.top < window.innerHeight && rect.bottom > 0;
    }

    /* Procura novos elementos  data-reveal  dentro de "root". */
    function scan(root = document) {
        const elements = root.querySelectorAll(`[data-reveal]:not(.${VISIBLE_CLASS})`);

        elements.forEach((element, index) => {
            // Itens lado a lado entram em sequência (efeito cascata).
            const step = index % MAX_STAGGER_STEPS;
            element.style.setProperty("--reveal-delay", `${step * STAGGER_MS}ms`);

            // O que já está na tela aparece sem esperar o scroll.
            if (!observer || prefersReducedMotion || isInViewport(element)) {
                show(element);
                return;
            }

            observer.observe(element);
        });
    }

    document.documentElement.classList.add(READY_CLASS);
    scan();

    Sonora.reveal = { scan };
})(window.Sonora = window.Sonora || {});
