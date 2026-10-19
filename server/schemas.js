/* =========================
   VALIDAÇÃO DOS DADOS RECEBIDOS (zod)

   Nada que vem do navegador é confiável: cada rota valida
   o corpo da requisição com um destes esquemas antes de
   tocar no banco. As mensagens aparecem no formulário.

   As mensagens são CHAVES de lib/i18n.js: o texto em
   português ou inglês é escolhido em middleware/validate.js.
========================= */

import { z } from "zod";

const onlyDigits = value => value.replace(/\D/g, "");

const name = z.string()
    .trim()
    .min(1, "validation.name")
    .max(120, "validation.nameTooLong")
    .refine(value => value.split(/\s+/).length >= 2, "validation.fullName");

const email = z.string()
    .trim()
    .toLowerCase()
    .max(254, "validation.emailTooLong")
    .pipe(z.email("validation.email"));

const phone = z.string()
    .transform(onlyDigits)
    .refine(value => value.length >= 10 && value.length <= 11, "validation.phone");

const password = z.string()
    .min(8, "validation.passwordLength")
    .max(72, "validation.passwordMax") // limite do bcrypt
    .refine(value => /[A-Za-z]/.test(value) && /\d/.test(value), "validation.passwordMix");

const requiredText = (message, max = 160) =>
    z.string().trim().min(1, message).max(max, "validation.textTooLong");


/* ---------- Autenticação ---------- */

export const registerSchema = z.object({
    name,
    email,
    password
});

export const loginSchema = z.object({
    email,
    password: z.string().min(1, "validation.password")
});


/* ---------- Recuperação de senha ---------- */

export const forgotPasswordSchema = z.object({
    email
});

export const resetPasswordSchema = z.object({
    // Código do link: 32 bytes aleatórios em base64url (43 caracteres).
    token: z.string().regex(/^[A-Za-z0-9_-]{43}$/, "auth.resetInvalid"),
    password
});


/* ---------- Perfil ---------- */

export const updateProfileSchema = z.object({
    name,
    phone: z.union([phone, z.literal("").transform(() => null)]).nullable().optional()
});

export const changePasswordSchema = z.object({
    currentPassword: z.string().min(1, "validation.currentPassword"),
    newPassword: password
});

// Excluir a conta: pede a senha de novo (alguém com o computador aberto não exclui).
export const deleteAccountSchema = z.object({
    password: z.string("validation.currentPassword").min(1, "validation.currentPassword").max(200, "validation.currentPassword")
});


/* ---------- Pedidos ---------- */

const STATES = [
    "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO",
    "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI",
    "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"
];

export const createOrderSchema = z.object({
    customer: z.object({
        name,
        email,
        phone
    }),

    address: z.object({
        cep: z.string()
            .transform(onlyDigits)
            .refine(value => value.length === 8, "validation.cep"),
        street: requiredText("validation.street"),
        number: requiredText("validation.number", 20),
        complement: z.string().trim().max(120).optional().default(""),
        district: requiredText("validation.district", 120),
        city: requiredText("validation.city", 120),
        state: z.enum(STATES, "validation.state")
    }),

    payment: z.enum(["pix", "card", "boleto"], "validation.payment"),

    items: z.array(
        z.object({
            id: z.number().int().positive(),
            quantity: z.number().int().min(1).max(99)
        })
    ).min(1, "validation.emptyCart").max(50)
});


/* ---------- Sacola e favoritos da conta ---------- */

export const cartSchema = z.object({
    items: z.array(
        z.object({
            id: z.number().int().positive(),
            quantity: z.number().int().min(1).max(99)
        })
    ).max(50)
});

export const favoritesSchema = z.object({
    ids: z.array(z.number().int().positive()).max(50)
});


/* ---------- Painel administrativo ---------- */

export const adminOrdersQuerySchema = z.object({
    status: z.enum([
        "all", "unpaid", "confirmed", "shipped", "delivered", "cancelled"
    ]).default("all"),
    search: z.string().trim().max(120).default(""),
    limit: z.coerce.number().int().min(1).max(50).default(20),
    offset: z.coerce.number().int().min(0).max(100000).default(0)
});

