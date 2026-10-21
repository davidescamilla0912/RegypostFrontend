/**
 * Helpers de la respuesta HTTP.
 *
 * El backend unifico el sobre (§3.1): toda respuesta es
 *   coleccion  -> { data: [...], total: N }
 *   individual -> { data: {...} }
 *   error      -> { error: "texto", codigo: "CODIGO_ESTABLE" }
 */

/** Devuelve siempre un array, aunque la respuesta venga vacia o malformada. */
export const normalizarLista = (res) => (Array.isArray(res?.data?.data) ? res.data.data : []);

/** Devuelve el recurso individual, o null. */
export const normalizarObjeto = (res) => res?.data?.data ?? null;

/** Texto de error legible. El backend siempre usa la clave `error` (§3.2). */
export const mensajeDeError = (err, porDefecto = 'Ocurrio un error inesperado.') =>
    err?.response?.data?.error || porDefecto;

/**
 * Codigo estable del error, para reaccionar distinto segun el motivo.
 * Ver la tabla completa en ESPECIFICACION_BACKEND.md §3.2.
 */
export const codigoDeError = (err) => err?.response?.data?.codigo || null;

/** Cuerpo completo del error: algunos codigos traen datos extra. */
export const datosDeError = (err) => err?.response?.data || {};

export const CODIGO = {
    SALDO_PENDIENTE: 'SALDO_PENDIENTE',
    ABONO_EXCEDE_SALDO: 'ABONO_EXCEDE_SALDO',
    RESERVA_SALDADA: 'RESERVA_SALDADA',
    SOLAPAMIENTO_FECHAS: 'SOLAPAMIENTO_FECHAS',
    TRANSICION_INVALIDA: 'TRANSICION_INVALIDA',
    CANCELACION_REQUIERE_MOTIVO: 'CANCELACION_REQUIERE_MOTIVO',
    STOCK_INSUFICIENTE: 'STOCK_INSUFICIENTE',
    PRODUCTO_SIN_TIPO_CONSUMO: 'PRODUCTO_SIN_TIPO_CONSUMO',
    CONSUMO_YA_COBRADO: 'CONSUMO_YA_COBRADO',
    PRECIO_FUERA_DE_RANGO: 'PRECIO_FUERA_DE_RANGO',
    PERMISO_DENEGADO: 'PERMISO_DENEGADO',
    FECHA_FUTURA: 'FECHA_FUTURA',
    HABITACION_OCUPADA: 'HABITACION_OCUPADA',
};
