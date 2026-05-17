import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import reservaService from '../services/reservaService';
import habitacionService from '../services/habitacionService';
import clienteService from '../services/clienteService';
import { AppButton, PageHeader } from '../components/ui';
import '../components/ui/ui.css';

// Solo BLOQUEAN: pendiente, confirmada, check-in
// NO bloquean: llegada prevista, check-out, cancelada
const ESTADOS_QUE_BLOQUEAN = new Set(['pendiente', 'confirmada', 'check-in']);

const normalizarEstado = (estado) => String(estado || '').trim().toLowerCase();

const fromApiEstado = (estadoApi) => {
    const estado = normalizarEstado(estadoApi);
    if (estado === 'checkin') return 'check-in';
    if (estado === 'checkout') return 'check-out';
    if (estado === 'booking') return 'pendiente';
    if (estado === 'llegada prevista') return 'llegada prevista';
    return estado;
};

const initialForm = {
    clienteId: '',
    habitacionId: '',
    checkIn: '',
    checkOut: '',
    valorNoche: '',
    numAdultos: 1,
    numNinos: 0,
    observaciones: ''
};

const calcularNoches = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return 0;
    const fechaEntrada = new Date(checkIn);
    const fechaSalida = new Date(checkOut);
    const diffMs = fechaSalida - fechaEntrada;
    if (Number.isNaN(diffMs) || diffMs <= 0) return 0;
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
};

const toDateSafe = (value) => {
    if (!value || value === '-') return null;
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return null;
    return date;
};

const fechasSeCruzan = (inicioA, finA, inicioB, finB) => inicioA < finB && inicioB < finA;

const getHabitacionIdFromReserva = (reserva) => {
    const detalle = reserva?.reserva_habitaciones?.[0] || reserva?.habitaciones?.[0] || null;
    return Number(
        detalle?.habitacion_id
        || detalle?.habitacion?.id
        || reserva?.habitacion_id
        || reserva?.habitacion
    ) || null;
};

const getFechaEntradaReserva = (reserva) => reserva?.fecha_entrada || reserva?.check_in || reserva?.checkIn || null;
const getFechaSalidaReserva = (reserva) => reserva?.fecha_salida || reserva?.check_out || reserva?.checkOut || null;

const toCurrency = (value) => new Intl.NumberFormat('es-CO').format(Number(value) || 0);

