/* =========================
   SONORA — LOGIN E CADASTRO

   Duas abas (Entrar / Criar conta) acessíveis por teclado.
   Valida no navegador para responder rápido e mostra os
   erros que o servidor devolver em cada campo.
   Depois de entrar, volta para a página de origem (?next=).
========================= */

(function (Sonora) {
    "use strict";

    const { forms, auth } = Sonora;

    const tabs = {
        login: document.querySelector("#tab-login"),
        register: document.querySelector("#tab-register")
    };

    const panels = {
        login: document.querySelector("#panel-login"),
        register: document.querySelector("#panel-register")
    };

    const loginForm = document.querySelector("#login-form");
    const registerForm = document.querySelector("#register-form");

    const REGISTER_HASH = "#criar-conta";


    /* =========================
       01. ABAS
    ========================= */

    function selectTab(name, { focus = false } = {}) {
        Object.keys(tabs).forEach(key => {
            const isActive = key === name;

            tabs[key].setAttribute("aria-selected", String(isActive));
            tabs[key].tabIndex = isActive ? 0 : -1;
            panels[key].hidden = !isActive;
        });

        if (focus) tabs[name].focus();

        // Mantém a aba no endereço (dá para compartilhar o link de cadastro).
        history.replaceState(null, "", name === "register" ? REGISTER_HASH : window.location.pathname + window.location.search);
    }

    Object.entries(tabs).forEach(([name, tab]) => {
        tab.addEventListener("click", () => selectTab(name));

        // Setas alternam entre as abas (padrão de acessibilidade).
        tab.addEventListener("keydown", event => {
            if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;

            event.preventDefault();
            selectTab(name === "login" ? "register" : "login", { focus: true });
        });
    });

    document.querySelectorAll("[data-switch-tab]").forEach(button => {
        button.addEventListener("click", () => {
            const name = button.dataset.switchTab;

            selectTab(name);
            (name === "login" ? loginForm : registerForm).elements[0].focus();
        });
    });


    /* =========================
       02. VALIDAÇÃO NO NAVEGADOR
    ========================= */

    const { t } = Sonora.i18n;

    const checks = {
        name: value => {
            if (!value.trim()) return t("validation.name");
            return value.trim().split(/\s+/).length >= 2 ? "" : t("validation.fullName");
        },
        email: value => {
            if (!value.trim()) return t("validation.email");
            return Sonora.ui.EMAIL_PATTERN.test(value.trim()) ? "" : t("validation.emailInvalid");
        },
        loginPassword: value => (value ? "" : t("validation.password")),
        newPassword: value => {
            if (value.length < 8) return t("validation.passwordLength");
            return /[A-Za-z]/.test(value) && /\d/.test(value) ? "" : t("validation.passwordMix");
        }
    };

    /* Recebe [[input, regra], ...] e retorna o primeiro inválido. */
    function validate(pairs) {
        let firstInvalid = null;

        pairs.forEach(([input, check]) => {
            const message = check(input.value);
            forms.setFieldError(input, message);
            if (message && !firstInvalid) firstInvalid = input;
        });

        return firstInvalid;
    }


    /* =========================
       03. ENVIO DOS FORMULÁRIOS
    ========================= */

    function goToNextPage() {
        window.location.assign(auth.getSafeNext());
    }

    async function submit(form, request) {
        const button = form.querySelector("[type='submit']");

        forms.setBusy(button, true);
        forms.setMessage(form, "");

        try {
            await request();
            goToNextPage();
        } catch (error) {
            const firstInvalid = forms.showErrors(form, error.fields);

            forms.setMessage(form, error.message);
            forms.setBusy(button, false);
            (firstInvalid || form.elements[0]).focus();
        }
    }

    loginForm.addEventListener("submit", event => {
        event.preventDefault();

        const { email, password } = loginForm.elements;
        const invalid = validate([[email, checks.email], [password, checks.loginPassword]]);

        if (invalid) return invalid.focus();

        submit(loginForm, () => auth.login({
            email: email.value.trim(),
            password: password.value
        }));
    });

    registerForm.addEventListener("submit", event => {
        event.preventDefault();

        const { name, email, password } = registerForm.elements;
        const invalid = validate([
            [name, checks.name],
            [email, checks.email],
            [password, checks.newPassword]
        ]);

        if (invalid) return invalid.focus();

        submit(registerForm, () => auth.register({
            name: name.value.trim(),
            email: email.value.trim(),
            password: password.value
        }));
    });

    forms.bindLiveClear(loginForm);
    forms.bindLiveClear(registerForm);
    forms.bindPasswordToggles();


    /* =========================
       04. INICIALIZAÇÃO
    ========================= */

    selectTab(window.location.hash === REGISTER_HASH ? "register" : "login");

    const params = new URLSearchParams(window.location.search);

    // Veio da página de nova senha (redefinir-senha.html).
    if (params.get("reset") === "ok") {
        forms.setMessage(loginForm, Sonora.i18n.t("login.resetDone"), "success");
    }

    // Acabou de excluir a conta (conta.html).
    if (params.get("deleted") === "1") {
        forms.setMessage(loginForm, Sonora.i18n.t("login.accountDeleted"), "success");
    }

    // Quem já está logado não precisa desta página.
    auth.load().then(user => {
        if (user) window.location.replace(auth.getSafeNext());
    });
})(window.Sonora);
