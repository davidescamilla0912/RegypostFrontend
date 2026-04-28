import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import reservaService from '../services/reservaService';
import clienteService from '../services/clienteService';
import habitacionService from '../services/habitacionService';
import consumoService from '../services/consumoService';
import { AppButton, PageHeader } from '../components/ui';
import '../components/ui/ui.css';

// ─── helpers ─────────────────────────────────────────────────────────────────

const normalizarEstado = (e) => String(e || '').trim().toLowerCase();

const fromApiEstado = (estadoApi) => {
    const e = normalizarEstado(estadoApi);
    if (e === 'checkin')  return 'check-in';
    if (e === 'checkout') return 'check-out';
    return e;
};

const toApiEstado = (estadoUI) => {
    const e = normalizarEstado(estadoUI);
    if (e === 'check-in')  return 'checkin';
    if (e === 'check-out') return 'checkout';
    return e;
};

const toCurrency = (value) =>
    `$${new Intl.NumberFormat('es-CO').format(Number(value) || 0)}`;

const getValue = (obj, ...keys) => {
    const key = keys.find((k) => obj?.[k] !== undefined && obj?.[k] !== null && obj?.[k] !== '');
    return key ? obj[key] : '-';
};

const calcularNoches = (entrada, salida) => {
    if (!entrada || !salida || entrada === '-' || salida === '-') return 0;
    const a = new Date(`${entrada}T00:00:00`);
    const b = new Date(`${salida}T00:00:00`);
    const diff = b - a;
    if (Number.isNaN(diff) || diff <= 0) return 0;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

const colorEstadoBadge = {
    'check-in':  { bg: '#27ae60', text: '#fff' },
    'check-out': { bg: '#c0392b', text: '#fff' },
    pendiente:   { bg: '#f39c12', text: '#fff' },
    confirmada:  { bg: '#2980b9', text: '#fff' },
    cancelada:   { bg: '#7f8c8d', text: '#fff' },
};

// ─── component ───────────────────────────────────────────────────────────────

function CheckOut() {
    const navigate  = useNavigate();
    const location  = useLocation();

    // listas base
    const [reservasCheckin,  setReservasCheckin]  = useState([]);
    const [reservasCheckout, setReservasCheckout] = useState([]);
    const [clientes,         setClientes]         = useState([]);
    const [habitaciones,     setHabitaciones]     = useState([]);

    // consumos cacheados por reserva_id
    const [consumosPorReserva, setConsumosPorReserva] = useState({});

    // UI state
    const [loading,          setLoading]          = useState(true);
    const [error,            setError]            = useState('');
    const [procesando,       setProcesando]        = useState(null); // id de reserva en proceso
    const [expandida,        setExpandida]         = useState(null); // id de reserva con detalle abierto
    const [busqueda,         setBusqueda]          = useState('');
    const [tabActiva,        setTabActiva]         = useState('checkin'); // 'checkin' | 'checkout'

    // Si viene desde Reservas con un reservaId en location.state, expandir esa tarjeta
    const reservaIdDesdeNav = location.state?.reservaId || null;

    // ── carga inicial ─────────────────────────────────────────────────────────

    useEffect(() => {
        cargarTodo();
    }, []);

    useEffect(() => {
        if (reservaIdDesdeNav) {
            setExpandida(reservaIdDesdeNav);
            setTabActiva('checkin');
        }
    }, [reservaIdDesdeNav]);

    const normalizarLista = (res) =>
        Array.isArray(res?.data)
            ? res.data
            : Array.isArray(res?.data?.data)
                ? res.data.data
                : [];

    const cargarTodo = async () => {
        try {
            setLoading(true);
            setError('');

            const [resCheckin, resCheckout, resClientes, resHabitaciones] = await Promise.all([
                reservaService.getByEstado('checkin'),
                reservaService.getByEstado('checkout'),
                clienteService.getAll(),
                habitacionService.getAll(),
            ]);

            const checkins  = normalizarLista(resCheckin);
            const checkouts = normalizarLista(resCheckout);

            // Para cada reserva en checkin, traer también sus habitaciones
            const checkinConDetalle = await Promise.all(
                checkins.map(async (r) => {
                    try {
                        const dRes = await reservaService.getHabitaciones(r.id);
                        const detalle = normalizarLista(dRes);
                        return { ...r, estado: fromApiEstado(r.estado), reserva_habitaciones: detalle };
                    } catch {
                        return { ...r, estado: fromApiEstado(r.estado), reserva_habitaciones: [] };
                    }
                })
            );

            const checkoutConDetalle = await Promise.all(
                checkouts.map(async (r) => {
                    try {
                        const dRes = await reservaService.getHabitaciones(r.id);
                        const detalle = normalizarLista(dRes);
                        return { ...r, estado: fromApiEstado(r.estado), reserva_habitaciones: detalle };
                    } catch {
                        return { ...r, estado: fromApiEstado(r.estado), reserva_habitaciones: [] };
                    }
                })
            );

            setReservasCheckin(checkinConDetalle);
            setReservasCheckout(checkoutConDetalle.sort((a, b) => {
                const fa = new Date(a.fecha_salida || a.fecha_entrada || 0);
                const fb = new Date(b.fecha_salida || b.fecha_entrada || 0);
                return fb - fa;
            }));
            setClientes(normalizarLista(resClientes));
            setHabitaciones(normalizarLista(resHabitaciones));
        } catch (err) {
            console.error('Error cargando datos de checkout', err);
            setError('No se pudieron cargar las reservas.');
        } finally {
            setLoading(false);
        }
    };

    // ── cargar consumos de una reserva (lazy, se cachean) ────────────────────

    const cargarConsumos = async (reservaId) => {
        if (consumosPorReserva[reservaId] !== undefined) return; // ya cargados
        try {
            const res = await consumoService.getByReserva(reservaId);
            const lista = normalizarLista(res);
            setConsumosPorReserva((prev) => ({ ...prev, [reservaId]: lista }));
        } catch {
            setConsumosPorReserva((prev) => ({ ...prev, [reservaId]: [] }));
        }
    };

    // ── toggle detalle ────────────────────────────────────────────────────────

    const toggleDetalle = async (reservaId) => {
        if (expandida === reservaId) {
            setExpandida(null);
        } else {
            setExpandida(reservaId);
            await cargarConsumos(reservaId);
        }
    };

    // ── hacer checkout ────────────────────────────────────────────────────────

    const hacerCheckout = async (reserva) => {
        if (!reserva?.id) return;
        if (!window.confirm(`¿Confirmar check-out de la reserva #${reserva.id}?`)) return;

        setProcesando(reserva.id);
        setError('');

        try {
            // 1. Cambiar estado de reserva a checkout
            await reservaService.updateEstado(reserva.id, 'checkout');

            // 2. Cambiar habitación(es) a mantenimiento
            const detalle = reserva.reserva_habitaciones || [];
            await Promise.all(
                detalle.map((rh) => {
                    const habId = rh.habitacion_id || rh.habitacion?.id;
                    if (!habId) return Promise.resolve();
                    return habitacionService.updateEstado(habId, 'mantenimiento').catch((e) =>
                        console.warn(`No se pudo actualizar hab ${habId}`, e)
                    );
                })
            );

            // 3. Recargar listas
            await cargarTodo();
            setExpandida(null);
        } catch (err) {
            console.error('Error haciendo checkout', err);
            const msg = err?.response?.data?.message || err?.response?.data?.error;
            setError(msg || 'No se pudo completar el check-out.');
        } finally {
            setProcesando(null);
        }
    };

    // ── enviar a Caja ─────────────────────────────────────────────────────────

    const irACaja = async (reserva) => {
        if (!reserva?.id) return;

        // Asegurarse de tener consumos cargados
        await cargarConsumos(reserva.id);
        const consumos = consumosPorReserva[reserva.id] || [];

        const clienteId   = getValue(reserva, 'cliente_id');
        const cliente     = clientes.find((c) => String(c.id) === String(clienteId));
        const detalle     = reserva.reserva_habitaciones?.[0] || {};
        const habitacionId = detalle.habitacion_id || detalle.habitacion?.id;
        const habitacion   = habitaciones.find((h) => String(h.id) === String(habitacionId));

        const noches       = calcularNoches(
            getValue(reserva, 'fecha_entrada', 'check_in'),
            getValue(reserva, 'fecha_salida',  'check_out')
        );
        const precioNoche  = Number(detalle.precio_noche) || 0;
        const totalReserva = Number(getValue(reserva, 'total', 'valor_total')) || noches * precioNoche;
        const anticipo     = Number(getValue(reserva, 'anticipo')) || 0;
        const totalConsumos = consumos.reduce((sum, c) => sum + Number(c.total || 0), 0);
        const saldoPendiente = Math.max(totalReserva - anticipo, 0);
        const totalFinal     = saldoPendiente + totalConsumos;

        // Obtener empleado de sesión
        let empleadoNombre = '';
        let empleadoId     = null;
        try {
            const emp = JSON.parse(localStorage.getItem('empleado') || '{}');
            empleadoNombre = `${emp.nombre || ''} ${emp.apellido || ''}`.trim();
            empleadoId     = emp.id || null;
        } catch { /* silencioso */ }

        navigate('/caja', {
            state: {
                reserva: {
                    id:           reserva.id,
                    estado:       reserva.estado,
                    fecha_entrada: getValue(reserva, 'fecha_entrada', 'check_in'),
                    fecha_salida:  getValue(reserva, 'fecha_salida',  'check_out'),
                },
                habitacion: {
                    id:         habitacionId,
                    numero:     detalle.numero      || habitacion?.numero,
                    tipo_nombre: detalle.tipo_nombre || habitacion?.tipo_nombre,
                    piso:       detalle.piso         || habitacion?.piso,
                },
                cliente: {
                    id:       cliente?.id,
                    nombre:   cliente ? `${cliente.nombre || ''} ${cliente.apellido || ''}`.trim() : `ID ${clienteId}`,
                    documento: cliente?.numero_documento || '-',
                },
                consumos,
                empleado:    empleadoNombre,
                empleado_id: empleadoId,
                resumenPago: {
                    totalReserva,
                    totalConsumos,
                    anticipo,
                    saldoPendiente,
                    totalFinal,
                },
            },
        });
    };

    // ── helpers de display ────────────────────────────────────────────────────

    const getClienteNombre = (reserva) => {
        // El backend ya devuelve cliente_nombre en el JOIN
        if (reserva.cliente_nombre) return reserva.cliente_nombre;
        const clienteId = getValue(reserva, 'cliente_id');
        const cliente   = clientes.find((c) => String(c.id) === String(clienteId));
        if (!cliente) return clienteId !== '-' ? `ID ${clienteId}` : '-';
        return `${cliente.nombre || ''} ${cliente.apellido || ''}`.trim();
    };

    const getClienteDocumento = (reserva) => {
        if (reserva.numero_documento) return reserva.numero_documento;
        const clienteId = getValue(reserva, 'cliente_id');
        const cliente   = clientes.find((c) => String(c.id) === String(clienteId));
        return cliente?.numero_documento || '-';
    };

    const getHabitacionInfo = (reserva) => {
        const detalle    = reserva.reserva_habitaciones?.[0] || {};
        const habitacionId = detalle.habitacion_id || detalle.habitacion?.id;
        const numero     = detalle.numero || detalle.habitacion?.numero
            || habitaciones.find((h) => String(h.id) === String(habitacionId))?.numero
            || habitacionId || '-';
        const tipo       = detalle.tipo_nombre || '-';
        const piso       = detalle.piso || detalle.habitacion?.piso || '-';
        return { habitacionId, numero, tipo, piso };
    };

    const getDiasEnHotel = (reserva) => {
        const entrada = getValue(reserva, 'fecha_entrada', 'check_in');
        const hoy     = new Date().toISOString().slice(0, 10);
        return calcularNoches(entrada, hoy);
    };

    // ── filtro búsqueda ───────────────────────────────────────────────────────

    const normTexto = (t) => String(t || '').toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

    const filtrar = (lista) => {
        const q = normTexto(busqueda);
        if (!q) return lista;
        return lista.filter((r) => {
            const nombre = normTexto(getClienteNombre(r));
            const doc    = normTexto(getClienteDocumento(r));
            const hab    = normTexto(getHabitacionInfo(r).numero);
            const id     = normTexto(String(r.id || ''));
            return nombre.includes(q) || doc.includes(q) || hab.includes(q) || id.includes(q);
        });
    };

    const checkinsFiltrados  = useMemo(() => filtrar(reservasCheckin),  [busqueda, reservasCheckin,  clientes]);
    const checkoutsFiltrados = useMemo(() => filtrar(reservasCheckout), [busqueda, reservasCheckout, clientes]);

    // ─────────────────────────────────────────────────────────────────────────
    // RENDER
    // ─────────────────────────────────────────────────────────────────────────

    return (
        <div className="page-container">
            <PageHeader
                title="Check-Out"
                onBack={() => navigate('/dashboard')}
                backLabel="← Volver"
            />

            {/* ── Tabs ── */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', borderBottom: '2px solid var(--border-color, #e5e7eb)', paddingBottom: '0' }}>
                {[
                    { key: 'checkin',  label: `Huéspedes activos (${reservasCheckin.length})` },
                    { key: 'checkout', label: `Historial checkout (${reservasCheckout.length})` },
                ].map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setTabActiva(tab.key)}
                        style={{
                            padding: '8px 20px',
                            border: 'none',
                            borderBottom: tabActiva === tab.key ? '3px solid #2980b9' : '3px solid transparent',
                            background: 'transparent',
                            fontWeight: tabActiva === tab.key ? 700 : 400,
                            color:      tabActiva === tab.key ? '#2980b9' : 'inherit',
                            cursor: 'pointer',
                            fontSize: '14px',
                            marginBottom: '-2px',
                        }}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* ── Barra de búsqueda ── */}
            <div className="toolbar" style={{ marginBottom: '16px' }}>
                <input
                    className="input-base"
                    type="text"
                    placeholder="Buscar por nombre, documento, habitación o # reserva"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                />
                {busqueda && (
                    <AppButton variant="secondary" onClick={() => setBusqueda('')}>
                        Limpiar
                    </AppButton>
                )}
            </div>

            {error && <p className="error-text" style={{ marginBottom: '12px' }}>{error}</p>}

            {loading ? (
                <p className="page-loading">Cargando reservas...</p>
            ) : (
                <>
                    {/* ══════════════════════════════════════════════════════
                        TAB: HUÉSPEDES ACTIVOS (checkin)
                    ══════════════════════════════════════════════════════ */}
                    {tabActiva === 'checkin' && (
                        <div>
                            {checkinsFiltrados.length === 0 ? (
                                <div className="panel" style={{ textAlign: 'center', padding: '40px', color: '#7f8c8d' }}>
                                    {busqueda ? 'No se encontraron resultados.' : 'No hay huéspedes con check-in activo.'}
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {checkinsFiltrados.map((reserva) => {
                                        const { habitacionId, numero, tipo, piso } = getHabitacionInfo(reserva);
                                        const clienteNombre   = getClienteNombre(reserva);
                                        const clienteDoc      = getClienteDocumento(reserva);
                                        const fechaEntrada    = getValue(reserva, 'fecha_entrada', 'check_in');
                                        const fechaSalida     = getValue(reserva, 'fecha_salida',  'check_out');
                                        const noches          = calcularNoches(fechaEntrada, fechaSalida);
                                        const diasEnHotel     = getDiasEnHotel(reserva);
                                        const anticipo        = Number(getValue(reserva, 'anticipo')) || 0;
                                        const total           = Number(getValue(reserva, 'total', 'valor_total')) || 0;
                                        const saldo           = Number(getValue(reserva, 'saldo_pendiente')) || Math.max(total - anticipo, 0);
                                        const abierta         = expandida === reserva.id;
                                        const consumos        = consumosPorReserva[reserva.id] || [];
                                        const totalConsumos   = consumos.reduce((s, c) => s + Number(c.total || 0), 0);
                                        const enProceso       = procesando === reserva.id;
                                        const estadoColor     = colorEstadoBadge['check-in'];

                                        return (
                                            <div
                                                key={reserva.id}
                                                className="panel"
                                                style={{
                                                    border: abierta ? '1px solid #2980b9' : '1px solid transparent',
                                                    transition: 'border-color 0.2s',
                                                }}
                                            >
                                                {/* ── Fila resumen ── */}
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>

                                                    {/* Badge estado */}
                                                    <span style={{
                                                        padding: '3px 10px', borderRadius: '12px', fontSize: '11px',
                                                        fontWeight: 700, backgroundColor: estadoColor.bg,
                                                        color: estadoColor.text, whiteSpace: 'nowrap',
                                                    }}>
                                                        CHECK-IN
                                                    </span>

                                                    {/* Habitación */}
                                                    <span style={{ fontWeight: 700, fontSize: '15px', minWidth: '60px' }}>
                                                        Hab. {numero}
                                                    </span>

                                                    {/* Cliente */}
                                                    <span style={{ flex: 1, minWidth: '160px' }}>
                                                        <strong>{clienteNombre}</strong>
                                                        <span style={{ color: '#7f8c8d', marginLeft: '6px', fontSize: '13px' }}>
                                                            {clienteDoc}
                                                        </span>
                                                    </span>

                                                    {/* Fechas */}
                                                    <span style={{ fontSize: '13px', color: '#555', whiteSpace: 'nowrap' }}>
                                                        {fechaEntrada} → {fechaSalida}
                                                        <span style={{ marginLeft: '6px', color: '#7f8c8d' }}>
                                                            ({noches} noche{noches !== 1 ? 's' : ''})
                                                        </span>
                                                    </span>

                                                    {/* Días en hotel */}
                                                    <span style={{
                                                        fontSize: '12px', padding: '2px 8px', borderRadius: '8px',
                                                        backgroundColor: diasEnHotel > noches ? '#fdecea' : '#eafaf1',
                                                        color: diasEnHotel > noches ? '#c0392b' : '#27ae60',
                                                        fontWeight: 600, whiteSpace: 'nowrap',
                                                    }}>
                                                        {diasEnHotel} día{diasEnHotel !== 1 ? 's' : ''} en hotel
                                                        {diasEnHotel > noches ? ' ⚠ vencida' : ''}
                                                    </span>

                                                    {/* Total */}
                                                    <span style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
                                                        {toCurrency(total)}
                                                    </span>

                                                    {/* Botones */}
                                                    <div style={{ display: 'flex', gap: '6px', marginLeft: 'auto' }}>
                                                        <AppButton
                                                            size="sm"
                                                            variant="secondary"
                                                            onClick={() => toggleDetalle(reserva.id)}
                                                        >
                                                            {abierta ? 'Ocultar' : 'Ver detalle'}
                                                        </AppButton>
                                                        <AppButton
                                                            size="sm"
                                                            variant="info"
                                                            onClick={() => irACaja(reserva)}
                                                            disabled={enProceso}
                                                        >
                                                            💳 Ir a Caja
                                                        </AppButton>
                                                        <AppButton
                                                            size="sm"
                                                            style={{ backgroundColor: '#c0392b', color: '#fff' }}
                                                            onClick={() => hacerCheckout(reserva)}
                                                            disabled={enProceso}
                                                        >
                                                            {enProceso ? 'Procesando...' : '→ Check-out'}
                                                        </AppButton>
                                                    </div>
                                                </div>

                                                {/* ── Panel detalle expandido ── */}
                                                {abierta && (
                                                    <div style={{ marginTop: '16px', borderTop: '1px solid #e5e7eb', paddingTop: '16px' }}>
                                                        <div className="form-grid form-grid--3" style={{ marginBottom: '16px' }}>
                                                            <div>
                                                                <p style={{ margin: 0, fontSize: '12px', color: '#7f8c8d' }}>Cliente</p>
                                                                <p style={{ margin: 0, fontWeight: 600 }}>{clienteNombre}</p>
                                                                <p style={{ margin: 0, fontSize: '13px' }}>{clienteDoc}</p>
                                                                {reserva.telefono && (
                                                                    <p style={{ margin: 0, fontSize: '13px', color: '#555' }}>📞 {reserva.telefono}</p>
                                                                )}
                                                            </div>
                                                            <div>
                                                                <p style={{ margin: 0, fontSize: '12px', color: '#7f8c8d' }}>Habitación</p>
                                                                <p style={{ margin: 0, fontWeight: 600 }}>Hab. {numero} — {tipo}</p>
                                                                <p style={{ margin: 0, fontSize: '13px' }}>Piso {piso}</p>
                                                            </div>
                                                            <div>
                                                                <p style={{ margin: 0, fontSize: '12px', color: '#7f8c8d' }}>Huéspedes</p>
                                                                <p style={{ margin: 0, fontWeight: 600 }}>
                                                                    {Number(getValue(reserva, 'num_adultos')) || 0} adultos
                                                                    {' · '}
                                                                    {Number(getValue(reserva, 'num_ninos')) || 0} niños
                                                                </p>
                                                            </div>
                                                            <div>
                                                                <p style={{ margin: 0, fontSize: '12px', color: '#7f8c8d' }}>Check-in</p>
                                                                <p style={{ margin: 0, fontWeight: 600 }}>{fechaEntrada}</p>
                                                            </div>
                                                            <div>
                                                                <p style={{ margin: 0, fontSize: '12px', color: '#7f8c8d' }}>Check-out previsto</p>
                                                                <p style={{ margin: 0, fontWeight: 600 }}>{fechaSalida}</p>
                                                            </div>
                                                            <div>
                                                                <p style={{ margin: 0, fontSize: '12px', color: '#7f8c8d' }}>Reserva #</p>
                                                                <p style={{ margin: 0, fontWeight: 600 }}>#{reserva.id}</p>
                                                                {reserva.observaciones && reserva.observaciones !== '-' && (
                                                                    <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#555' }}>
                                                                        {reserva.observaciones}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Resumen financiero */}
                                                        <div className="preview-box">
                                                            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                                                                <span>Total reserva: <strong>{toCurrency(total)}</strong></span>
                                                                <span>Anticipo: <strong>{toCurrency(anticipo)}</strong></span>
                                                                <span>Saldo pendiente: <strong>{toCurrency(saldo)}</strong></span>
                                                                <span>Consumos: <strong>{toCurrency(totalConsumos)}</strong></span>
                                                                <span style={{ color: '#c0392b' }}>
                                                                    Total a cobrar: <strong>{toCurrency(saldo + totalConsumos)}</strong>
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* Consumos */}
                                                        {consumos.length > 0 ? (
                                                            <div style={{ marginTop: '12px' }}>
                                                                <p style={{ margin: '0 0 6px', fontSize: '13px', fontWeight: 600 }}>
                                                                    Consumos cargados ({consumos.length}):
                                                                </p>
                                                                <div className="table-shell">
                                                                    <table className="table-base">
                                                                        <thead>
                                                                            <tr>
                                                                                <th>Tipo</th>
                                                                                <th>Descripción</th>
                                                                                <th>Cant.</th>
                                                                                <th>P. unitario</th>
                                                                                <th>Total</th>
                                                                                <th>Fecha</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody>
                                                                            {consumos.map((c) => (
                                                                                <tr key={c.id}>
                                                                                    <td>{c.tipo_nombre || '-'}</td>
                                                                                    <td>{c.descripcion || '-'}</td>
                                                                                    <td>{c.cantidad || 1}</td>
                                                                                    <td>{toCurrency(c.precio_unitario)}</td>
                                                                                    <td><strong>{toCurrency(c.total)}</strong></td>
                                                                                    <td>{c.fecha || '-'}</td>
                                                                                </tr>
                                                                            ))}
                                                                        </tbody>
                                                                    </table>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <p style={{ margin: '12px 0 0', fontSize: '13px', color: '#7f8c8d' }}>
                                                                Sin consumos cargados. Puedes agregarlos desde la página de Habitaciones.
                                                            </p>
                                                        )}

                                                        {/* Acciones detalle */}
                                                        <div className="form-actions" style={{ justifyContent: 'flex-end', marginTop: '16px' }}>
                                                            <AppButton
                                                                variant="secondary"
                                                                onClick={() => navigate('/habitaciones', {
                                                                    state: {
                                                                        habitacionId,
                                                                        filtroEstado: 'ocupada',
                                                                        abrirModal: true,
                                                                        reservaId: reserva.id
                                                                    }
                                                                })}
                                                            >
                                                                Ir a Habitaciones
                                                            </AppButton>
                                                            <AppButton
                                                                variant="info"
                                                                onClick={() => irACaja(reserva)}
                                                                disabled={enProceso}
                                                            >
                                                                💳 Ir a Caja con consumos
                                                            </AppButton>
                                                            <AppButton
                                                                style={{ backgroundColor: '#c0392b', color: '#fff' }}
                                                                onClick={() => hacerCheckout(reserva)}
                                                                disabled={enProceso}
                                                            >
                                                                {enProceso ? 'Procesando...' : '→ Confirmar Check-out'}
                                                            </AppButton>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
            )}
                        </div>
                    )}

                    {/* ══════════════════════════════════════════════════════
                        TAB: HISTORIAL CHECKOUT
                    ══════════════════════════════════════════════════════ */}
                    {tabActiva === 'checkout' && (
                        <div>
                            {checkoutsFiltrados.length === 0 ? (
                                <div className="panel" style={{ textAlign: 'center', padding: '40px', color: '#7f8c8d' }}>
                                    {busqueda ? 'No se encontraron resultados.' : 'No hay reservas en historial de check-out todavía.'}
                                </div>
                            ) : (
                                <div className="table-shell">
                                    <table className="table-base">
                                        <thead>
                                            <tr>
                                                <th># Reserva</th>
                                                <th>Cliente</th>
                                                <th>Documento</th>
                                                <th>Habitación</th>
                                                <th>Check-in</th>
                                                <th>Check-out</th>
                                                <th>Noches</th>
                                                <th>Adultos</th>
                                                <th>Niños</th>
                                                <th>Total</th>
                                                <th>Anticipo</th>
                                                <th>Saldo</th>
                                                <th>Estado</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {checkoutsFiltrados.map((r, idx) => {
                                                const { numero } = getHabitacionInfo(r);
                                                const fechaEntrada = getValue(r, 'fecha_entrada', 'check_in');
                                                const fechaSalida  = getValue(r, 'fecha_salida',  'check_out');
                                                const noches       = calcularNoches(fechaEntrada, fechaSalida);
                                                const total        = Number(getValue(r, 'total', 'valor_total')) || 0;
                                                const anticipo     = Number(getValue(r, 'anticipo')) || 0;
                                                const saldo        = Number(getValue(r, 'saldo_pendiente')) || Math.max(total - anticipo, 0);
                                                const estadoColor  = colorEstadoBadge['check-out'];

                                                return (
                                                    <tr key={r.id || idx}>
                                                        <td>#{r.id}</td>
                                                        <td>{getClienteNombre(r)}</td>
                                                        <td>{getClienteDocumento(r)}</td>
                                                        <td>Hab. {numero}</td>
                                                        <td>{fechaEntrada}</td>
                                                        <td>{fechaSalida}</td>
                                                        <td>{noches || '-'}</td>
                                                        <td>{Number(getValue(r, 'num_adultos')) || 0}</td>
                                                        <td>{Number(getValue(r, 'num_ninos')) || 0}</td>
                                                        <td>{toCurrency(total)}</td>
                                                        <td>{toCurrency(anticipo)}</td>
                                                        <td>{toCurrency(saldo)}</td>
                                                        <td>
                                                            <span style={{
                                                                padding: '2px 10px', borderRadius: '12px',
                                                                fontSize: '11px', fontWeight: 700,
                                                                backgroundColor: estadoColor.bg,
                                                                color: estadoColor.text,
                                                            }}>
                                                                CHECK-OUT
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

export default CheckOut;