export const adminProductsQuerySchema = z.object({
    status: z.enum(["all", "active", "inactive"]).default("all"),
    search: z.string().trim().max(120).default(""),
    limit: z.coerce.number().int().min(1).max(50).default(20),
    offset: z.coerce.number().int().min(0).max(100000).default(0)
});

export const updateOrderStatusSchema = z.object({
    status: z.enum(["shipped", "delivered", "cancelled"], "admin.invalidStatus")
});

const optionalText = max => z.string().trim().max(max, "validation.textTooLong").default("");

// Especificações: pares [rótulo, valor], ex.: ["Linha", "Future Series"].
const specs = z.array(
    z.tuple([
        z.string().trim().min(1, "admin.specsInvalid").max(40, "admin.specsInvalid"),
        z.string().trim().min(1, "admin.specsInvalid").max(80, "admin.specsInvalid")
    ]),
    "admin.specsInvalid"
).max(12, "admin.specsInvalid").default([]);

const productText = z.object({
    tagline: z.string().trim().min(1, "admin.taglineRequired").max(160, "validation.textTooLong"),
    description: z.string().trim().min(1, "admin.descriptionRequired").max(2000, "validation.textTooLong"),
    concept: optionalText(1000),
    materials: optionalText(1000),
    storyText: optionalText(1000),
    specs
});

// Campos comuns a criar e editar.
const productFields = {
    name: z.string().trim().min(1, "admin.nameRequired").max(120, "validation.textTooLong"),
    series: z.string().trim().min(1, "admin.seriesRequired").max(60, "validation.textTooLong")
        .transform(value => value.toUpperCase()),
    // Frase de marca em inglês, igual nos dois idiomas (ex.: "Precision in motion.").
    subtitle: optionalText(120),
    // Em reais, arredondado para centavos (899.9 → 899.90).
    price: z.number("admin.priceInvalid")
        .min(1, "admin.priceInvalid")
        .max(99999.99, "admin.priceInvalid")
        .transform(value => Math.round(value * 100) / 100),
    // Unidades à venda; null = sem controle de estoque.
    stock: z.number("admin.stockInvalid").int("admin.stockInvalid")
        .min(0, "admin.stockInvalid").max(99999, "admin.stockInvalid")
        .nullable().default(null),
    story: z.object({
        eyebrow: optionalText(60),
        title: optionalText(60),
        highlight: optionalText(60)
    }).default({ eyebrow: "", title: "", highlight: "" }),
    texts: z.object({ pt: productText, en: productText })
};

export const createProductSchema = z.object({
    // Vira o nome da pasta das fotos: só letras, números e hífen.
    code: z.string().trim().toUpperCase()
        .regex(/^[A-Z0-9][A-Z0-9-]{1,9}$/, "admin.codeInvalid"),
    ...productFields
});

export const updateProductSchema = z.object({
    ...productFields,
    isActive: z.boolean(),
    // Galeria na ordem desejada (a primeira é a capa). Ausente = não mexe.
    gallery: z.array(z.object({
        src: z.string().max(200),
        alt: z.object({
            pt: z.string().trim().max(160, "validation.textTooLong"),
            en: z.string().trim().max(160, "validation.textTooLong")
        })
    })).max(8).optional()
});


/* Tradução automática do painel: lista de textos de um idioma para o outro. */
const lang = z.enum(["pt", "en"], "errors.invalidRequest");

export const translateSchema = z.object({
    from: lang,
    to: lang,
    texts: z.array(z.string().max(2000, "translate.tooLong"), "errors.invalidRequest")
        .min(1, "errors.invalidRequest")
        .max(40, "translate.tooLong")
        .refine(texts => texts.join("").length <= 12000, "translate.tooLong")
}).refine(data => data.from !== data.to, "errors.invalidRequest");
