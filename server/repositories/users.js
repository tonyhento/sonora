/* =========================
   USUÁRIOS — ACESSO AO BANCO

   Todo SQL de usuários fica aqui. As rotas só chamam estas
   funções, sem montar consultas. O hash da senha nunca sai
   desta camada, exceto em findByEmailWithPassword (login).
========================= */

import { query } from "../db.js";

/* Formato público do usuário (o que o navegador recebe). */
function toPublicUser(row) {
    if (!row) return null;

    return {
        id: row.id,
        name: row.name,
        email: row.email,
        phone: row.phone,
        createdAt: row.created_at,
        // Só o necessário para a interface: mostrar ou não o painel.
        // Quem decide o acesso é o servidor (middleware/auth.js).
        isAdmin: row.role === "admin"
    };
}

const PUBLIC_COLUMNS = "id, name, email, phone, created_at, role";

export async function findById(id) {
    const { rows } = await query(
        `SELECT ${PUBLIC_COLUMNS} FROM users WHERE id = $1`,
        [id]
    );

    return toPublicUser(rows[0]);
}

export async function findByEmailWithPassword(email) {
    const { rows } = await query(
        `SELECT ${PUBLIC_COLUMNS}, password_hash FROM users WHERE lower(email) = lower($1)`,
        [email]
    );

    const row = rows[0];
    return row ? { user: toPublicUser(row), passwordHash: row.password_hash } : null;
}

export async function findPasswordHash(id) {
    const { rows } = await query("SELECT password_hash FROM users WHERE id = $1", [id]);
    return rows[0]?.password_hash ?? null;
}

/* Retorna null se o e-mail já estiver em uso. */
export async function create({ name, email, passwordHash }) {
    try {
        const { rows } = await query(
            `INSERT INTO users (name, email, password_hash)
             VALUES ($1, $2, $3)
             RETURNING ${PUBLIC_COLUMNS}`,
            [name, email, passwordHash]
        );

        return toPublicUser(rows[0]);
    } catch (error) {
        if (error.code === "23505") return null; // violação de UNIQUE (e-mail)
        throw error;
    }
}

export async function updateProfile(id, { name, phone }) {
    const { rows } = await query(
        `UPDATE users SET name = $2, phone = $3
         WHERE id = $1
         RETURNING ${PUBLIC_COLUMNS}`,
        [id, name, phone ?? null]
    );

    return toPublicUser(rows[0]);
}

/* Promove ou rebaixa uma conta (script npm run admin). */
export async function setRole(email, role) {
    const { rows } = await query(
        `UPDATE users SET role = $2 WHERE lower(email) = lower($1) RETURNING ${PUBLIC_COLUMNS}`,
        [email, role]
    );

    return toPublicUser(rows[0]);
}

export async function updatePassword(id, passwordHash) {
    await query("UPDATE users SET password_hash = $2 WHERE id = $1", [id, passwordHash]);
}

/*
   Exclui a conta. O banco cuida do resto: sacola, favoritos e links
   de nova senha saem junto (ON DELETE CASCADE); os pedidos ficam,
   mas sem ligação com a conta (ON DELETE SET NULL) — a loja precisa
   do registro das vendas.
*/
export async function remove(id) {
    const { rowCount } = await query("DELETE FROM users WHERE id = $1", [id]);
    return rowCount === 1;
}
