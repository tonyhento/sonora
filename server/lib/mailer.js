/* =========================
   ENVIO DE E-MAILS

   - Com SMTP configurado no .env: envia de verdade (Nodemailer).
   - Sem SMTP: salva o e-mail como arquivo .html na pasta
     "outbox/" do projeto e mostra o caminho no terminal.
     Assim dá para testar tudo sem conta em serviço nenhum.
========================= */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import nodemailer from "nodemailer";

import { config } from "../config.js";

const OUTBOX_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "outbox");

let transporter = null;

function getTransporter() {
    if (!transporter) transporter = nodemailer.createTransport(config.email.smtp);
    return transporter;
}

// Nome de arquivo legível: 2026-10-18_16-05-12_pedido-sn-100001.html
function outboxFileName(subject) {
    const stamp = new Date().toISOString().slice(0, 19).replace("T", "_").replace(/:/g, "-");
    const slug = subject
        .normalize("NFD").replace(/[̀-ͯ]/g, "")
        .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
        .slice(0, 50);

    return `${stamp}_${slug}.html`;
}

async function saveToOutbox({ to, subject, html }) {
    await mkdir(OUTBOX_DIR, { recursive: true });

    const file = path.join(OUTBOX_DIR, outboxFileName(subject));

    // Cabeçalho visível só na cópia local, para saber para quem iria.
    const header =
        `<!-- Para: ${to} | Assunto: ${subject} -->\n`;

    await writeFile(file, header + html, "utf8");
    console.log(`[e-mail] Sem SMTP configurado: "${subject}" para ${to} salvo em ${file}`);
}

export async function sendMail({ to, subject, html, text }) {
    if (!config.email.smtp) {
        return saveToOutbox({ to, subject, html });
    }

    await getTransporter().sendMail({ from: config.email.from, to, subject, html, text });
    console.log(`[e-mail] Enviado: "${subject}" para ${to}`);
}

/*
   Envia sem fazer o cliente esperar: a resposta da API não
   depende do e-mail. Uma falha vai para o terminal, não para a tela.
*/
export function sendMailInBackground(buildMessage) {
    Promise.resolve()
        .then(buildMessage)
        .then(message => message && sendMail(message))
        .catch(error => console.error("[e-mail] Falha ao enviar:", error.message));
}
