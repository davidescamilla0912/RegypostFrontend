/**
 * Vocabulario de estados. Fuente unica de verdad.
 *
 * El ENUM real de `reservas.estado` en la base de datos es:
 *   'pendiente' | 'confirmada' | 'checkin' | 'checkout' | 'cancelada'
 *
 * No existe 'llegada prevista' ni 'check-in' con guion. El backend tolera esas
 * variantes en la entrada, pero SIEMPRE devuelve los cinco valores del ENUM,
 * asi que el frontend usa esos cinco y no traduce nada.
 */

export const ESTADO_RESERVA = {
    PENDIENTE: 'pendiente',
    CONFIRMADA: 'confirmada',
    CHECKIN: 'checkin',
    CHECKOUT: 'checkout',
    CANCELADA: 'cancelada'
};

export const ESTADO_HABITACION = {
    DISPONIBLE: 'disponible',
    OCUPADA: 'ocupada',
    RESERVADA: 'reservada',
    MANTENIMIENTO: 'mantenimiento',
    BLOQUEADA: 'bloqueada'
};

export const normalizarEstado = (estado) => String(estado || '').trim().toLowerCase();

const ETIQUETA_RESERVA = {
    [ESTADO_RESERVA.PENDIENTE]: 'PENDIENTE',
    [ESTADO_RESERVA.CONFIRMADA]: 'CONFIRMADA',
    [ESTADO_RESERVA.CHECKIN]: 'CHECK-IN',
    [ESTADO_RESERVA.CHECKOUT]: 'CHECK-OUT',
    [ESTADO_RESERVA.CANCELADA]: 'CANCELADA'
};

export const etiquetaEstado = (estado) =>
    ETIQUETA_RESERVA[normalizarEstado(estado)] || String(estado || '-').toUpperCase();

const COLOR_RESERVA = {
    [ESTADO_RESERVA.PENDIENTE]: '#f39c12',
    [ESTADO_RESERVA.CONFIRMADA]: '#2980b9',
    [ESTADO_RESERVA.CHECKIN]: '#27ae60',
    [ESTADO_RESERVA.CHECKOUT]: '#c0392b',
    [ESTADO_RESERVA.CANCELADA]: '#7f8c8d'
};

export const colorEstado = (estado) => COLOR_RESERVA[normalizarEstado(estado)] || '#7f8c8d';

const COLOR_HABITACION = {
    [ESTADO_HABITACION.DISPONIBLE]: '#2ecc71',
    [ESTADO_HABITACION.OCUPADA]: '#e74c3c',
    [ESTADO_HABITACION.RESERVADA]: '#8e44ad',
    [ESTADO_HABITACION.MANTENIMIENTO]: '#f39c12',
    [ESTADO_HABITACION.BLOQUEADA]: '#95a5a6'
};

export const colorEstadoHabitacion = (estado) => COLOR_HABITACION[normalizarEstado(estado)] || '#95a5a6';

/** Estado de pago que calcula el servidor (§4.1). */
export const ESTADO_PAGO = {
    PENDIENTE: 'pendiente',
    PARCIAL: 'parcial',
    PAGADA: 'pagada'
};

export const estaPagada = (reserva) => normalizarEstado(reserva?.estado_pago) === ESTADO_PAGO.PAGADA;
