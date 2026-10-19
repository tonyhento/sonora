/* =========================
   SONORA — SACOLA E FAVORITOS NA CONTA

   Sem login, sacola e favoritos ficam só no navegador.
   Com login, a conta (banco de dados) passa a ser a fonte:

   - ENTRAR: o que foi montado como visitante é somado ao que
     já estava salvo na conta, e o resultado aparece na tela.
   - USANDO: cada alteração é salva na conta (com um pequeno
     atraso, para juntar cliques seguidos em um só envio).
   - SAIR: sacola e favoritos são apagados do navegador. Eles
     voltam quando a pessoa entrar de novo, em qualquer aparelho.

   "sonora-owner" guarda de qual conta são os dados locais.
   Se a sessão expirar ou outra pessoa entrar no mesmo
   navegador, os dados da conta anterior não vazam.

   "sonora-unsaved" marca alterações ainda não enviadas (ex.:
   a pessoa trocou de página logo após adicionar um item).
   Nesse caso o navegador tem a versão mais nova, e ela é
   enviada à conta em vez de ser substituída.
========================= */

(function (Sonora) {
    "use strict";

    const OWNER_KEY = "sonora-owner";
    const UNSAVED_KEY = "sonora-unsaved";
    const SAVE_DELAY_MS = 400;

    const { api, cart, favorites } = Sonora;

    let connectedUserId = null;
    let isApplyingRemote = false;
    let saveTimer = null;
    const pending = { cart: false, favorites: false };


    /* =========================
       01. DONO DOS DADOS LOCAIS
    ========================= */

    function readOwner() {
        try {
            return Number(localStorage.getItem(OWNER_KEY)) || null;
        } catch (error) {
            return null;
        }
    }

    function writeOwner(userId) {
        try {
            localStorage.setItem(OWNER_KEY, String(userId));
        } catch (error) {
            // Sem armazenamento: a sincronização vale só nesta página.
        }
    }

    function removeOwner() {
        try {
            localStorage.removeItem(OWNER_KEY);
        } catch (error) {
            // ignora
        }
    }

    /* Alterações locais ainda não salvas na conta (vale para esta aba). */
    function hasUnsaved() {
        try {
            return sessionStorage.getItem(UNSAVED_KEY) === "1";
        } catch (error) {
            return pending.cart || pending.favorites;
        }
    }

    function setUnsaved(value) {
        try {
            if (value) sessionStorage.setItem(UNSAVED_KEY, "1");
            else sessionStorage.removeItem(UNSAVED_KEY);
        } catch (error) {
            // ignora
        }
    }


    /* =========================
       02. APLICAR DADOS SEM REENVIAR
       Mudanças vindas do servidor não devem disparar um novo
       salvamento (evita o vai e volta).
    ========================= */

    function withoutSaving(callback) {
        isApplyingRemote = true;

        try {
            callback();
        } finally {
            isApplyingRemote = false;
        }
    }

    function applyRemote({ items, ids }) {
        withoutSaving(() => {
            if (items) cart.replace(items);
            if (ids) favorites.replace(ids);
        });
    }

    function clearLocal() {
        clearTimeout(saveTimer);
        pending.cart = false;
        pending.favorites = false;
        setUnsaved(false);

        withoutSaving(() => {
            cart.clear();
            favorites.clear();
        });
    }


    /* =========================
       03. CONECTAR À CONTA
    ========================= */

    async function fetchFromAccount() {
        const [cartData, favoritesData] = await Promise.all([
            api.get("/api/cart"),
            api.get("/api/favorites")
        ]);

        return { items: cartData.items, ids: favoritesData.ids };
    }

    /*
       Envia o estado do navegador inteiro para a conta.
       O que mudar DURANTE o envio continua pendente e é
       enviado logo depois (veja o fim de connect).
    */
    async function pushToAccount() {
        pending.cart = false;
        pending.favorites = false;

        await Promise.all([
            api.put("/api/cart", { items: cart.getRawItems() }),
            api.put("/api/favorites", { ids: favorites.getIds() })
        ]);

        if (!pending.cart && !pending.favorites) setUnsaved(false);
    }

    async function mergeIntoAccount() {
        const [cartData, favoritesData] = await Promise.all([
            api.post("/api/cart/merge", { items: cart.getRawItems() }),
            api.post("/api/favorites/merge", { ids: favorites.getIds() })
        ]);

        applyRemote({ items: cartData.items, ids: favoritesData.ids });
        setUnsaved(false);
    }

    async function connect(user) {
        const owner = readOwner();

        if (owner === user.id) {
            // Os dados locais já são desta conta. Se não há nada
            // pendente, traz a versão da conta (pode ter mudado em
            // outro aparelho); se há, o navegador tem a mais nova.
            if (!hasUnsaved()) {
                const remote = await fetchFromAccount();

                // A pessoa pode ter mexido na sacola durante a busca.
                if (!hasUnsaved()) applyRemote(remote);
            }

            if (hasUnsaved()) await pushToAccount();
        } else {
            // Dados de outra conta não podem ser misturados.
            if (owner) clearLocal();

            // Dados de visitante: somam com os da conta.
            await mergeIntoAccount();
        }

        writeOwner(user.id);
        connectedUserId = user.id;

        // Alterações feitas enquanto conectava: envia agora.
        if (pending.cart || pending.favorites) await flush();
    }


    /* =========================
       04. SALVAR ALTERAÇÕES NA CONTA
    ========================= */

    function scheduleSave(kind) {
        if (isApplyingRemote) return;

        pending[kind] = true;
        setUnsaved(true);

        // Ainda conectando à conta: connect() envia ao terminar.
        if (!connectedUserId) return;

        clearTimeout(saveTimer);
        saveTimer = setTimeout(flush, SAVE_DELAY_MS);
    }

    /* Envia agora o que estiver pendente. */
    async function flush({ keepalive = false } = {}) {
        clearTimeout(saveTimer);

        if (!connectedUserId) return;

        const requests = [];

        if (pending.cart) {
            requests.push(api.put("/api/cart", { items: cart.getRawItems() }, { keepalive }));
        }

        if (pending.favorites) {
            requests.push(api.put("/api/favorites", { ids: favorites.getIds() }, { keepalive }));
        }

        pending.cart = false;
        pending.favorites = false;

        const results = await Promise.allSettled(requests);
        const allSaved = results.every(result => result.status === "fulfilled");

        // Só limpa a marca se tudo foi salvo e nada novo apareceu.
        if (allSaved && !pending.cart && !pending.favorites) setUnsaved(false);
    }


    /* =========================
       05. ENTRAR, SAIR E CARREGAR A PÁGINA
    ========================= */

    async function afterLogin(user) {
        try {
            await connect(user);
        } catch (error) {
            // Se falhar, o login continua valendo; a sacola local fica como está.
        }
    }

    function afterLogout() {
        clearLocal();
        removeOwner();
        connectedUserId = null;
    }

    function afterPageLoad(user) {
        if (user) {
            connect(user).catch(() => {});
            return;
        }

        // Visitante com dados de uma conta (sessão expirou ou saiu em outra aba).
        if (readOwner()) afterLogout();
    }


    /* =========================
       06. EVENTOS
    ========================= */

    window.addEventListener(cart.CHANGE_EVENT, () => scheduleSave("cart"));
    window.addEventListener(favorites.CHANGE_EVENT, () => scheduleSave("favorites"));

    // Fechando ou trocando de página: envia o que estiver pendente.
    window.addEventListener("pagehide", () => {
        if (pending.cart || pending.favorites) flush({ keepalive: true });
    });

    Sonora.auth.load().then(afterPageLoad);

    Sonora.sync = { afterLogin, afterLogout, flush };
})(window.Sonora);
