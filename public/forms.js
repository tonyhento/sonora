/* =========================
   SONORA — UTILITÁRIOS DE FORMULÁRIO

   Usados nas páginas de login, conta e checkout:
   mostrar/limpar erros por campo, estado "carregando" do
   botão, mensagens gerais e máscaras de celular e CEP.

   Convenção do HTML de cada campo:
     <div class="field">
       <input id="email" name="email" aria-describedby="email-error">
       <p class="field-error" id="email-error"></p>
     </div>
========================= */

(function (Sonora) {
    "use strict";

    const onlyDigits = value => value.replace(/\D/g, "");

    const masks = {
        phone(value) {
            const digits = onlyDigits(value).slice(0, 11);

            if (digits.length <= 2) return digits.replace(/^(\d{1,2})/, "($1");
            if (digits.length <= 6) return digits.replace(/^(\d{2})(\d+)/, "($1) $2");
            if (digits.length <= 10) return digits.replace(/^(\d{2})(\d{4})(\d+)/, "($1) $2-$3");

            return digits.replace(/^(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
        },

        cep(value) {
            const digits = onlyDigits(value).slice(0, 8);
            return digits.length > 5 ? digits.replace(/^(\d{5})(\d+)/, "$1-$2") : digits;
        }
    };

    /* Aplica as máscaras em inputs com data-mask="phone" ou "cep". */
    function bindMasks(form) {
        form.addEventListener("input", event => {
            const mask = masks[event.target.dataset.mask];
            if (mask) event.target.value = mask(event.target.value);
        });
    }

    function setFieldError(input, message) {
        if (!input) return;

        const errorElement = document.getElementById(`${input.id}-error`);
        const field = input.closest(".field");

        input.setAttribute("aria-invalid", String(Boolean(message)));
        if (field) field.classList.toggle("has-error", Boolean(message));
        if (errorElement) errorElement.textContent = message || "";
    }

    function clearErrors(form) {
        form.querySelectorAll("[aria-invalid='true']").forEach(input => setFieldError(input, ""));
        setMessage(form, "");
    }

    /*
       Mostra os erros vindos da API. "fieldMap" traduz o nome do
       campo na API para o name do input (ex.: "address.cep" → "cep").
       Retorna o primeiro input com erro, para receber o foco.
    */
    function showErrors(form, fields = {}, fieldMap = {}) {
        let firstInvalid = null;

        Object.entries(fields).forEach(([apiName, message]) => {
            const inputName = fieldMap[apiName] || apiName;
            const input = form.elements[inputName];

            if (input && input.id) {
                setFieldError(input, message);
                firstInvalid = firstInvalid || input;
            }
        });

        return firstInvalid;
    }

    /* Mensagem geral do formulário (sucesso ou erro). */
    function setMessage(form, text, type = "error") {
        const box = form.querySelector("[data-form-message]");
        if (!box) return;

        box.textContent = text;
        box.dataset.type = type;
        box.hidden = !text;
    }

    function setBusy(button, isBusy, busyText = Sonora.i18n.t("busy")) {
        const label = button.querySelector("[data-label]") || button;

        if (isBusy) {
            button.dataset.originalLabel = label.textContent;
            label.textContent = busyText;
        } else if (button.dataset.originalLabel) {
            label.textContent = button.dataset.originalLabel;
        }

        button.disabled = isBusy;
        button.setAttribute("aria-busy", String(isBusy));
    }

    /* Limpa o erro do campo assim que a pessoa volta a digitar. */
    function bindLiveClear(form) {
        form.addEventListener("input", event => {
            if (event.target.getAttribute("aria-invalid") === "true") {
                setFieldError(event.target, "");
            }
        });
    }

    /* Botões "MOSTRAR/OCULTAR" ligados a um input pelo atributo data-password-toggle. */
    function renderPasswordToggle(button) {
        const { t } = Sonora.i18n;
        const input = document.getElementById(button.dataset.passwordToggle);
        const isVisible = input.type === "text";

        button.textContent = t(isVisible ? "password.hide" : "password.show");
        button.setAttribute("aria-pressed", String(isVisible));
        button.setAttribute("aria-label", t(isVisible ? "password.hideLabel" : "password.showLabel"));
    }

    function bindPasswordToggles(root = document) {
        root.querySelectorAll("[data-password-toggle]").forEach(button => {
            const input = document.getElementById(button.dataset.passwordToggle);

            renderPasswordToggle(button);

            button.addEventListener("click", () => {
                input.type = input.type === "text" ? "password" : "text";
                renderPasswordToggle(button);
            });
        });
    }

    // Troca de idioma: atualiza os botões de senha e apaga os erros
    // mostrados (eles estavam no idioma anterior).
    window.addEventListener(Sonora.i18n.CHANGE_EVENT, () => {
        document.querySelectorAll("[data-password-toggle]").forEach(renderPasswordToggle);
        document.querySelectorAll("form").forEach(form => {
            if (form.querySelector("[data-form-message]") || form.querySelector(".field-error")) {
                clearErrors(form);
            }
        });
    });

    Sonora.forms = {
        bindPasswordToggles,
        masks,
        onlyDigits,
        bindMasks,
        bindLiveClear,
        setFieldError,
        clearErrors,
        showErrors,
        setMessage,
        setBusy
    };
})(window.Sonora);
