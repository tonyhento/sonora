/* =========================
   FOTOS DE PRODUTO ENVIADAS PELO PAINEL

   - O tipo do arquivo é descoberto pelos primeiros bytes (a
     "assinatura" do formato), não pelo nome nem pelo que o
     navegador diz: um .exe renomeado para .jpg é recusado.
   - Só JPG, PNG e WebP, até 5 MB.
   - O nome do arquivo é criado pelo servidor (nunca o do usuário),
     dentro da pasta do modelo:
       public/assets/products/<código>/<ordem>-<aleatório>.<ext>

   - Foto tirada da galeria (e salva) é apagada do disco — só as
     enviadas pelo painel; as fotos originais do projeto ficam.

   Atenção para publicar: as fotos ficam no disco do servidor.
   Em hospedagens com disco temporário (ex.: Render gratuito) elas
   somem a cada atualização; lá o certo é um serviço de arquivos
   (Cloudinary, S3...). Veja o README.
========================= */

import crypto from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const PUBLIC_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "public");

/* Assinaturas: JPG começa com FF D8 FF; PNG com 89 50 4E 47; WebP é "RIFF....WEBP". */
export function detectImageType(buffer) {
    if (!Buffer.isBuffer(buffer) || buffer.length < 12) return null;

    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "jpg";
    if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
    if (buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") return "webp";

    return null;
}

/*
   Grava a foto e devolve o caminho público (ex.: "assets/products/x-05/02-3f9a1c.webp").
   O código do produto já foi validado (só letras, números e hífen).
*/
export async function saveProductImage({ code, position, buffer, extension }) {
    const folder = code.toLowerCase();

    if (!/^[a-z0-9-]+$/.test(folder)) throw new Error("Código de produto inválido para pasta.");

    const fileName = `${String(position).padStart(2, "0")}-${crypto.randomBytes(4).toString("hex")}.${extension}`;
    const relative = `assets/products/${folder}/${fileName}`;
    const absolute = path.join(PUBLIC_DIR, "assets", "products", folder, fileName);

    await mkdir(path.dirname(absolute), { recursive: true });
    await writeFile(absolute, buffer, { flag: "wx" }); // nunca sobrescreve

    return relative;
}

/*
   Fotos enviadas pelo painel têm sempre o formato <ordem>-<8 hex>.<ext>.
   As fotos originais do projeto (ex.: 01-three-quarter.jpg) nunca
   casam com este padrão, então nunca são apagadas por aqui.
*/
const UPLOADED_IMAGE = /^assets\/products\/[a-z0-9-]+\/\d{2}-[0-9a-f]{8}\.(jpg|png|webp)$/;

export function isUploadedImage(src) {
    return UPLOADED_IMAGE.test(String(src));
}

/*
   Apaga do disco uma foto enviada pelo painel que saiu da galeria.
   Qualquer outro caminho é ignorado. Retorna true se apagou.
*/
export async function deleteUploadedImage(src) {
    if (!isUploadedImage(src)) return false;

    const productsDir = path.join(PUBLIC_DIR, "assets", "products");
    const absolute = path.resolve(PUBLIC_DIR, src);

    // Defesa extra: o arquivo precisa estar dentro de public/assets/products.
    if (!absolute.startsWith(productsDir + path.sep)) return false;

    try {
        await unlink(absolute);
        return true;
    } catch (error) {
        if (error.code !== "ENOENT") console.error("[fotos] Não foi possível apagar", src, error.message);
        return false;
    }
}
