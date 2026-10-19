/* =========================
   DINHEIRO

   Cálculos em centavos (números inteiros) para evitar erros
   de arredondamento como 0.1 + 0.2 = 0.30000000000000004.
========================= */

export const toCents = value => Math.round(Number(value) * 100);

export const fromCents = cents => cents / 100;

/* O PostgreSQL devolve NUMERIC como texto: converte para número. */
export const toNumber = value => (value === null ? null : Number(value));
