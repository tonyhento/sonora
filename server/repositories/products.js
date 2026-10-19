/* =========================
   REPOSITÓRIO DO CATÁLOGO

   Monta cada produto ativo com os textos nos dois idiomas
   e a galeria de fotos, em uma única consulta.
========================= */

import { query, withTransaction } from "../db.js";
import { toNumber } from "../lib/money.js";

const CATALOG_SQL = `
    SELECT p.id, p.code, p.name, p.series, p.subtitle, p.price, p.stock,
           p.story_eyebrow, p.story_title, p.story_highlight,

           COALESCE((
               SELECT json_object_agg(t.lang, json_build_object(
                          'tagline', t.tagline,
                          'description', t.description,
                          'concept', t.concept,
                          'materials', t.materials,
                          'storyText', t.story_text,
                          'specs', t.specs
                      ))
               FROM product_translations t
               WHERE t.product_id = p.id
           ), '{}') AS texts,

           COALESCE((
               SELECT json_agg(json_build_object(
                          'src', i.src,
                          'alt', json_build_object('pt', i.alt_pt, 'en', i.alt_en)
                      ) ORDER BY i.position)
               FROM product_images i
               WHERE i.product_id = p.id
           ), '[]') AS gallery

    FROM products p
    WHERE p.is_active
    ORDER BY p.sort_order, p.id
`;

function toProduct(row) {
    return {
        id: row.id,
        code: row.code,
        name: row.name,
        series: row.series,
        subtitle: row.subtitle,
        price: toNumber(row.price),
        // null = sem controle de estoque; 0 = esgotado.
        stock: row.stock,
        story: {
            eyebrow: row.story_eyebrow,
            title: [row.story_title, row.story_highlight]
        },
        texts: row.texts,
        gallery: row.gallery
    };
}

/* Produtos ativos, na ordem de exibição. Sem foto ou sem texto em
   português, o produto não aparece (evita uma página quebrada). */
export async function listCatalog() {
    const { rows } = await query(CATALOG_SQL);

    return rows
        .map(toProduct)
        .filter(product => product.gallery.length > 0 && product.texts.pt);
}


/* ---------- Painel administrativo ---------- */

// Tudo o que o painel edita: dados, textos PT/EN e galeria.
const ADMIN_PRODUCT_SQL = `
    SELECT p.id, p.code, p.name, p.series, p.subtitle, p.price, p.is_active, p.stock,
           p.story_eyebrow, p.story_title, p.story_highlight,
           COALESCE((
               SELECT json_object_agg(t.lang, json_build_object(
                          'tagline', t.tagline,
                          'description', t.description,
                          'concept', t.concept,
                          'materials', t.materials,
                          'storyText', t.story_text,
                          'specs', t.specs
                      ))
               FROM product_translations t
               WHERE t.product_id = p.id
           ), '{}') AS texts,
           COALESCE((
               SELECT json_agg(json_build_object(
                          'src', i.src,
                          'alt', json_build_object('pt', i.alt_pt, 'en', i.alt_en)
                      ) ORDER BY i.position)
               FROM product_images i
               WHERE i.product_id = p.id
           ), '[]') AS gallery
    FROM products p
`;

export const MAX_IMAGES = 8;

function toAdminProduct(row) {
    return {
        id: row.id,
        code: row.code,
        name: row.name,
        series: row.series,
        subtitle: row.subtitle,
        price: toNumber(row.price),
        isActive: row.is_active,
        stock: row.stock,
        story: {
            eyebrow: row.story_eyebrow,
            title: row.story_title,
            highlight: row.story_highlight
        },
        texts: row.texts,
        gallery: row.gallery,
        image: row.gallery[0]?.src ?? null
    };
}

