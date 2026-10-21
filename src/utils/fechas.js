/**
 * Utilidades de fecha. Fuente unica de verdad.
 *
 * Reemplaza las 3 implementaciones distintas de `calcularNoches` que existian
 * en Reservas.jsx, CheckOut.jsx y ModalHabitacion.jsx, que usaban redondeos
 * distintos (Math.round vs Math.ceil) y parseos distintos (UTC vs local),
 * y por eso mostraban un numero de noches diferente segun la pantalla.
 */

/**
 * Parsea "YYYY-MM-DD" como medianoche LOCAL.
 *
 * `new Date("2026-09-09")` se interpreta como UTC y en Colombia (UTC-5)
 * retrocede al dia anterior. `new Date("2026-09-09T00:00:00")` no.
 */
export const aFechaLocal = (valor) => {
    if (!valor || valor === '-') return null;
    const soloFecha = String(valor).slice(0, 10);
    const fecha = new Date(`${soloFecha}T00:00:00`);
    return Number.isNaN(fecha.getTime()) ? null : fecha;
};

/**
 * Fecha de hoy en formato "YYYY-MM-DD" segun el reloj LOCAL.
 *
 * `new Date().toISOString().slice(0, 10)` devuelve la fecha UTC: entre las
 * 19:00 y medianoche en Colombia adelantaba un dia, lo que corrompia la fecha
 * de los consumos y el contador de "dias en hotel".
 */
export const hoyLocal = () => {
    const d = new Date();
    return [
        d.getFullYear(),
        String(d.getMonth() + 1).padStart(2, '0'),
        String(d.getDate()).padStart(2, '0')
    ].join('-');
};

/** Hora actual "HH:MM" segun el reloj local. */
export const horaLocal = () => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

/**
 * Noches entre dos fechas "YYYY-MM-DD". Devuelve 0 si el rango es invalido.
 *
 * NOTA DE MIGRACION: esto es un calculo de negocio. El backend debe devolver
 * `noches` ya calculado en la reserva; aqui solo deberia quedar como respaldo
 * de presentacion.
 */
export const calcularNoches = (entrada, salida) => {
    const a = aFechaLocal(entrada);
    const b = aFechaLocal(salida);
    if (!a || !b) return 0;
    const diff = b - a;
    if (diff <= 0) return 0;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

/** Formatea una fecha para mostrarla al usuario (es-CO). */
export const formatFecha = (valor) => {
    const fecha = aFechaLocal(valor);
    if (!fecha) return '-';
    return fecha.toLocaleDateString('es-CO');
};

/** Formatea una marca de tiempo completa para mostrarla al usuario. */
export const formatFechaHora = (valor) => {
    if (!valor) return '-';
    const fecha = new Date(valor);
    if (Number.isNaN(fecha.getTime())) return String(valor);
    return new Intl.DateTimeFormat('es-CO', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit'
    }).format(fecha);
};

/**
 * Combina "YYYY-MM-DD" + "HH:MM" en la marca de tiempo que se envia al backend.
 *
 * ⚠️ HALLAZGO F16 - PENDIENTE DE DECISION DEL BACKEND.
 *
 * Hoy devuelve ISO-8601 en UTC. En Colombia (UTC-5) eso significa que un pago
 * registrado a las 20:30 viaja como el dia siguiente a las 01:30. Si el backend
 * guarda esa cadena tal cual en un DATETIME de MySQL, el cuadre de caja del dia
 * queda descuadrado.
 *
 * No se cambia unilateralmente porque, si el backend YA convierte de UTC a hora
 * local al recibir, cambiarlo aqui provocaria un doble desplazamiento. El
 * backend debe decidir el formato y esta funcion se ajusta en un solo sitio.
 *
 * Alternativa local (sin zona horaria): `${fecha} ${hora}:00`
 */
export const aMarcaDeTiempo = (fecha, hora) => new Date(`${fecha}T${hora}:00`).toISOString();
