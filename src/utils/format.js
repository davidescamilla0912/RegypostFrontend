/**
 * Formato de presentacion. Fuente unica de verdad.
 *
 * Reemplaza las 4 copias de `toCurrency` / `formatMoney` y las 3 de
 * `normalizarTexto` repartidas por las paginas.
 *
 * Esto SI pertenece al frontend: es presentacion, no negocio.
 */

/** "$1.850.000" */
export const toCurrency = (valor) => `$${new Intl.NumberFormat('es-CO').format(Number(valor) || 0)}`;

/** Quita acentos y pasa a minusculas, para busquedas tolerantes. */
export const normalizarTexto = (texto) => String(texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();

/** Convierte a numero finito, o 0. */
export const aNumero = (valor) => {
    const n = Number(valor);
    return Number.isFinite(n) ? n : 0;
};
