/* =========================
   PEDIDOS — ACESSO AO BANCO
========================= */

import { query, withTransaction } from "../db.js";
import { toNumber } from "../lib/money.js";

/*
   Estados do pedido:
   - awaiting_payment / payment_expired: cartão ainda não pago (ou
     desistiu). Não aparecem no histórico do cliente.
   - confirmed → shipped → delivered (ou cancelled): pedido valendo.
*/
export const AWAITING_PAYMENT = "awaiting_payment";
export const PAYMENT_EXPIRED = "payment_expired";
export const CONFIRMED = "confirmed";
export const SHIPPED = "shipped";
export const DELIVERED = "delivered";
export const CANCELLED = "cancelled";

/*
   Mudanças de status permitidas no painel administrativo.
   Entregue e cancelado são finais; pedido não pago não é editado.
*/
export const STATUS_TRANSITIONS = {
    [CONFIRMED]: [SHIPPED, CANCELLED],
    [SHIPPED]: [DELIVERED]
};

// Pedidos que contam como venda (faturamento, mais vendidos).
const SOLD = `('${CONFIRMED}', '${SHIPPED}', '${DELIVERED}')`;

// Só pedidos pagos (ou simulados) entram no histórico.
const VISIBLE = `o.status NOT IN ('${AWAITING_PAYMENT}', '${PAYMENT_EXPIRED}')`;

/* Converte a linha do banco para o formato da API (camelCase). */
function toOrder(row) {
    return {
        number: row.number,
        status: row.status,
        createdAt: row.created_at,
        statusUpdatedAt: row.status_updated_at ?? null,
        customer: {
            name: row.customer_name,
            email: row.customer_email,
            phone: row.customer_phone
        },
        address: {
            cep: row.cep,
            street: row.street,
            number: row.street_number,
            complement: row.complement,
            district: row.district,
            city: row.city,
            state: row.state
        },
        payment: row.payment_method,
        subtotal: toNumber(row.subtotal),
        discount: toNumber(row.discount),
        total: toNumber(row.total),
        items: (row.items ?? []).map(item => ({
            productId: item.product_id,
            name: item.product_name,
            unitPrice: toNumber(item.unit_price),
            quantity: item.quantity
        }))
    };
}

// Pedido + itens em uma única consulta (json_agg monta a lista).
const ORDER_WITH_ITEMS = `
    SELECT o.*,
           COALESCE(
               json_agg(
                   json_build_object(
                       'product_id', i.product_id,
                       'product_name', i.product_name,
                       'unit_price', i.unit_price,
                       'quantity', i.quantity
                   ) ORDER BY i.id
               ) FILTER (WHERE i.id IS NOT NULL),
               '[]'
           ) AS items
    FROM orders o
    LEFT JOIN order_items i ON i.order_id = o.id
`;

/* ---------- Estoque ----------
   stock NULL = sem controle (vende sempre). O pedido reserva as
   unidades ao ser criado; pagamento expirado ou pedido cancelado
   devolve. Tudo dentro da mesma transação da mudança de status. */

/* Faltou estoque para algum item: o pedido inteiro é desfeito. */
export class OutOfStockError extends Error {
    constructor(productIds) {
        super("out of stock");
        this.name = "OutOfStockError";
        this.productIds = productIds;
    }
}

async function reserveStock(client, items) {
    const missing = [];

    // Sempre na mesma ordem (por id): dois pedidos ao mesmo tempo não se travam.
    const sorted = [...items].sort((a, b) => a.productId - b.productId);

    for (const item of sorted) {
        // Só desconta se houver unidades suficientes (conferido no próprio UPDATE).
        const { rowCount } = await client.query(
            `UPDATE products SET stock = stock - $2
             WHERE id = $1 AND (stock IS NULL OR stock >= $2)`,
            [item.productId, item.quantity]
        );

        if (rowCount === 0) missing.push(item.productId);
    }

    if (missing.length) throw new OutOfStockError(missing);
}

/* Devolve ao estoque as unidades de um pedido. */
async function restock(client, orderId) {
    await client.query(
        `UPDATE products p SET stock = p.stock + i.quantity
         FROM order_items i
         WHERE i.order_id = $1 AND i.product_id = p.id AND p.stock IS NOT NULL`,
        [orderId]
    );
}

/* Produtos ativos do catálogo, para conferir preços no servidor. */
export async function findActiveProducts(ids) {
    const { rows } = await query(
        "SELECT id, name, price FROM products WHERE id = ANY($1::int[]) AND is_active",
        [ids]
    );

    return rows;
}