function Reservas() {
    const navigate = useNavigate();
    const [reservas, setReservas] = useState([]);
    const [habitaciones, setHabitaciones] = useState([]);
    const [clientes, setClientes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [confirmando, setConfirmando] = useState(false);
    const [cancelando, setCancelando] = useState(null);
    const [form, setForm] = useState(initialForm);
    const [busqueda, setBusqueda] = useState('');
    const [tabActiva, setTabActiva] = useState('pendiente');
    const [error, setError] = useState('');
    const [avisoCruceFechas, setAvisoCruceFechas] = useState('');
    const [reservaAConfirmar, setReservaAConfirmar] = useState(null);
    const [anticipoConfirmacion, setAnticipoConfirmacion] = useState('');

    useEffect(() => {
        cargarDatos();
    }, []);

    const cargarDatos = async () => {
        await Promise.all([cargarReservas(), cargarHabitaciones(), cargarClientes()]);
    };

    const cargarReservas = async () => {
        try {
            setLoading(true);
            const res = await reservaService.getAll();
            const payload = Array.isArray(res.data)
                ? res.data
                : Array.isArray(res.data?.data)
                    ? res.data.data
                    : [];

            const reservasConDetalle = await Promise.all(
                payload.map(async (reserva) => {
                    if (!reserva?.id) return { ...reserva, estado: fromApiEstado(reserva?.estado) };
                    try {
                        const detalleRes = await reservaService.getHabitaciones(reserva.id);
                        const detalle = Array.isArray(detalleRes.data)
                            ? detalleRes.data
                            : Array.isArray(detalleRes.data?.data)
                                ? detalleRes.data.data
                                : [];
                        return {
                            ...reserva,
                            estado: fromApiEstado(reserva.estado),
                            reserva_habitaciones: detalle
                        };
                    } catch (detailErr) {
                        console.warn(`No se pudo cargar detalle de habitaciones para la reserva ${reserva.id}`, detailErr);
                        return { ...reserva, estado: fromApiEstado(reserva.estado) };
                    }
                })
            );

            setReservas(reservasConDetalle);
        } catch (err) {
            console.error('Error cargando reservas', err);
            setError('No se pudieron cargar las reservas.');
        } finally {
            setLoading(false);
        }
    };

    const cargarHabitaciones = async () => {
        try {
            const res = await habitacionService.getAll();
            const payload = Array.isArray(res.data)
                ? res.data
                : Array.isArray(res.data?.data)
                    ? res.data.data
                    : [];
            setHabitaciones(payload);
        } catch (err) {
            console.error('Error cargando habitaciones', err);
        }
    };

    const cargarClientes = async () => {
        try {
            const res = await clienteService.getAll();
            const payload = Array.isArray(res.data)
                ? res.data
                : Array.isArray(res.data?.data)
                    ? res.data.data
                    : [];
            setClientes(payload);
        } catch (err) {
            console.error('Error cargando clientes', err);
        }
    };

    const valoresCalculados = useMemo(() => {
        const noches = calcularNoches(form.checkIn, form.checkOut);
        const valorNoche = Number(form.valorNoche) || 0;
        const valorTotal = noches * valorNoche;
        return { noches, valorTotal, saldoPendiente: valorTotal };
    }, [form.checkIn, form.checkOut, form.valorNoche]);

    const habitacionesNoDisponibles = useMemo(() => {
        const idsNoDisponibles = new Set();
        const fechaEntradaNueva = toDateSafe(form.checkIn);
        const fechaSalidaNueva = toDateSafe(form.checkOut);
        const tieneRangoFechas = Boolean(fechaEntradaNueva && fechaSalidaNueva && fechaEntradaNueva < fechaSalidaNueva);

        if (!tieneRangoFechas) return idsNoDisponibles;

        reservas.forEach((reserva) => {
            const estado = fromApiEstado(reserva?.estado);
            if (!ESTADOS_QUE_BLOQUEAN.has(estado)) return;

            const habitacionId = getHabitacionIdFromReserva(reserva);
            if (!habitacionId) return;

            const fechaEntradaReserva = toDateSafe(getFechaEntradaReserva(reserva));
            const fechaSalidaReserva = toDateSafe(getFechaSalidaReserva(reserva));
            if (!fechaEntradaReserva || !fechaSalidaReserva || fechaEntradaReserva >= fechaSalidaReserva) return;

            if (fechasSeCruzan(fechaEntradaNueva, fechaSalidaNueva, fechaEntradaReserva, fechaSalidaReserva)) {
                idsNoDisponibles.add(habitacionId);
            }
        });

        return idsNoDisponibles;
    }, [reservas, form.checkIn, form.checkOut]);

    const habitacionesDisponibles = useMemo(() => (
        // Muestra todas las habitaciones excepto las de mantenimiento o bloqueadas.
        habitaciones.filter((h) => {
            const estado = normalizarEstado(h.estado);
            return estado !== 'mantenimiento' && estado !== 'bloqueada';
        })
    ), [habitaciones]);

    useEffect(() => {
        if (!form.habitacionId) {
            setAvisoCruceFechas('');
            return;
        }

        const habitacionCruzaFechas = habitacionesNoDisponibles.has(Number(form.habitacionId));
        setAvisoCruceFechas(
            habitacionCruzaFechas
                ? 'La habitación seleccionada no se puede reservar por cruce de fechas. Elige otra habitación.'
                : ''
        );
    }, [form.habitacionId, habitacionesNoDisponibles]);

    const onChange = (e) => {
        const { name, value } = e.target;
        if (name === 'habitacionId') {
            const habitacionSeleccionada = habitaciones.find((h) => String(h.id) === String(value));
            setForm((prev) => ({
                ...prev,
                habitacionId: value,
                valorNoche: habitacionSeleccionada?.precio_base || prev.valorNoche
            }));
            return;
        }
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const validarFormulario = () => {
    if (!form.clienteId || !form.habitacionId || !form.checkIn || !form.checkOut) {
        setError('Cliente, Habitacion, Check-in y Check-out son obligatorios.');
        return false;
    }
    if (valoresCalculados.noches <= 0) {
        setError('La fecha de Check-out debe ser posterior al Check-in.');
        return false;
    }
    if (habitacionesNoDisponibles.has(Number(form.habitacionId))) {
        setError('La habitación seleccionada no se puede reservar por cruce de fechas.');
        return false;
    }

    // ── NUEVO: bloquear si hay checkin activo vencido en esa habitación ──
    const checkinVencido = reservas.some((r) => {
        const estado = fromApiEstado(r?.estado);
        if (estado !== 'check-in') return false;

        const habId = getHabitacionIdFromReserva(r);
        if (String(habId) !== String(form.habitacionId)) return false;

        const fechaSalida = toDateSafe(getFechaSalidaReserva(r));
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        return fechaSalida && fechaSalida < hoy;
    });

    if (checkinVencido) {
        setError('Esta habitación tiene un huésped con estadía vencida. Completa el Check-Out desde la pantalla CheckOut antes de crear una nueva reserva.');
        return false;
    }
    // ─────────────────────────────────────────────────────────────────────

    const habitacionSeleccionada = habitaciones.find((h) => String(h.id) === String(form.habitacionId));
    const estadoHabitacion = normalizarEstado(habitacionSeleccionada?.estado);
    if (estadoHabitacion === 'mantenimiento' || estadoHabitacion === 'bloqueada') {
        setError('No se puede reservar habitaciones en mantenimiento o bloqueadas.');
        return false;
    }
    return true;
};

    const crearReserva = async (e) => {
        e.preventDefault();
        setError('');
        if (!validarFormulario()) return;

        const clienteId = Number(form.clienteId);
        const habitacionId = Number(form.habitacionId);
        const valorNoche = Number(form.valorNoche) || 0;
        const hoy = new Date().toISOString().slice(0, 10);

        const payload = {
            cliente_id: clienteId,
            habitacion_id: habitacionId,
            habitacion: habitacionId,
            fecha_reserva: hoy,
            fecha_entrada: form.checkIn,
            fecha_salida: form.checkOut,
            check_in: form.checkIn,
            check_out: form.checkOut,
            num_adultos: Number(form.numAdultos) || 1,
            num_ninos: Number(form.numNinos) || 0,
            fuente: 'directa',
            noches: valoresCalculados.noches,
            precio_noche: valorNoche,
            valor_noche: valorNoche,
            total: valoresCalculados.valorTotal,
            valor_total: valoresCalculados.valorTotal,
            anticipo: 0,
            saldo_pendiente: valoresCalculados.saldoPendiente,
            estado: 'pendiente',
            observaciones: form.observaciones
        };

        try {
            setGuardando(true);
            const res = await reservaService.create(payload);
            const creada = res.data?.data || res.data;

            if (creada?.id && habitacionId) {
                try {
                    await reservaService.agregarHabitacion(creada.id, {
                        habitacion_id: habitacionId,
                        precio_noche: valorNoche
                    });
                } catch (linkErr) {
                    console.warn('No se pudo registrar la habitación de la reserva en detalle', linkErr);
                }
            }

            await cargarReservas();
            setForm(initialForm);
        } catch (err) {
            console.error('Error creando reserva', err);
            const backendMessage = err?.response?.data?.message || err?.response?.data?.error || err?.response?.data?.detail;
            setError(backendMessage || 'No se pudo guardar la reserva. Verifica los datos e intenta de nuevo.');
        } finally {
            setGuardando(false);
        }
    };

    const abrirConfirmacionReserva = (reserva) => {
        setError('');
        setReservaAConfirmar(reserva);
        setAnticipoConfirmacion(String(Number(reserva?.anticipo || 0)));
    };

    const cerrarConfirmacionReserva = () => {
        if (confirmando) return;
        setReservaAConfirmar(null);
        setAnticipoConfirmacion('');
    };

    const confirmarReserva = async (anticipoArg) => {
        if (!reservaAConfirmar?.id) return;
        setError('');
        setConfirmando(true);
        try {
            const reserva = reservaAConfirmar;
            const anticipo = Math.max(Number(anticipoArg !== undefined ? anticipoArg : anticipoConfirmacion) || 0, 0);

            // Usar el nuevo endpoint dedicado que maneja confirmación de forma atómica
            const response = await reservaService.confirmar(reserva.id, anticipo);

            setReservas((prev) => prev.map((r) => (
                r.id === reserva.id
                    ? { ...r, estado: 'confirmada', anticipo: response.data.anticipo, saldo_pendiente: response.data.saldo_pendiente }
                    : r
            )));

            setReservaAConfirmar(null);
            setAnticipoConfirmacion('');
            await cargarHabitaciones();
        } catch (err) {
            console.error('Error confirmando reserva', err);
            const backendMessage = err?.response?.data?.message || err?.response?.data?.error;
            setError(backendMessage || 'No se pudo confirmar la reserva.');
        } finally {
            setConfirmando(false);
        }
    };

    const cancelarReserva = async (reserva) => {
        if (!reserva?.id) return;
        if (!window.confirm(`¿Cancelar la reserva #${reserva.id}? Esta acción no se puede deshacer.`)) return;

        setError('');
        setCancelando(reserva.id);
        try {
            await reservaService.updateEstado(reserva.id, 'cancelada');
            setReservas((prev) => prev.map((r) => (r.id === reserva.id ? { ...r, estado: 'cancelada' } : r)));
            await cargarHabitaciones();
        } catch (err) {
            console.error('Error cancelando reserva', err);
            const backendMessage = err?.response?.data?.message || err?.response?.data?.error;
            setError(backendMessage || 'No se pudo cancelar la reserva.');
        } finally {
            setCancelando(null);
        }
    };

    const hacerCheckin = async (reserva) => {
    if (!reserva?.id) return;
    setError('');

    const fechaEntrada = getValue(reserva, 'fecha_entrada', 'check_in', 'checkIn');
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const fechaCheckin = new Date(`${fechaEntrada}T00:00:00`);
    const diasRestantes = Math.ceil((fechaCheckin - hoy) / (1000 * 60 * 60 * 24));

    if (isNaN(fechaCheckin.getTime()) || fechaCheckin > hoy) {
        setError(`Check-in no disponible. Faltan ${diasRestantes} día(s) — disponible el ${fechaEntrada}.`);
        return;
    }

    try {
        await reservaService.updateEstado(reserva.id, 'checkin');
        await cargarDatos();
        navigate('/checkout', { state: { reservaId: reserva.id } });
    } catch (err) {
        console.error('Error haciendo checkin', err);
        const backendMessage = err?.response?.data?.message || err?.response?.data?.error;
        setError(backendMessage || 'No se pudo hacer el check-in.');
    }
};

    const etiquetaEstado = (estado) => {
        const key = fromApiEstado(estado);
        if (key === 'check-in') return 'CHECK-IN';
        if (key === 'check-out') return 'CHECK-OUT';
        if (key === 'confirmada') return 'CONFIRMADA';
        if (key === 'pendiente') return 'PENDIENTE';
        if (key === 'cancelada') return 'CANCELADA';
        return String(estado || '-').toUpperCase();
    };

    const colorEstado = (estado) => {
        const key = fromApiEstado(estado);
        if (key === 'pendiente') return '#f39c12';
        if (key === 'confirmada') return '#2980b9';
        if (key === 'check-in') return '#27ae60';
        if (key === 'check-out') return '#c0392b';
        if (key === 'cancelada') return '#7f8c8d';
        return '#7f8c8d';
    };

    const getValue = (reserva, ...keys) => {
        const firstKey = keys.find((key) => reserva?.[key] !== undefined && reserva?.[key] !== null && reserva?.[key] !== '');
        if (!firstKey) return '-';
        return reserva[firstKey];
    };

    const normalizarTexto = (texto) => String(texto || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();

    const getClienteNombre = (reserva) => {
        const clienteId = getValue(reserva, 'cliente_id');
        const cliente = clientes.find((c) => String(c.id) === String(clienteId));
        if (!cliente) return clienteId !== '-' ? `ID ${clienteId}` : '-';
        return `${cliente.nombre || ''} ${cliente.apellido || ''}`.trim() || `ID ${cliente.id}`;
    };

    const getClienteDocumento = (reserva) => {
        const clienteId = getValue(reserva, 'cliente_id');
        const cliente = clientes.find((c) => String(c.id) === String(clienteId));
        return cliente?.numero_documento
            || getValue(reserva, 'cliente_documento', 'documento_cliente', 'numero_documento', 'documento')
            || clienteId;
    };

    const reservasPendientes = useMemo(() => reservas.filter((r) => fromApiEstado(getValue(r, 'estado')) === 'pendiente'), [reservas]);
    const reservasConfirmadas = useMemo(() => reservas.filter((r) => fromApiEstado(getValue(r, 'estado')) === 'confirmada'), [reservas]);
    const reservasCanceladas = useMemo(() => reservas.filter((r) => {
        const estado = fromApiEstado(getValue(r, 'estado'));
        return estado === 'cancelada' || estado === 'cancelado';
    }), [reservas]);

    const reservasFiltradas = useMemo(() => {
        const consulta = normalizarTexto(busqueda);
        const base = tabActiva === 'pendiente' ? reservasPendientes : tabActiva === 'confirmada' ? reservasConfirmadas : reservasCanceladas;

        if (!consulta) return base;

        return base.filter((reserva) => {
            const nombre = normalizarTexto(getClienteNombre(reserva));
            const documento = normalizarTexto(getClienteDocumento(reserva));
            const clienteId = normalizarTexto(getValue(reserva, 'cliente_id'));
            return nombre.includes(consulta) || documento.includes(consulta) || clienteId.includes(consulta);
        });
    }, [busqueda, tabActiva, reservasPendientes, reservasConfirmadas, reservasCanceladas, clientes]);

    const getHabitacionNumero = (reserva) => {
        const detalle = reserva.reserva_habitaciones?.[0] || reserva.habitaciones?.[0] || null;
        const habitacionId = getValue(reserva, 'habitacion_id', 'habitacion');
        const numeroDesdeRelacion = detalle?.habitacion?.numero || detalle?.habitacion_numero || detalle?.numero;
        const numeroDesdeReserva = getValue(reserva, 'habitacion_numero', 'numero_habitacion');
        const numeroDesdeCatalogo = habitaciones.find((h) => String(h.id) === String(habitacionId))?.numero;
        return numeroDesdeRelacion || (numeroDesdeReserva !== '-' ? numeroDesdeReserva : null) || numeroDesdeCatalogo || habitacionId || '-';
    };

    const getPrecioNoche = (reserva) => {
        const detalle = reserva.reserva_habitaciones?.[0] || reserva.habitaciones?.[0] || null;
        return Number(detalle?.precio_noche || getValue(reserva, 'precio_noche', 'valor_noche', 'valorNoche')) || 0;
    };

    const getNoches = (reserva) => {
        const nochesDb = Number(getValue(reserva, 'noches')) || 0;
        if (nochesDb > 0) return nochesDb;
        const entrada = getValue(reserva, 'fecha_entrada', 'check_in', 'checkIn');
        const salida = getValue(reserva, 'fecha_salida', 'check_out', 'checkOut');
        if (entrada === '-' || salida === '-') return 0;
        return calcularNoches(entrada, salida);
    };

    return (
        <div className="page-container">
            <PageHeader title="Reservas" onBack={() => navigate('/dashboard')} backLabel="← Volver" />

            <form className="panel" onSubmit={crearReserva}>
                <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
                    <select className="select-base full-width" name="clienteId" value={form.clienteId} onChange={onChange}>
                        <option value="">Cliente</option>
                        {clientes.map((c) => (
                            <option key={c.id} value={c.id}>
                                {`${c.nombre || ''} ${c.apellido || ''}`.trim()} - {c.numero_documento || c.id}
                            </option>
                        ))}
                    </select>
                    <div>
                        <select className="select-base full-width" name="habitacionId" value={form.habitacionId} onChange={onChange}>
                            <option value="">Habitacion (Numero)</option>
                            {habitacionesDisponibles.map((h) => {
                                const estaOcupadaPorCruce = habitacionesNoDisponibles.has(Number(h.id));
                                return (
                                    <option key={h.id} value={h.id} disabled={estaOcupadaPorCruce}>
                                        Hab. {h.numero}{estaOcupadaPorCruce ? ' - No disponible por cruce' : ''}
                                    </option>
                                );
                            })}
                        </select>
                        {avisoCruceFechas ? <p className="error-text mb-0" style={{ marginTop: 6 }}>{avisoCruceFechas}</p> : null}
                    </div>
                    <input className="input-base full-width" name="checkIn" value={form.checkIn} onChange={onChange} type="date" />
                    <input className="input-base full-width" name="checkOut" value={form.checkOut} onChange={onChange} type="date" />
                    <input className="input-base full-width" value={valoresCalculados.noches} disabled placeholder="Noches" />
                    <input className="input-base full-width" name="valorNoche" value={form.valorNoche} onChange={onChange} type="number" min="0" placeholder="Valor Noche" />
                    <div>
                        <label className="label" style={{ color: '#000', fontWeight: 400 }}>ADULTOS</label>
                        <input className="input-base full-width" name="numAdultos" value={form.numAdultos} onChange={onChange} type="number" min="1" placeholder="Ej: 1" style={{ color: '#6b7280', fontWeight: 700 }} />
                    </div>
                    <div>
                        <label className="label" style={{ color: '#000', fontWeight: 400 }}>NIÑOS</label>
                        <input className="input-base full-width" name="numNinos" value={form.numNinos} onChange={onChange} type="number" min="0" placeholder="Ej: 0" style={{ color: '#6b7280', fontWeight: 700 }} />
                    </div>
                    <input className="input-base full-width" value={valoresCalculados.valorTotal} disabled placeholder="Valor Total" />
                    <input className="input-base full-width" value={valoresCalculados.saldoPendiente} disabled placeholder="Saldo Pendiente" />
                    <input className="input-base full-width" value="PENDIENTE" disabled placeholder="Estado" />
                    <input className="input-base full-width" name="observaciones" value={form.observaciones} onChange={onChange} placeholder="Observaciones" />
                </div>

                <div className="form-footer">
                    {error ? <p className="error-text mb-0">{error}</p> : <span />}
                    <AppButton type="submit" disabled={guardando}>
                        {guardando ? 'Guardando...' : '+ Agregar Reserva'}
                    </AppButton>
                </div>
            </form>

            {loading ? (
                <p className="page-loading">Cargando reservas...</p>
            ) : (
                <div>
                    <div className="toolbar" style={{ marginBottom: 10 }}>
                        <AppButton type="button" variant={tabActiva === 'pendiente' ? 'info' : 'secondary'} onClick={() => setTabActiva('pendiente')}>
                            Pendientes ({reservasPendientes.length})
                        </AppButton>
                        <AppButton type="button" variant={tabActiva === 'confirmada' ? 'info' : 'secondary'} onClick={() => setTabActiva('confirmada')}>
                            Confirmadas ({reservasConfirmadas.length})
                        </AppButton>
                        <AppButton type="button" variant={tabActiva === 'cancelada' ? 'info' : 'secondary'} onClick={() => setTabActiva('cancelada')}>
                            Canceladas ({reservasCanceladas.length})
                        </AppButton>
                    </div>

                    <div className="toolbar" style={{ marginBottom: 12 }}>
                        <input
                            className="input-base"
                            type="text"
                            placeholder="Buscar por nombre o CC"
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && setBusqueda((prev) => prev.trim())}
                        />
                        <AppButton type="button" onClick={() => setBusqueda((prev) => prev.trim())}>Buscar</AppButton>
                    </div>

                    <div className="table-shell">
                        <table className="table-base">
                            <thead>
                                <tr>
                                    <th>Cliente</th>
                                    <th>Habitacion</th>
                                    <th>Check-in</th>
                                    <th>Check-out</th>
                                    <th>Noches</th>
                                    <th>Adultos</th>
                                    <th>Niños</th>
                                    <th>Valor Noche</th>
                                    <th>Valor Total</th>
                                    <th>Anticipo</th>
                                    <th>Saldo Pendiente</th>
                                    <th>Estado</th>
                                    <th>Observaciones</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reservasFiltradas.length === 0 ? (
                                    <tr>
                                        <td colSpan={14} className="table-empty">
                                            {busqueda
                                                ? 'No se encontraron reservas para esa búsqueda.'
                                                : tabActiva === 'pendiente'
                                                    ? 'No hay reservas pendientes.'
                                                    : tabActiva === 'confirmada'
                                                        ? 'No hay reservas confirmadas.'
                                                        : 'No hay reservas canceladas.'}
                                        </td>
                                    </tr>
                                ) : (
                                    reservasFiltradas.map((r, index) => {
                                        const noches = getNoches(r);
                                        const valorNoche = getPrecioNoche(r);
                                        const valorTotal = Number(getValue(r, 'total', 'valor_total', 'valorTotal')) || (noches * valorNoche);
                                        const anticipo = Number(getValue(r, 'anticipo')) || 0;
                                        const saldo = Number(getValue(r, 'saldo_pendiente', 'saldoPendiente')) || Math.max(valorTotal - anticipo, 0);
                                        const fechaEntrada = getValue(r, 'fecha_entrada', 'check_in', 'checkIn');
                                        const fechaSalida = getValue(r, 'fecha_salida', 'check_out', 'checkOut');
                                        const estadoActual = fromApiEstado(getValue(r, 'estado'));
                                        const esPendiente = estadoActual === 'pendiente';
                                        const esConfirmada = estadoActual === 'confirmada';

                                        return (
                                            <tr key={r.id || `${r.habitacion_id || r.habitacion || 'reserva'}-${index}`}>
                                                <td>{getClienteNombre(r)}</td>
                                                <td>{getHabitacionNumero(r)}</td>
                                                <td>{fechaEntrada}</td>
                                                <td>{fechaSalida}</td>
                                                <td>{noches || '-'}</td>
                                                <td>{Number(getValue(r, 'num_adultos', 'numAdultos')) || 0}</td>
                                                <td>{Number(getValue(r, 'num_ninos', 'numNinos')) || 0}</td>
                                                <td>$ {toCurrency(valorNoche)}</td>
                                                <td>$ {toCurrency(valorTotal)}</td>
                                                <td>$ {toCurrency(anticipo)}</td>
                                                <td>$ {toCurrency(saldo)}</td>
                                                <td>
                                                    <span
                                                        style={{
                                                            display: 'inline-block',
                                                            padding: '2px 10px',
                                                            borderRadius: '12px',
                                                            fontSize: '11px',
                                                            fontWeight: 700,
                                                            backgroundColor: colorEstado(estadoActual),
                                                            color: '#fff',
                                                            letterSpacing: '0.5px'
                                                        }}
                                                    >
                                                        {etiquetaEstado(estadoActual)}
                                                    </span>
                                                </td>
                                                <td>{getValue(r, 'observaciones')}</td>
                                                <td>
                                                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                                        {tabActiva === 'cancelada' && (
                                                            <span style={{ color: '#64748b', fontSize: '12px', fontWeight: 600 }}>Solo lectura</span>
                                                        )}
                                                        {tabActiva !== 'cancelada' && esPendiente && (
                                                            <AppButton size="sm" variant="info" onClick={() => abrirConfirmacionReserva(r)} disabled={!r.id}>
                                                                Confirmar
                                                            </AppButton>
                                                        )}
                                                        {tabActiva !== 'cancelada' && esConfirmada && (
                                                            <AppButton size="sm" style={{ backgroundColor: '#27ae60', color: '#fff' }} onClick={() => hacerCheckin(r)} disabled={!r.id}>
                                                                → Check-in
                                                            </AppButton>
                                                        )}
                                                        {tabActiva !== 'cancelada' && (esPendiente || esConfirmada) && (
                                                            <AppButton size="sm" variant="danger" onClick={() => cancelarReserva(r)} disabled={!r.id || cancelando === r.id}>
                                                                {cancelando === r.id ? 'Cancelando...' : 'Cancelar'}
                                                            </AppButton>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {reservaAConfirmar && (
                        <div
                            style={{
                                position: 'fixed',
                                inset: 0,
                                backgroundColor: 'rgba(15, 23, 42, 0.55)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                zIndex: 1200,
                                padding: '16px'
                            }}
                            onClick={cerrarConfirmacionReserva}
                        >
                            <div className="panel" style={{ width: '100%', maxWidth: '520px', marginBottom: 0 }} onClick={(e) => e.stopPropagation()}>
                                <h3 className="panel-title">Confirmar reserva</h3>
                                <p className="entity-card__text mb-0">Habitación: Hab. {getHabitacionNumero(reservaAConfirmar)}</p>
                                <p className="entity-card__text mb-0">Cliente: {getClienteNombre(reservaAConfirmar)}</p>
                                <p className="entity-card__text" style={{ marginBottom: 16 }}>
                                    Al confirmar, la reserva pasará a <strong>confirmada</strong> y la habitación quedará como <strong>reservada</strong>.
                                </p>

                                <label className="label">Anticipo</label>
                                <input
                                    className="input-base full-width"
                                    type="number"
                                    min="0"
                                    value={anticipoConfirmacion}
                                    onChange={(e) => setAnticipoConfirmacion(e.target.value)}
                                    placeholder="Ingrese el anticipo"
                                />

                                <div className="form-footer" style={{ marginTop: 18 }}>
                                    <AppButton type="button" variant="secondary" onClick={cerrarConfirmacionReserva} disabled={confirmando}>
                                        Cancelar
                                    </AppButton>
                                    <AppButton type="button" variant="success" onClick={() => confirmarReserva()} disabled={confirmando}>
                                        {confirmando ? 'Confirmando...' : 'Confirmar y guardar anticipo'}
                                    </AppButton>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default Reservas;