/*
   Lista do painel, uma página por vez (pensada para centenas de
   produtos): busca por código, nome ou série e filtro de venda.
   status: "all", "active" (à venda) ou "inactive" (fora de linha).
*/
export async function listForAdmin({ search = "", status = "all", limit = 20, offset = 0 } = {}) {
    const conditions = [];
    const params = [];

    if (status === "active") conditions.push("p.is_active");
    if (status === "inactive") conditions.push("NOT p.is_active");

    if (search) {
        // Escapa % e _ para a busca ser literal.
        params.push(`%${search.replace(/[\\%_]/g, char => `\\${char}`)}%`);
        const p = `$${params.length}`;
        conditions.push(`(p.code ILIKE ${p} OR p.name ILIKE ${p} OR p.series ILIKE ${p})`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const count = await query(`SELECT count(*)::int AS total FROM products p ${where}`, params);

    params.push(limit, offset);
    const { rows } = await query(
        `${ADMIN_PRODUCT_SQL} ${where}
         ORDER BY p.sort_order, p.id
         LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params
    );

    return { total: count.rows[0].total, products: rows.map(toAdminProduct) };
}

/* Um produto no formato do painel (ex.: depois de salvar). */
export async function findForAdmin(id) {
    const { rows } = await query(`${ADMIN_PRODUCT_SQL} WHERE p.id = $1`, [id]);
    return rows[0] ? toAdminProduct(rows[0]) : null;
}

/* Séries já usadas (sugestões no formulário). */
export async function listSeries() {
    const { rows } = await query("SELECT DISTINCT series FROM products ORDER BY series");
    return rows.map(row => row.series);
}

async function saveTexts(client, id, texts) {
    for (const [lang, text] of Object.entries(texts)) {
        await client.query(
            `INSERT INTO product_translations
                 (product_id, lang, tagline, description, concept, materials, story_text, specs)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
             ON CONFLICT (product_id, lang) DO UPDATE SET
                 tagline = EXCLUDED.tagline,
                 description = EXCLUDED.description,
                 concept = EXCLUDED.concept,
                 materials = EXCLUDED.materials,
                 story_text = EXCLUDED.story_text,
                 specs = EXCLUDED.specs`,
            [id, lang, text.tagline, text.description, text.concept,
                text.materials, text.storyText, JSON.stringify(text.specs)]
        );
    }
}

/*
   Cria um produto novo SEMPRE fora de linha (rascunho): ele só pode
   ir para a venda depois de ganhar pelo menos uma foto.
   Retorna null se o código já existir.
*/
export async function createForAdmin(product) {
    try {
        return await withTransaction(async client => {
            const { rows } = await client.query(
                `INSERT INTO products
                     (code, name, series, subtitle, price, stock, is_active, sort_order,
                      story_eyebrow, story_title, story_highlight)
                 VALUES ($1, $2, $3, $4, $5, $6, false,
                         (SELECT COALESCE(max(sort_order), 0) + 1 FROM products),
                         $7, $8, $9)
                 RETURNING id`,
                [product.code, product.name, product.series, product.subtitle, product.price, product.stock,
                    product.story.eyebrow, product.story.title, product.story.highlight]
            );

            await saveTexts(client, rows[0].id, product.texts);
            return rows[0].id;
        });
    } catch (error) {
        if (error.code === "23505") return null; // código repetido (UNIQUE)
        throw error;
    }
}

/*
   Salva tudo de uma vez (dados, textos e a galeria na ordem nova).
   A galeria só pode conter fotos que já são deste produto: dá para
   reordenar, editar o texto alternativo ou tirar, nunca "apontar"
   para um arquivo qualquer.
   Retorna { status: "not-found" | "needs-image" | "ok", removed }:
   "removed" são as fotos que saíram da galeria (para apagar os
   arquivos depois que tudo foi salvo).
*/
export async function updateForAdmin(id, product) {
    return withTransaction(async client => {
        const current = await client.query(
            "SELECT src FROM product_images WHERE product_id = $1",
            [id]
        );
        const exists = await client.query("SELECT 1 FROM products WHERE id = $1 FOR UPDATE", [id]);

        if (exists.rowCount === 0) return { status: "not-found", removed: [] };

        const owned = new Set(current.rows.map(row => row.src));
        const gallery = (product.gallery ?? current.rows.map(row => ({ src: row.src })))
            .filter(image => owned.has(image.src));

        if (product.isActive && gallery.length === 0) return { status: "needs-image", removed: [] };

        await client.query(
            `UPDATE products SET
                 name = $2, series = $3, subtitle = $4, price = $5, is_active = $6,
                 story_eyebrow = $7, story_title = $8, story_highlight = $9, stock = $10
             WHERE id = $1`,
            [id, product.name, product.series, product.subtitle, product.price, product.isActive,
                product.story.eyebrow, product.story.title, product.story.highlight, product.stock]
        );

        await saveTexts(client, id, product.texts);

        if (product.gallery) {
            // Regrava a galeria na ordem enviada (posição 1 = capa).
            const old = await client.query(
                "SELECT src, alt_pt, alt_en FROM product_images WHERE product_id = $1",
                [id]
            );
            const oldAlts = new Map(old.rows.map(row => [row.src, row]));

            await client.query("DELETE FROM product_images WHERE product_id = $1", [id]);

            for (const [index, image] of gallery.entries()) {
                const previous = oldAlts.get(image.src);
                await client.query(
                    `INSERT INTO product_images (product_id, position, src, alt_pt, alt_en)
                     VALUES ($1, $2, $3, $4, $5)`,
                    [id, index + 1, image.src,
                        image.alt?.pt ?? previous.alt_pt, image.alt?.en ?? previous.alt_en]
                );
            }
        }

        const kept = new Set(gallery.map(image => image.src));
        const removed = product.gallery ? [...owned].filter(src => !kept.has(src)) : [];

        return { status: "ok", removed };
    });
}

/* Alguma galeria ainda usa esta foto? (antes de apagar o arquivo) */
export async function isImageInUse(src) {
    const { rowCount } = await query("SELECT 1 FROM product_images WHERE src = $1 LIMIT 1", [src]);
    return rowCount > 0;
}

/* Nova foto no fim da galeria. Retorna false se já tiver o máximo. */
export async function addImage(id, { src, altPt, altEn }) {
    return withTransaction(async client => {
        const { rows } = await client.query(
            "SELECT count(*)::int AS total, COALESCE(max(position), 0) AS last FROM product_images WHERE product_id = $1",
            [id]
        );

        if (rows[0].total >= MAX_IMAGES) return false;

        await client.query(
            `INSERT INTO product_images (product_id, position, src, alt_pt, alt_en)
             VALUES ($1, $2, $3, $4, $5)`,
            [id, rows[0].last + 1, src, altPt, altEn]
        );

        return true;
    });
}