export async function create({ userId, customer, address, payment, items, totals, status = CONFIRMED, lang = "pt" }) {
    return withTransaction(async client => {
        await reserveStock(client, items);

        const { rows } = await client.query(
            `INSERT INTO orders (
                user_id, customer_name, customer_email, customer_phone,
                cep, street, street_number, complement, district, city, state,
                payment_method, subtotal, discount, total, status, lang
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
            RETURNING id`,
            [
                userId, customer.name, customer.email, customer.phone,
                address.cep, address.street, address.number, address.complement || null,
                address.district, address.city, address.state,
                payment, totals.subtotal, totals.discount, totals.total, status, lang
            ]
        );

        const orderId = rows[0].id;

        // Número legível e único, derivado do id: SN-100001, SN-100002...
        await client.query(
            "UPDATE orders SET number = 'SN-' || (100000 + id) WHERE id = $1",
            [orderId]
        );

        for (const item of items) {
            await client.query(
                `INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity)
                 VALUES ($1, $2, $3, $4, $5)`,
                [orderId, item.productId, item.name, item.unitPrice, item.quantity]
            );
        }

        const result = await client.query(
            `${ORDER_WITH_ITEMS} WHERE o.id = $1 GROUP BY o.id`,
            [orderId]
        );

        return toOrder(result.rows[0]);
    });
}

export async function findByUser(userId) {
    const { rows } = await query(
        `${ORDER_WITH_ITEMS}
         WHERE o.user_id = $1 AND ${VISIBLE}
         GROUP BY o.id
         ORDER BY o.created_at DESC`,
        [userId]
    );

    return rows.map(toOrder);
}

/* Só encontra o pedido se ele pertencer ao usuário. */
export async function findByNumberForUser(number, userId) {
    const { rows } = await query(
        `${ORDER_WITH_ITEMS}
         WHERE o.number = $1 AND o.user_id = $2 AND ${VISIBLE}
         GROUP BY o.id`,
        [number, userId]
    );

    return rows[0] ? toOrder(rows[0]) : null;
}


/* ---------- Pagamento com cartão (Stripe) ---------- */

export async function setStripeSession(number, sessionId) {
    await query("UPDATE orders SET stripe_session_id = $2 WHERE number = $1", [number, sessionId]);
}

/* Pedido ligado a uma sessão do Stripe, com id, dono e idioma (uso interno). */
export async function findByStripeSession(sessionId) {
    const { rows } = await query(
        `${ORDER_WITH_ITEMS} WHERE o.stripe_session_id = $1 GROUP BY o.id`,
        [sessionId]
    );

    const row = rows[0];
    return row ? { id: row.id, userId: row.user_id, lang: row.lang, order: toOrder(row) } : null;
}

/* Confirma o pagamento uma única vez. Retorna false se já estava confirmado. */
export async function markPaid(orderId) {
    const { rowCount } = await query(
        `UPDATE orders SET status = '${CONFIRMED}', paid_at = now()
         WHERE id = $1 AND status = '${AWAITING_PAYMENT}'`,
        [orderId]
    );

    return rowCount === 1;
}

/* Pagamento não aconteceu: o pedido perde o efeito e o estoque volta. */
async function expireWhere(condition, value) {
    return withTransaction(async client => {
        const { rows } = await client.query(
            `UPDATE orders SET status = '${PAYMENT_EXPIRED}'
             WHERE ${condition} = $1 AND status = '${AWAITING_PAYMENT}'
             RETURNING id`,
            [value]
        );

        if (rows[0]) await restock(client, rows[0].id);
        return Boolean(rows[0]);
    });
}

export function markPaymentExpired(sessionId) {
    return expireWhere("stripe_session_id", sessionId);
}

/* Não foi possível abrir o pagamento: o pedido fica sem efeito. */
export function cancelUnpaid(number) {
    return expireWhere("number", number);
}

/*
   Pedidos no cartão ainda aguardando pagamento, criados há mais de
   "olderThanMinutes" (para a conferência automática com o Stripe).
*/
export async function findAwaitingPayment({ olderThanMinutes = 2, limit = 50 } = {}) {
    const { rows } = await query(
        `SELECT number, stripe_session_id, created_at
         FROM orders
         WHERE status = '${AWAITING_PAYMENT}'
           AND created_at < now() - make_interval(mins => $1)
         ORDER BY created_at
         LIMIT $2`,
        [olderThanMinutes, limit]
    );

    return rows.map(row => ({
        number: row.number,
        sessionId: row.stripe_session_id,
        createdAt: row.created_at
    }));
}


/* ---------- Painel administrativo ---------- */

