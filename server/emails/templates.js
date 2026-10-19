/* =========================
   MODELOS DE E-MAIL

   E-mail não é página web: muitos aplicativos ignoram CSS em
   <style> e layouts modernos. Por isso o HTML usa tabelas e
   estilos direto em cada elemento (o "jeito clássico" que
   funciona no Gmail, Outlook e celular).

   Todo dado digitado por usuários (nome, endereço...) passa
   por escapeHtml antes de entrar no HTML.
========================= */

import { emailMessages } from "./messages.js";

const COLORS = {
    background: "#e9e7e1",
    card: "#f4f3ef",
    text: "#171717",
    muted: "#777771",
    accent: "#3155ff",
    line: "#d9d7d0"
};

const FONT = "Helvetica, Arial, sans-serif";

export function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[char]);
}

function translator(lang) {
    const dictionary = emailMessages[lang] || emailMessages.pt;

    // {variáveis} são escapadas aqui: os textos do dicionário são confiáveis,
    // os valores (nome, número do pedido...) não.
    return (key, vars = {}) => (dictionary[key] ?? emailMessages.pt[key] ?? key)
        .replace(/\{(\w+)\}/g, (match, name) => (name in vars ? escapeHtml(vars[name]) : match));
}

// O mesmo texto sem marcação, para o assunto e a versão em texto puro.
const plain = html => html.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");

function formatMoney(value, lang) {
    return value.toLocaleString(lang === "en" ? "en-US" : "pt-BR", { style: "currency", currency: "BRL" });
}


/* ---------- Peças do layout ---------- */

function button(label, url) {
    return `
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 8px;">
            <tr><td style="background:${COLORS.text};border-radius:999px;">
                <a href="${escapeHtml(url)}" style="display:inline-block;padding:15px 28px;font-family:${FONT};font-size:12px;font-weight:700;letter-spacing:1px;color:#ffffff;text-decoration:none;">${label} &#8599;</a>
            </td></tr>
        </table>`;
}

function paragraph(html, { muted = false, small = false } = {}) {
    return `<p style="margin:0 0 14px;font-family:${FONT};font-size:${small ? 12 : 15}px;line-height:1.6;color:${muted ? COLORS.muted : COLORS.text};">${html}</p>`;
}

function layout({ lang, preheader, title, body, t }) {
    const heading = title.replace(/<span>/g, `<span style="color:${COLORS.accent};">`);

    return `<!DOCTYPE html>
<html lang="${lang === "en" ? "en" : "pt-BR"}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${plain(title)}</title>
</head>
<body style="margin:0;padding:0;background:${COLORS.background};">
    <!-- Texto de prévia (aparece na lista de e-mails, escondido no corpo) -->
    <div style="display:none;max-height:0;overflow:hidden;">${preheader}</div>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.background};">
        <tr><td align="center" style="padding:36px 16px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
                <tr><td style="padding:0 0 26px;font-family:${FONT};font-size:20px;font-weight:800;letter-spacing:-0.5px;color:${COLORS.text};">SONORA&reg;</td></tr>
                <tr><td style="background:${COLORS.card};border-radius:18px;padding:36px 32px;">
                    <h1 style="margin:0 0 22px;font-family:${FONT};font-size:38px;line-height:1;font-weight:800;letter-spacing:-1.5px;color:${COLORS.text};">${heading}</h1>
                    ${body}
                </td></tr>
                <tr><td style="padding:22px 4px 0;font-family:${FONT};font-size:11px;line-height:1.6;color:${COLORS.muted};">${t("footer")}</td></tr>
            </table>
        </td></tr>
    </table>
</body>
</html>`;
}


/* ---------- Recuperação de senha ---------- */

export function passwordResetEmail({ lang, name, url, minutes }) {
    const t = translator(lang);
    const firstName = String(name).split(" ")[0];

    const body = [
        paragraph(t("reset.greeting", { name: firstName })),
        paragraph(t("reset.text", { minutes })),
        button(t("reset.button"), url),
        paragraph(t("reset.ignore"), { muted: true, small: true }),
        paragraph(`${t("fallback")}<br><a href="${escapeHtml(url)}" style="color:${COLORS.accent};word-break:break-all;">${escapeHtml(url)}</a>`, { muted: true, small: true })
    ].join("");

    const subject = plain(t("reset.subject"));

    return {
        subject,
        html: layout({ lang, t, title: t("reset.title"), preheader: t("reset.preheader", { minutes }), body }),
        text: [
            plain(t("reset.greeting", { name: firstName })),
            "",
            plain(t("reset.text", { minutes })),
            "",
            url,
            "",
            plain(t("reset.ignore"))
        ].join("\n")
    };
}


/* ---------- Pedido confirmado ---------- */

