/* =========================
   SONORA — SACOLA (DADOS)

   Guarda apenas { id, quantity } no localStorage. Nome, preço
   e imagem são sempre lidos do catálogo (vindo da API, veja
   products.js), então uma mudança de preço reflete na sacola.

   O catálogo chega alguns milissegundos depois: até lá a
   sacola guarda os itens como estão (o contador do BAG já
   aparece certo) e, quando ele chega, remove o que saiu de linha.

   Toda alteração dispara o evento "sonora:cart-change" na
   window, para que qualquer parte da interface se atualize
   (contador do BAG, painel lateral, checkout...). Mudanças
   feitas em outra aba também disparam o evento.
========================= */

(function (Sonora) {
    "use strict";

    const STORAGE_KEY = "sonora-cart";
    const CHANGE_EVENT = "sonora:cart-change";

    function readStorage() {
        try {
            const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
            return Array.isArray(saved) ? saved : [];
        } catch (error) {
            return [];
        }
    }

    /*
       Limpa a sacola salva: agrupa itens repetidos do mesmo
       modelo (versões antigas separavam por cor), descarta
       quantidades inválidas e — se o catálogo já chegou —
       produtos que saíram de linha. Quantidade acima do estoque
       baixa para o que ainda existe; item esgotado continua na
       sacola (marcado como esgotado) até o cliente tirar.
    */
    function normalize(list) {
        const quantities = new Map();

        list.forEach(item => {
            const id = Number(item && item.id);
            const quantity = Math.floor(Number(item && item.quantity));

            if (!(id > 0) || !(quantity > 0)) return;
            if (Sonora.catalog.isLoaded && !Sonora.findProduct(id)) return;

            quantities.set(id, (quantities.get(id) || 0) + quantity);
        });

        return Array.from(quantities, ([id, quantity]) => {
            const product = Sonora.catalog.isLoaded && Sonora.findProduct(id);
            const limit = product ? Sonora.stock.limit(product) : Infinity;

            return { id, quantity: limit > 0 ? Math.min(quantity, limit) : quantity };
        });
    }

    let items = normalize(readStorage());

    function notify() {
        window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
    }

    function persist() {
        let saved = true;

        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
        } catch (error) {
            saved = false;
        }

        notify();
        return saved;
    }

    function findItem(id) {
        return items.find(item => item.id === Number(id));
    }

    // Catálogo carregado: tira o que não existe mais e ajusta ao estoque.
    window.addEventListener(Sonora.catalog.READY_EVENT, () => {
        const valid = normalize(items);

        if (JSON.stringify(valid) !== JSON.stringify(items)) {
            items = valid;
            persist();
        } else {
            notify(); // o estoque pode ter mudado: a interface se atualiza
        }
    });

    // Sincroniza quando a sacola muda em outra aba.
    window.addEventListener("storage", event => {
        if (event.key !== STORAGE_KEY) return;

        items = normalize(readStorage());
        notify();
    });

    Sonora.cart = {
        CHANGE_EVENT,

        /* Itens com os dados completos do produto (vazio até o catálogo chegar). */
        getItems() {
            return items
                .filter(item => Sonora.findProduct(item.id))
                .map(item => ({
                    ...Sonora.findProduct(item.id),
                    quantity: item.quantity
                }));
        },

        /* Quantas unidades ainda cabem na sacola (estoque menos o que já está nela). */
        available(id) {
            const product = Sonora.findProduct(id);
            if (!product) return 0;

            return Math.max(Sonora.stock.limit(product) - (findItem(id)?.quantity || 0), 0);
        },

        /* Retorna false se não couber (estoque) ou se o navegador não permitir salvar. */
        add(id, quantity = 1) {
            if (!Sonora.findProduct(id) || quantity < 1) return false;

            const amount = Math.min(quantity, this.available(id));
            if (amount < 1) return false;

            const item = findItem(id);

            if (item) {
                item.quantity += amount;
            } else {
                items.push({ id: Number(id), quantity: amount });
            }

            return persist();
        },

        increase(id) {
            const item = findItem(id);
            if (!item || this.available(id) < 1) return false;

            item.quantity++;
            return persist();
        },

        /* Algum item esgotado ou acima do estoque? (o pedido não pode ir assim) */
        hasUnavailable() {
            return this.getItems().some(item =>
                Sonora.stock.isSoldOut(item) || item.quantity > Sonora.stock.limit(item));
        },

        decrease(id) {
            const item = findItem(id);
            if (!item) return false;

            item.quantity--;

            if (item.quantity <= 0) {
                return this.remove(id);
            }

            return persist();
        },

        remove(id) {
            items = items.filter(item => item.id !== Number(id));
            return persist();
        },

        clear() {
            items = [];
            return persist();
        },

        /* Só { id, quantity } — o formato enviado ao servidor. */
        getRawItems() {
            return items.map(({ id, quantity }) => ({ id, quantity }));
        },

        /* Troca a sacola inteira (ex.: pela sacola salva na conta). */
        replace(list) {
            items = normalize(Array.isArray(list) ? list : []);
            return persist();
        },

        count() {
            return items.reduce((total, item) => total + item.quantity, 0);
        },

        subtotal() {
            return this.getItems().reduce(
                (total, item) => total + item.price * item.quantity,
                0
            );
        }
    };
})(window.Sonora);
