/* =========================
   SONORA — NOVA SENHA (redefinir-senha.html)

   Sem ?token na URL: pede o link por e-mail.
   Com ?token=...: cria a nova senha com o código do link.

   O código sai da barra de endereço assim que a página abre,
   para não ficar no histórico do navegador.
========================= */

(function (Sonora) {
    "use strict";

    const { forms, api, auth } = Sonora;
    const { t } = Sonora.i18n;

    const views = {
        request: document.querySelector("#request-view"),
        reset: document.querySelector("#reset-view"),
        done: document.querySelector("#done-view")
    };

    const requestForm = document.querySelector("#request-form");
    const resetForm = document.querySelector("#reset-form");

    const token = new URLSearchParams(window.location.search).get("token");

    let sentToEmail = null;

    function showView(name) {
        Object.entries(views).forEach(([key, element]) => {
            element.hidden = key !== name;
        });
    }

    // Mesmas regras do cadastro (login.js) e do servidor (schemas.js).
    function checkEmail(value) {
        if (!value.trim()) return t("validation.email");
        return Sonora.ui.EMAIL_PATTERN.test(value.trim()) ? "" : t("validation.emailInvalid");
    }

    function checkPassword(value) {
        if (value.length < 8) return t("validation.passwordLength");
        return /[A-Za-z]/.test(value) && /\d/.test(value) ? "" : t("validation.passwordMix");
    }

    function renderSentMessage() {
        if (sentToEmail) {
            forms.setMessage(requestForm, t("reset.requestSent", { email: sentToEmail }), "success");
        }
    }


    /* ---------- 1. Pedir o link ---------- */

    requestForm.addEventListener("submit", async event => {
        event.preventDefault();

        const { email } = requestForm.elements;
        const button = requestForm.querySelector("[type='submit']");
        const message = checkEmail(email.value);

        forms.setFieldError(email, message);
        forms.setMessage(requestForm, "");
        if (message) return email.focus();

        forms.setBusy(button, true, t("reset.sending"));

        try {
            await api.post("/api/auth/forgot-password", { email: email.value.trim() });

            // A resposta é a mesma exista ou não a conta (o servidor não revela).
            sentToEmail = email.value.trim();
            renderSentMessage();
        } catch (error) {
            forms.showErrors(requestForm, error.fields);
            forms.setMessage(requestForm, error.message);
        } finally {
            forms.setBusy(button, false);
        }
    });


    /* ---------- 2. Nova senha ---------- */

    resetForm.addEventListener("submit", async event => {
        event.preventDefault();

        const { password } = resetForm.elements;
        const button = resetForm.querySelector("[type='submit']");
        const message = checkPassword(password.value);

        forms.setFieldError(password, message);
        forms.setMessage(resetForm, "");
        if (message) return password.focus();

        forms.setBusy(button, true);

        try {
            await api.post("/api/auth/reset-password", { token, password: password.value });

            // O servidor encerrou todas as sessões desta conta: se este
            // navegador estava logado, a sacola da conta sai daqui também.
            if (auth.user) {
                Sonora.sync?.afterLogout();
                auth.setUser(null);
            }

            showView("done");
            views.done.focus();
        } catch (error) {
            const firstInvalid = forms.showErrors(resetForm, error.fields, { token: "password" });

            forms.setMessage(resetForm, error.message);
            (firstInvalid || password).focus();
            forms.setBusy(button, false);
        }
    });


    /* ---------- Inicialização ---------- */

    forms.bindLiveClear(requestForm);
    forms.bindLiveClear(resetForm);
    forms.bindPasswordToggles();

    // Troca de idioma: a mensagem de "link enviado" volta no novo idioma.
    window.addEventListener(Sonora.i18n.CHANGE_EVENT, renderSentMessage);

    if (token) {
        history.replaceState(null, "", window.location.pathname);
        showView("reset");
    } else {
        showView("request");
    }
})(window.Sonora);