function row(label, value, { strong = false } = {}) {
    const weight = strong ? 700 : 400;
    const size = strong ? 16 : 14;

    return `
        <tr>
            <td style="padding:7px 0;font-family:${FONT};font-size:${size}px;font-weight:${weight};color:${strong ? COLORS.text : COLORS.muted};">${label}</td>
            <td align="right" style="padding:7px 0;font-family:${FONT};font-size:${size}px;font-weight:${weight};color:${COLORS.text};">${value}</td>
        </tr>`;
}

function sectionTitle(text) {
    return `<p style="margin:26px 0 10px;font-family:${FONT};font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:${COLORS.muted};">${text}</p>`;
}

export function orderConfirmedEmail({ lang, order, ordersUrl, storeUrl }) {
    const t = translator(lang);
    const money = value => formatMoney(value, lang);
    const firstName = order.customer.name.split(" ")[0];
    const { address } = order;

    const items = order.items.map(item => row(
        `${escapeHtml(item.quantity)}&times; ${escapeHtml(item.name)}`,
        money(item.unitPrice * item.quantity)
    )).join("");

    const totals = [
        row(t("order.subtotal"), money(order.subtotal)),
        order.discount > 0 ? row(t("order.discount"), `&minus; ${money(order.discount)}`) : "",
        row(t("order.shipping"), t("order.free")),
        `<tr><td colspan="2" style="border-top:1px solid ${COLORS.line};font-size:0;line-height:0;">&nbsp;</td></tr>`,
        row(t("order.total"), money(order.total), { strong: true })
    ].join("");

    const addressHtml = [
        `${escapeHtml(order.customer.name)}`,
        `${escapeHtml(address.street)}, ${escapeHtml(address.number)}${address.complement ? ` — ${escapeHtml(address.complement)}` : ""}`,
        escapeHtml(address.district),
        `${escapeHtml(address.city)} — ${escapeHtml(address.state)}`,
        `CEP ${escapeHtml(String(address.cep).replace(/^(\d{5})(\d{3})$/, "$1-$2"))}`
    ].join("<br>");

    const buttonUrl = ordersUrl || storeUrl;
    const body = [
        paragraph(t("order.greeting", { name: firstName })),
        paragraph(t("order.text", { number: order.number })),
        sectionTitle(t("order.items")),
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${items}</table>`,
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;border-top:1px solid ${COLORS.line};">${totals}</table>`,
        sectionTitle(t("order.delivery")),
        paragraph(addressHtml),
        sectionTitle(t("order.payment")),
        paragraph(t(`payment.${order.payment}`)),
        button(t(ordersUrl ? "order.buttonAccount" : "order.buttonGuest"), buttonUrl),
        paragraph(t("order.note"), { muted: true, small: true })
    ].join("");

    const subject = plain(t("order.subject", { number: order.number }));

    return {
        subject,
        html: layout({
            lang, t,
            title: t("order.title"),
            preheader: t("order.preheader", { number: order.number, total: money(order.total) }),
            body
        }),
        text: [
            plain(t("order.greeting", { name: firstName })),
            plain(t("order.text", { number: order.number })),
            "",
            ...order.items.map(item => `${item.quantity}x ${item.name} — ${money(item.unitPrice * item.quantity)}`),
            `${plain(t("order.total"))}: ${money(order.total)}`,
            "",
            buttonUrl
        ].join("\n")
    };
}


/* ---------- Status do pedido mudou (painel administrativo) ---------- */

export function orderStatusEmail({ lang, order, ordersUrl, storeUrl }) {
    const t = translator(lang);
    const money = value => formatMoney(value, lang);
    const firstName = order.customer.name.split(" ")[0];
    const key = `status.${order.status}`;
    const { address } = order;

    const items = order.items.map(item => row(
        `${escapeHtml(item.quantity)}&times; ${escapeHtml(item.name)}`,
        money(item.unitPrice * item.quantity)
    )).join("");

    const addressHtml = [
        escapeHtml(order.customer.name),
        `${escapeHtml(address.street)}, ${escapeHtml(address.number)}${address.complement ? ` — ${escapeHtml(address.complement)}` : ""}`,
        `${escapeHtml(address.city)} — ${escapeHtml(address.state)}`
    ].join("<br>");

    const buttonUrl = ordersUrl || storeUrl;

    const body = [
        paragraph(t("status.greeting", { name: firstName })),
        paragraph(t(`${key}.text`, { number: order.number })),
        sectionTitle(t("order.items")),
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${items}${row(t("order.total"), money(order.total), { strong: true })}</table>`,
        order.status === "cancelled" ? "" : sectionTitle(t("order.delivery")) + paragraph(addressHtml),
        button(t(ordersUrl ? "order.buttonAccount" : "order.buttonGuest"), buttonUrl)
    ].join("");

    return {
        subject: plain(t(`${key}.subject`, { number: order.number })),
        html: layout({
            lang, t,
            title: t(`${key}.title`),
            preheader: t(`${key}.text`, { number: order.number }),
            body
        }),
        text: [
            plain(t("status.greeting", { name: firstName })),
            plain(t(`${key}.text`, { number: order.number })),
            "",
            buttonUrl
        ].join("\n")
    };
}