/*
   Lista para o painel, do mais novo ao mais antigo.
   status: "all" (todos os pedidos válidos), "unpaid" (cartão não
   pago ou desistência) ou um status específico.
   search: número do pedido, nome ou e-mail do cliente.
*/
export async function listForAdmin({ status = "all", search = "", limit = 20, offset = 0 }) {
    const conditions = [];
    const params = [];

    if (status === "all") {
        conditions.push(VISIBLE);
    } else if (status === "unpaid") {
        conditions.push(`o.status IN ('${AWAITING_PAYMENT}', '${PAYMENT_EXPIRED}')`);
    } else {
        params.push(status);
        conditions.push(`o.status = $${params.length}`);
    }

    if (search) {
        // Escapa % e _ para a busca ser literal.
        params.push(`%${search.replace(/[\\%_]/g, char => `\\${char}`)}%`);
        const p = `$${params.length}`;
        conditions.push(`(o.number ILIKE ${p} OR o.customer_name ILIKE ${p} OR o.customer_email ILIKE ${p})`);
    }

    const where = `WHERE ${conditions.join(" AND ")}`;

    const countResult = await query(`SELECT count(*)::int AS total FROM orders o ${where}`, params);

    params.push(limit, offset);
    const { rows } = await query(
        `${ORDER_WITH_ITEMS} ${where}
         GROUP BY o.id
         ORDER BY o.created_at DESC, o.id DESC
         LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params
    );

    return { total: countResult.rows[0].total, orders: rows.map(toOrder) };
}

/*
   Muda o status só se a mudança for permitida a partir do status
   ATUAL (conferido no próprio UPDATE: dois admins ao mesmo tempo
   não conseguem, por exemplo, entregar um pedido cancelado).
   Retorna o pedido atualizado (com e-mail e idioma) ou null.
*/
export async function updateStatus(number, nextStatus) {
    const allowedFrom = Object.keys(STATUS_TRANSITIONS)
        .filter(from => STATUS_TRANSITIONS[from].includes(nextStatus));

    const rows = await withTransaction(async client => {
        const result = await client.query(
            `UPDATE orders SET status = $2, status_updated_at = now()
             WHERE number = $1 AND status = ANY($3::text[])
             RETURNING id, user_id, lang`,
            [number, nextStatus, allowedFrom]
        );

        // Cancelado: as unidades voltam para o estoque.
        if (result.rows[0] && nextStatus === CANCELLED) await restock(client, result.rows[0].id);

        return result.rows;
    });

    if (!rows[0]) return null;

    const result = await query(`${ORDER_WITH_ITEMS} WHERE o.id = $1 GROUP BY o.id`, [rows[0].id]);

    return { order: toOrder(result.rows[0]), userId: rows[0].user_id, lang: rows[0].lang };
}

/* Números da visão geral do painel. */
export async function getSummary() {
    const totals = await query(`
        SELECT
            count(*) FILTER (WHERE status IN ${SOLD})::int                     AS sold_orders,
            COALESCE(sum(total) FILTER (WHERE status IN ${SOLD}), 0)          AS revenue,
            COALESCE(sum(total) FILTER (
                WHERE status IN ${SOLD} AND created_at > now() - interval '30 days'
            ), 0)                                                             AS revenue_30d,
            count(*) FILTER (WHERE status = '${CONFIRMED}')::int               AS to_ship,
            count(*) FILTER (WHERE status = '${SHIPPED}')::int                 AS shipped,
            count(*) FILTER (WHERE status = '${DELIVERED}')::int               AS delivered,
            count(*) FILTER (WHERE status = '${CANCELLED}')::int               AS cancelled,
            count(*) FILTER (WHERE status = '${AWAITING_PAYMENT}')::int        AS awaiting_payment
        FROM orders
    `);

    const customers = await query("SELECT count(*)::int AS total FROM users WHERE role = 'customer'");

    const topProducts = await query(`
        SELECT i.product_id, i.product_name AS name,
               sum(i.quantity)::int AS quantity,
               sum(i.quantity * i.unit_price) AS revenue
        FROM order_items i
        JOIN orders o ON o.id = i.order_id AND o.status IN ${SOLD}
        GROUP BY i.product_id, i.product_name
        ORDER BY quantity DESC, revenue DESC
        LIMIT 5
    `);

    const row = totals.rows[0];
    const revenue = toNumber(row.revenue);

    return {
        revenue,
        revenueLast30Days: toNumber(row.revenue_30d),
        soldOrders: row.sold_orders,
        averageTicket: row.sold_orders ? Math.round((revenue / row.sold_orders) * 100) / 100 : 0,
        customers: customers.rows[0].total,
        byStatus: {
            confirmed: row.to_ship,
            shipped: row.shipped,
            delivered: row.delivered,
            cancelled: row.cancelled,
            awaitingPayment: row.awaiting_payment
        },
        topProducts: topProducts.rows.map(product => ({
            productId: product.product_id,
            name: product.name,
            quantity: product.quantity,
            revenue: toNumber(product.revenue)
        }))
    };
}
