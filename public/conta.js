/* =========================
   SONORA — PERFIL (conta.html)

   Edita nome e celular, troca a senha e exclui a conta.
========================= */

(function (Sonora) {
    "use strict";

    const { forms, api, auth } = Sonora;

    const profileForm = document.querySelector("#profile-form");
    const passwordForm = document.querySelector("#password-form");
    const deleteForm = document.querySelector("#delete-form");
    const emailInput = document.querySelector("#profile-email");


    /* =========================
       01. PREENCHER O FORMULÁRIO
    ========================= */

    function fillProfile(user) {
        profileForm.elements.name.value = user.name;
        profileForm.elements.phone.value = user.phone ? forms.masks.phone(user.phone) : "";
        emailInput.value = user.email;
    }


    /* =========================
       02. VALIDAÇÃO NO NAVEGADOR
    ========================= */

    function validateProfile() {
        const { name, phone } = profileForm.elements;
        const words = name.value.trim().split(/\s+/).filter(Boolean);
        const phoneDigits = forms.onlyDigits(phone.value);

        forms.setFieldError(name, words.length >= 2 ? "" : Sonora.i18n.t("validation.fullName"));
        forms.setFieldError(
            phone,
            !phoneDigits || phoneDigits.length >= 10 ? "" : Sonora.i18n.t("validation.phoneShort")
        );

        return profileForm.querySelector("[aria-invalid='true']");
    }

    function validatePassword() {
        const { currentPassword, newPassword } = passwordForm.elements;
        const value = newPassword.value;

        let newMessage = "";
        if (value.length < 8) newMessage = Sonora.i18n.t("validation.passwordLength");
        else if (!/[A-Za-z]/.test(value) || !/\d/.test(value)) newMessage = Sonora.i18n.t("validation.passwordMix");

        forms.setFieldError(currentPassword, currentPassword.value ? "" : Sonora.i18n.t("validation.currentPassword"));
        forms.setFieldError(newPassword, newMessage);

        return passwordForm.querySelector("[aria-invalid='true']");
    }


    /* =========================
       03. ENVIO
    ========================= */

    /* "successKey": chave do texto de sucesso no dicionário (i18n.js). */
    async function submit(form, validator, request, successKey) {
        const button = form.querySelector("[type='submit']");

        forms.setMessage(form, "");

        const invalid = validator();
        if (invalid) return invalid.focus();

        forms.setBusy(button, true, Sonora.i18n.t("account.saving"));

        try {
            await request();
            forms.setMessage(form, Sonora.i18n.t(successKey), "success");
        } catch (error) {
            const firstInvalid = forms.showErrors(form, error.fields);

            forms.setMessage(form, error.message);
            if (firstInvalid) firstInvalid.focus();
        } finally {
            forms.setBusy(button, false);
        }
    }

    profileForm.addEventListener("submit", event => {
        event.preventDefault();

        submit(profileForm, validateProfile, async () => {
            const { user } = await api.patch("/api/users/me", {
                name: profileForm.elements.name.value.trim(),
                phone: profileForm.elements.phone.value
            });

            auth.setUser(user);
            fillProfile(user);
        }, "account.saved");
    });

    passwordForm.addEventListener("submit", event => {
        event.preventDefault();

        submit(passwordForm, validatePassword, async () => {
            await api.patch("/api/users/me/password", {
                currentPassword: passwordForm.elements.currentPassword.value,
                newPassword: passwordForm.elements.newPassword.value
            });

            passwordForm.reset();
        }, "account.passwordChanged");
    });

    /*
       Excluir a conta: senha + caixa de confirmação. Depois de excluída,
       a sacola e os favoritos saem do navegador e a pessoa vai para o
       login com um aviso.
    */
    function validateDelete() {
        const { password, confirm } = deleteForm.elements;

        forms.setFieldError(password, password.value ? "" : Sonora.i18n.t("validation.currentPassword"));
        forms.setFieldError(confirm, confirm.checked ? "" : Sonora.i18n.t("account.deleteConfirmRequired"));

        return deleteForm.querySelector("[aria-invalid='true']");
    }

    deleteForm.addEventListener("submit", async event => {
        event.preventDefault();

        const button = deleteForm.querySelector("[type='submit']");

        forms.setMessage(deleteForm, "");

        const invalid = validateDelete();
        if (invalid) return invalid.focus();

        forms.setBusy(button, true, Sonora.i18n.t("account.deleting"));

        try {
            await api.delete("/api/users/me", { password: deleteForm.elements.password.value });
        } catch (error) {
            const firstInvalid = forms.showErrors(deleteForm, error.fields);

            forms.setMessage(deleteForm, error.message);
            (firstInvalid || button).focus();
            forms.setBusy(button, false);
            return;
        }

        // A conta não existe mais: nada fica guardado neste navegador.
        Sonora.sync?.afterLogout();
        auth.setUser(null);
        window.location.replace("login.html?deleted=1");
    });

    forms.bindMasks(profileForm);
    forms.bindLiveClear(profileForm);
    forms.bindLiveClear(passwordForm);
    forms.bindLiveClear(deleteForm);


    /* =========================
       04. INICIALIZAÇÃO
    ========================= */

    Sonora.account.ready.then(fillProfile);
})(window.Sonora);
