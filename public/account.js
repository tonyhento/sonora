/* =========================
   SONORA — BASE DAS PÁGINAS "MINHA CONTA"

   Comum a conta.html e pedidos.html:
   - exige login (visitante vai para o login e volta depois);
   - preenche o cabeçalho da página com o nome do usuário;
   - botão "Sair".

   As páginas usam  Sonora.account.ready  (Promise do usuário).
========================= */

(function (Sonora) {
    "use strict";

    const main = document.querySelector("#main");
    const firstNameElement = document.querySelector("#account-first-name");
    const sinceElement = document.querySelector("#account-since");
    const logoutButton = document.querySelector("[data-logout]");

    let currentUser = null;

    function renderHeading(user) {
        currentUser = user;

        const monthYear = new Intl.DateTimeFormat(Sonora.i18n.locale, { month: "long", year: "numeric" });

        if (firstNameElement) {
            firstNameElement.textContent = `${user.name.split(" ")[0]}.`;
        }

        // O acesso de verdade é conferido pelo servidor (/api/admin).
        document.querySelectorAll("[data-admin-link]").forEach(link => {
            link.hidden = !user.isAdmin;
        });

        if (sinceElement) {
            sinceElement.textContent = Sonora.i18n.t("account.since", {
                date: monthYear.format(new Date(user.createdAt))
            });
        }
    }

    async function handleLogout() {
        logoutButton.disabled = true;

        try {
            await Sonora.auth.logout();
        } finally {
            window.location.assign("index.html");
        }
    }

    const ready = Sonora.auth.requireUser().then(user => {
        renderHeading(user);
        main.setAttribute("aria-busy", "false");
        return user;
    });

    logoutButton.addEventListener("click", handleLogout);

    // Nome alterado no perfil → atualiza o título da página.
    window.addEventListener(Sonora.auth.CHANGE_EVENT, event => {
        if (event.detail) renderHeading(event.detail);
    });

    window.addEventListener(Sonora.i18n.CHANGE_EVENT, () => {
        if (currentUser) renderHeading(currentUser);
    });

    Sonora.forms.bindPasswordToggles();

    Sonora.account = { ready };
})(window.Sonora);
