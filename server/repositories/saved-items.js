/* =========================
   SACOLA E FAVORITOS DA CONTA — ACESSO AO BANCO

   "replace" troca tudo pelo estado atual do navegador.
   "merge" junta com o que já está salvo (usado ao entrar:
   a sacola montada sem login soma com a da conta).

   Produtos inexistentes ou inativos são ignorados.
========================= */

import { query, withTransaction } from "../db.js";

const MAX_QUANTITY = 99;


/* ---------- Sacola ---------- */

export async function getCart(userId) {
    const { rows } = await query(
        `SELECT product_id AS id, quantity
         FROM cart_items
         WHERE user_id = $1
         ORDER BY updated_at`,
        [userId]
    );

    return rows;
}

/* Insere os itens; em "merge", soma com a quantidade já salva. */
function upsertCartItems(client, userId, items, { merge }) {
    const ids = items.map(item => item.id);
    const quantities = items.map(item => item.quantity);

    const onConflict = merge
        ? `LEAST(cart_items.quantity + EXCLUDED.quantity, ${MAX_QUANTITY})`
        : "EXCLUDED.quantity";

    return client.query(
        `INSERT INTO cart_items (user_id, product_id, quantity)
         SELECT $1, p.id, LEAST(x.quantity, ${MAX_QUANTITY})
         FROM unnest($2::int[], $3::int[]) AS x(id, quantity)
         JOIN products p ON p.id = x.id AND p.is_active
         ON CONFLICT (user_id, product_id)
         DO UPDATE SET quantity = ${onConflict}, updated_at = now()`,
        [userId, ids, quantities]
    );
}

export async function replaceCart(userId, items) {
    await withTransaction(async client => {
        await client.query("DELETE FROM cart_items WHERE user_id = $1", [userId]);
        if (items.length) await upsertCartItems(client, userId, items, { merge: false });
    });

    return getCart(userId);
}

export async function mergeCart(userId, items) {
    if (items.length) {
        await withTransaction(client => upsertCartItems(client, userId, items, { merge: true }));
    }

    return getCart(userId);
}

export async function clearCart(userId) {
    await query("DELETE FROM cart_items WHERE user_id = $1", [userId]);
}


/* ---------- Favoritos ---------- */

export async function getFavorites(userId) {
    const { rows } = await query(
        "SELECT product_id FROM favorites WHERE user_id = $1 ORDER BY created_at",
        [userId]
    );

    return rows.map(row => row.product_id);
}

function insertFavorites(client, userId, ids) {
    return client.query(
        `INSERT INTO favorites (user_id, product_id)
         SELECT $1, p.id
         FROM unnest($2::int[]) AS x(id)
         JOIN products p ON p.id = x.id AND p.is_active
         ON CONFLICT DO NOTHING`,
        [userId, ids]
    );
}

export async function replaceFavorites(userId, ids) {
    await withTransaction(async client => {
        await client.query("DELETE FROM favorites WHERE user_id = $1", [userId]);
        if (ids.length) await insertFavorites(client, userId, ids);
    });

    return getFavorites(userId);
}

export async function mergeFavorites(userId, ids) {
    if (ids.length) {
        await withTransaction(client => insertFavorites(client, userId, ids));
    }

    return getFavorites(userId);
}
