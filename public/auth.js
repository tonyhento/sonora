/* =========================
   SONORA — SESSÃO DO USUÁRIO

   Guarda quem está logado e mantém o link de conta do
   cabeçalho atualizado ("ENTRAR" ou o primeiro nome).

   No HTML:  <a data-account-link> ... <span data-account-label>
   Páginas restritas chamam  Sonora.auth.requireUser().
========================= */

(function (Sonora) {
    "use strict";

    const CHANGE_EVENT = "sonora:auth-change";
    const LOGIN_PAGE = "login.html";
    const ACCOUNT_PAGE = "conta.html";

    let currentUser = null;
    let loadPromise = null;

    function setUser(user) {
        currentUser = user || null;
        renderAccountLinks();
        window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: currentUser }));
    }

    function getFirstName(user) {
        return user.name.split(" ")[0];
    }

    function renderAccountLinks() {
        const { t } = Sonora.i18n;

        document.querySelectorAll("[data-account-link]").forEach(link => {
            const label = link.querySelector("[data-account-label]");

            link.href = currentUser ? ACCOUNT_PAGE : LOGIN_PAGE;
            link.setAttribute("aria-label", currentUser
                ? t("account.myAccount", { name: currentUser.name })
                : t("account.loginLabel"));

            if (label) {
                label.textContent = currentUser
                    ? getFirstName(currentUser).toUpperCase()
                    : t("account.login");
            }
        });
    }

    /* Busca o usuário uma vez por página (as próximas chamadas reaproveitam). */
    function load() {
        if (!loadPromise) {
            loadPromise = Sonora.api.get("/api/auth/me")
                .then(data => {
                    setUser(data.user);
                    return currentUser;
                })
                .catch(() => {
                    // Servidor fora do ar: o site segue funcionando como visitante.
                    setUser(null);
                    return null;
                });
        }

        return loadPromise;
    }

    /*
       Endereço de retorno após o login. Só aceita páginas deste
       site (evita redirecionar para um site externo).
    */
    function getSafeNext(fallback = ACCOUNT_PAGE) {
        const next = new URLSearchParams(window.location.search).get("next");
        return next && /^[a-z0-9-]+\.html(\?[\w=&-]*)?$/i.test(next) ? next : fallback;
    }

    /* Para páginas que exigem login: redireciona visitantes. */
    async function requireUser() {
        const user = await load();

        if (!user) {
            const here = window.location.pathname.split("/").pop() || ACCOUNT_PAGE;
            window.location.replace(`${LOGIN_PAGE}?next=${encodeURIComponent(here)}`);
            return new Promise(() => {}); // a página não continua
        }

        return user;
    }

    /*
       Depois de entrar, junta a sacola e os favoritos de visitante
       com os da conta (account-sync.js) antes de mudar de página.
    */
    async function login(credentials) {
        const data = await Sonora.api.post("/api/auth/login", credentials);
        setUser(data.user);
        await Sonora.sync?.afterLogin(data.user);
        return data.user;
    }

    async function register(details) {
        const data = await Sonora.api.post("/api/auth/register", details);
        setUser(data.user);
        await Sonora.sync?.afterLogin(data.user);
        return data.user;
    }

    /* Ao sair, a sacola e os favoritos da conta saem do navegador. */
    async function logout() {
        try {
            await Sonora.sync?.flush();
            await Sonora.api.post("/api/auth/logout");
        } finally {
            Sonora.sync?.afterLogout();
            setUser(null);
        }
    }

    Sonora.auth = {
        CHANGE_EVENT,
        load,
        login,
        register,
        logout,
        requireUser,
        getSafeNext,
        setUser,
        get user() {
            return currentUser;
        }
    };

    load();

    window.addEventListener(Sonora.i18n.CHANGE_EVENT, renderAccountLinks);
})(window.Sonora);
