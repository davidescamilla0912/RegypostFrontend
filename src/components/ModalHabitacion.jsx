import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import reservaService from '../services/reservaService';
import consumoService from '../services/consumoService';
import clienteService from '../services/clienteService';
import empleadoService from '../services/empleadoService';
import habitacionService from '../services/habitacionService';

// Cache simple en memoria
const cache = {};
const CACHE_TTL = 60000; // 60 segundos

const getCached = (key) => {
    const entry = cache[key];
    if (!entry) return null;
    if (Date.now() - entry.time > CACHE_TTL) {
        delete cache[key];
        return null;
    }
    return entry.data;
};

const setCached = (key, data) => {
    cache[key] = { data, time: Date.now() };
};

function ModalBase({ open, onClose, width = '750px', title, subtitle, headerActions, children, footer }) {
    useEffect(() => {
        if (!open) return undefined;

        const onKeyDown = (event) => {
            if (event.key === 'Escape') {
                onClose?.();
            }
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div style={styles.overlay} onClick={onClose}>
            <div style={{ ...styles.modal, width }} onClick={(event) => event.stopPropagation()}>
                <div style={styles.header}>
                    <div>
                        <h2 style={styles.titulo}>{title}</h2>
                        {subtitle && <span style={styles.subtitulo}>{subtitle}</span>}
                    </div>
                    <div style={styles.headerActions}>
                        {headerActions}
                        <button style={styles.btnCerrar} onClick={onClose}>✕</button>
                    </div>
                </div>

                <div style={styles.contenido}>{children}</div>

                {footer && <div style={styles.footer}>{footer}</div>}
            </div>
        </div>
    );
}

function ModalHabitacion({
    habitacion,
    onClose,
    onUpdate,
    open = false,
    title = '',
    subtitle = '',
    children,
    footer,
    width = '750px',
    headerActions = null
}) {
    const navigate = useNavigate();
    const [pestana, setPestana] = useState('reserva');
    const [reserva, setReserva] = useState(null);
    const [habitacionReserva, setHabitacionReserva] = useState(null);
    const [clienteDetalle, setClienteDetalle] = useState(null);
    const [empleadoNombre, setEmpleadoNombre] = useState('');
    const [consumos, setConsumos] = useState([]);
    const [tiposConsumo, setTiposConsumo] = useState([]);
    const [reservasFuturas, setReservasFuturas] = useState([]);
    const [mostrarProximas, setMostrarProximas] = useState(false);
    const [mostrarExtender, setMostrarExtender] = useState(false);
    const [mostrarCambio, setMostrarCambio]               = useState(false);
    const [habitacionesCambio, setHabitacionesCambio]     = useState([]);
    const [cargandoHabs, setCargandoHabs]                 = useState(false);
    const [habSeleccionada, setHabSeleccionada]           = useState(null);
    const [motivoCambio, setMotivoCambio]                 = useState('');
    const [errorCambio, setErrorCambio]                   = useState('');
    const [guardandoCambio, setGuardandoCambio]           = useState(false);
    const [exitoCambio, setExitoCambio]                   = useState(null); // {origen, destino}

    const [diasExtra, setDiasExtra] = useState(1);
    const [guardandoExtension, setGuardandoExtension] = useState(false);
    const [errorExtension, setErrorExtension] = useState('');
    const [editandoHuespedes, setEditandoHuespedes] = useState(false);
    const [numAdultos, setNumAdultos] = useState(0);
    const [numNinos, setNumNinos] = useState(0);
    const [guardandoHuespedes, setGuardandoHuespedes] = useState(false);
    const [errorHuespedes, setErrorHuespedes] = useState('');
    const [loading, setLoading] = useState(true);
    const [formServicio, setFormServicio] = useState({
        tipo_consumo_id: '',
        descripcion: '',
        cantidad: 1,
        precio_unitario: 0,
        fecha: new Date().toISOString().split('T')[0]
    });
    const [formServicioPagado, setFormServicioPagado] = useState(false);

    useEffect(() => {
        if (!habitacion) return undefined;
        cargarDatos();
        return undefined;
    }, [habitacion]);

    // Si después de cargar no hay reserva activa ni futuras, cierra el modal
    useEffect(() => {
        if (loading) return; // Esperar a que termine de cargar
        
        if (!reserva && (!reservasFuturas || reservasFuturas.length === 0)) {
            // Sin reservas activas ni futuras: cerrar modal directamente
            onClose?.();
        }
    }, [loading, reserva, reservasFuturas, onClose]);

    const toNumber = (value) => {
        const n = Number(value);
        return Number.isFinite(n) ? n : 0;
    };

    const firstNonEmpty = (obj, keys) => {
        for (const key of keys) {
            const value = obj?.[key];
            if (value !== undefined && value !== null && value !== '') return value;
        }
        return null;
    };

    const resolveClienteYEmpleado = async (reservaData) => {
        if (!reservaData) return;

        const clienteId = firstNonEmpty(reservaData, ['cliente_id', 'clienteId', 'id_cliente']);
        const documentoEnReserva = firstNonEmpty(reservaData, ['numero_documento', 'cliente_documento', 'documento']);

        let detalleCliente = null;
        if (clienteId) {
            try {
                const resCliente = await clienteService.getById(clienteId);
                detalleCliente = resCliente.data?.data || resCliente.data || null;
            } catch (err) {
                console.warn('No se pudo cargar cliente por ID', err);
            }
        }

        if (!detalleCliente && documentoEnReserva) {
            try {
                const resClienteDoc = await clienteService.getByDocumento(documentoEnReserva);
                detalleCliente = resClienteDoc.data?.data || resClienteDoc.data || null;
            } catch (err) {
                console.warn('No se pudo cargar cliente por documento', err);
            }
        }

        setClienteDetalle(detalleCliente);

        const empleadoId = firstNonEmpty(reservaData, ['empleado_id', 'empleadoId', 'registrado_por', 'created_by']);
        let nombreEmpleado = firstNonEmpty(reservaData, ['empleado_nombre', 'empleado', 'usuario_nombre']) || '';

        if (!nombreEmpleado && empleadoId) {
            try {
                const resEmpleado = await empleadoService.getById(empleadoId);
                const empleado = resEmpleado.data?.data || resEmpleado.data || null;
                if (empleado) {
                    nombreEmpleado = [empleado.nombre, empleado.apellido].filter(Boolean).join(' ').trim()
                        || empleado.usuario
                        || empleado.email
                        || '';
                }
            } catch (err) {
                console.warn('No se pudo cargar empleado por ID', err);
            }
        }

        if (!nombreEmpleado) {
            try {
                const empleadoSesion = JSON.parse(localStorage.getItem('empleado') || '{}');
                const idSesion = empleadoSesion?.id;
                if (!empleadoId || String(empleadoId) === String(idSesion)) {
                    nombreEmpleado = [empleadoSesion?.nombre, empleadoSesion?.apellido].filter(Boolean).join(' ').trim()
                        || empleadoSesion?.usuario
                        || '';
                }
            } catch (err) {
                console.warn('No se pudo leer empleado de sesión', err);
            }
        }

        setEmpleadoNombre(nombreEmpleado);
    };

    const cargarDatos = async () => {
    const cacheKey = `habitacion_${habitacion.id}`;
    const cached = getCached(cacheKey);
    
    if (cached) {
        setReserva(cached.reserva);
        setHabitacionReserva(cached.habitacionReserva);
        setClienteDetalle(cached.clienteDetalle);
        setEmpleadoNombre(cached.empleadoNombre);
        setConsumos(cached.consumos);
        setTiposConsumo(cached.tiposConsumo);
        setReservasFuturas(cached.reservasFuturas);
        if (cached.reserva) {
            setNumAdultos(cached.reserva.num_adultos || 1);
            setNumNinos(cached.reserva.num_ninos || 0);
        }
        setLoading(false);
        return;
    }

    try {
        setLoading(true);
        setClienteDetalle(null);
        setEmpleadoNombre('');
        setReservasFuturas([]);
        setReserva(null);

        const resReservas = await reservaService.getByEstado('checkin');
        const reservasCheckin = Array.isArray(resReservas.data) ? resReservas.data : (resReservas.data?.data || []);

        let reservaEncontrada = null;
        let habitacionReservaEncontrada = null;

        if (Array.isArray(reservasCheckin) && reservasCheckin.length > 0) {
            for (const r of reservasCheckin) {
                const resHabs = await reservaService.getHabitaciones(r.id);
                const habsArray = Array.isArray(resHabs.data) ? resHabs.data : (resHabs.data?.data || []);
                const habEnReserva = habsArray.find(h => h.habitacion_id === habitacion.id);
                if (habEnReserva) {
                    reservaEncontrada = r;
                    habitacionReservaEncontrada = habEnReserva;
                    break;
                }
            }
        }

        let clienteDetalleData = null;
        let empleadoNombreData = '';

       if (reservaEncontrada) {
        setReserva(reservaEncontrada);
        setHabitacionReserva(habitacionReservaEncontrada);
        setNumAdultos(reservaEncontrada.num_adultos || 1);
        setNumNinos(reservaEncontrada.num_ninos || 0);
        await resolveClienteYEmpleado(reservaEncontrada);
        const resConsumos = await consumoService.getByReserva(reservaEncontrada.id);
        setConsumos(resConsumos.data);
        // Capturar valores actuales del estado para el caché
        clienteDetalleData = null; // se llenará abajo
        empleadoNombreData = '';   // se llenará abajo
}

        const futuras = [];
        try {
            const todasReservas = await reservaService.getAll();
            const payload = Array.isArray(todasReservas.data) ? todasReservas.data : todasReservas.data?.data || [];
            const hoy = new Date();
            hoy.setHours(0, 0, 0, 0);

            // Peticiones en paralelo en vez de secuencial
            const resultados = await Promise.allSettled(
                payload.map(r => reservaService.getHabitaciones(r.id).then(res => ({ r, res })))
            );

            for (const resultado of resultados) {
                if (resultado.status !== 'fulfilled') continue;
                const { r, res } = resultado.value;
                const habsArray = Array.isArray(res.data) ? res.data : (res.data?.data || []);
                const habEnReserva = habsArray.find(h => h.habitacion_id === habitacion.id);
                if (habEnReserva) {
                    const fechaEntrada = new Date(r.fecha_entrada);
                    fechaEntrada.setHours(0, 0, 0, 0);
                    const esActual = reservaEncontrada && r.id === reservaEncontrada.id;
                    if (fechaEntrada >= hoy && r.estado !== 'cancelada' && !esActual) {
                        futuras.push({ ...r, habitacion_detalle: habEnReserva });
                    }
                }
            }
            futuras.sort((a, b) => new Date(a.fecha_entrada) - new Date(b.fecha_entrada));
            setReservasFuturas(futuras);
        } catch (err) {
            console.warn('Error cargando reservas futuras', err);
        }


        // Guardar en caché
        const resTipos = await consumoService.getTipos();
        setTiposConsumo(resTipos.data);

        // Capturar cliente para el caché
        const clienteActual = await clienteService.getById(
            reservaEncontrada?.cliente_id
        ).then(r => r.data?.data || r.data || null).catch(() => null);

        // Guardar en caché
        setCached(cacheKey, {
            reserva: reservaEncontrada,
            habitacionReserva: habitacionReservaEncontrada,
            clienteDetalle: clienteActual,
            empleadoNombre: '',
            consumos: reservaEncontrada ? (await consumoService.getByReserva(reservaEncontrada.id)).data : [],
            tiposConsumo: resTipos.data,
            reservasFuturas: futuras
        });

    } catch (err) {
        console.error('Error cargando datos', err);
        setReserva(null);
        setReservasFuturas([]);
    } finally {
        setLoading(false);
    }
};

    const extenderReserva = async () => {
        if (!reserva?.id || diasExtra < 1) return;
        setErrorExtension('');
        setGuardandoExtension(true);
        try {
            const res = await reservaService.extender(reserva.id, Number(diasExtra));
            const datos = res.data;

            setReserva((prev) => ({
                ...prev,
                fecha_salida: datos.nueva_fecha_salida,
                total: datos.nuevo_total,
                saldo_pendiente: datos.nuevo_saldo
            }));

            setMostrarExtender(false);
            setDiasExtra(1);
            onUpdate?.();
        } catch (err) {
            const msg = err?.response?.data?.error || 'No se pudo extender la reserva';
            setErrorExtension(msg);
        } finally {
            setGuardandoExtension(false);
        }
    };

    const guardarHuespedes = async () => {
        if (!reserva?.id) return;
        setGuardandoHuespedes(true);
        setErrorHuespedes('');
        try {
            const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
            const token = localStorage.getItem('token') || '';
            const res = await fetch(`${BASE_URL}/reservas/${reserva.id}/personas`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    num_adultos: numAdultos,
                    num_ninos: numNinos
                })
            });
            const data = await res.json();
            if (!res.ok) {
                setErrorHuespedes(data.error || 'No se pudo actualizar');
                return;
            }
            setReserva(prev => ({ ...prev, num_adultos: numAdultos, num_ninos: numNinos }));
            setEditandoHuespedes(false);
            onUpdate?.();
        } catch (err) {
            setErrorHuespedes('Error de conexión');
        } finally {
            setGuardandoHuespedes(false);
        }
    };

    const cargarHabitacionesCambio = async () => {
    if (!reserva?.id) return;
    setCargandoHabs(true);
    setErrorCambio('');
    setHabSeleccionada(null);
    try {
        // Ajusta BASE_URL a tu configuración real (api.js, env, etc.)
        const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        const token    = localStorage.getItem('token') || '';
        const res = await fetch(
            `${BASE_URL}/reservas/${reserva.id}/habitaciones-para-cambio`,
            { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) throw new Error('Error al cargar habitaciones');
        const data = await res.json();
        setHabitacionesCambio(data);
    } catch (err) {
        setErrorCambio('No se pudieron cargar las habitaciones disponibles');
    } finally {
        setCargandoHabs(false);
    }
};

const ejecutarCambio = async () => {
    if (!habSeleccionada || !motivoCambio.trim()) {
        setErrorCambio('Seleccioná una habitación y escribí el motivo');
        return;
    }
    setGuardandoCambio(true);
    setErrorCambio('');
    try {
        const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        const token    = localStorage.getItem('token') || '';
        const res = await fetch(
            `${BASE_URL}/reservas/${reserva.id}/cambiar-habitacion`,
            {
                method:  'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization:  `Bearer ${token}`
                },
                body: JSON.stringify({
                    nueva_habitacion_id: habSeleccionada.id,
                    motivo:              motivoCambio.trim()
                })
            }
        );
        const data = await res.json();
        if (!res.ok) {
            setErrorCambio(data.error || 'Error al realizar el cambio');
            return;
        }
        // Éxito
        setExitoCambio({
            origen:  data.habitacion_origen,
            destino: data.habitacion_destino,
            motivo:  motivoCambio.trim()
        });
        setMostrarCambio(false);
        onUpdate?.();          // refresca el mapa/lista de habitaciones
        // Cerramos el modal principal luego de 2 s para que el usuario vea el toast
        setTimeout(() => onClose?.(), 2200);
    } catch (err) {
        setErrorCambio('Error de conexión al realizar el cambio');
    } finally {
        setGuardandoCambio(false);
    }
};

const cerrarModalCambio = () => {
    setMostrarCambio(false);
    setErrorCambio('');
    setHabSeleccionada(null);
    setMotivoCambio('');
};

    const agregarServicio = async () => {
        if (!formServicio.tipo_consumo_id || !habitacionReserva) return;
        try {
            const cantidad = Math.max(parseInt(formServicio.cantidad, 10) || 1, 1);
            const precioUnitario = parseFloat(formServicio.precio_unitario) || 0;
            await consumoService.create({
                ...formServicio,
                cantidad,
                precio_unitario: precioUnitario,
                reserva_habitacion_id: habitacionReserva.id,
                estado: formServicioPagado ? 'cancelado' : 'pendiente'
            });
            setFormServicio({
                tipo_consumo_id: '',
                descripcion: '',
                cantidad: 1,
                precio_unitario: 0,
                fecha: new Date().toISOString().split('T')[0]
            });
            setFormServicioPagado(false);
            const resConsumos = await consumoService.getByReserva(reserva.id);
            setConsumos(resConsumos.data);
        } catch (err) {
            console.error('Error agregando servicio', err);
        }
    };

    const eliminarConsumo = async (id) => {
        if (window.confirm('¿Eliminar este consumo?')) {
            await consumoService.delete(id);
            const resConsumos = await consumoService.getByReserva(reserva.id);
            setConsumos(resConsumos.data);
        }
    };

    const calcularNoches = () => {
        if (!reserva) return 0;
        const entrada = new Date(reserva.fecha_entrada);
        const salida = new Date(reserva.fecha_salida);
        return Math.round((salida - entrada) / (1000 * 60 * 60 * 24));
    };

    const totalConsumos = consumos.reduce((sum, c) => {
        const isPagado = c.estado === 'cancelado';
        return sum + (isPagado ? 0 : parseFloat(c.total || 0));
    }, 0);
    const totalReserva = toNumber(reserva?.total);
    const anticipo = toNumber(reserva?.anticipo);
    const totalFinal = Math.max(totalReserva + totalConsumos - anticipo, 0);

    const irACaja = () => {
        if (!reserva) return;

        navigate('/caja', {
            state: {
                origen: 'habitacion',
                reserva: {
                    id: reserva.id,
                    empleado_id: reserva.empleado_id || null,
                    estado: reserva.estado,
                    fecha_entrada: reserva.fecha_entrada,
                    fecha_salida: reserva.fecha_salida,
                    num_adultos: reserva.num_adultos,
                    num_ninos: reserva.num_ninos,
                    fuente: reserva.fuente,
                    observaciones: reserva.observaciones,
                    saldo_pendiente: reserva.saldo_pendiente,
                    total: reserva.total,
                    anticipo: reserva.anticipo
                },
                habitacion: {
                    id: habitacion.id,
                    numero: habitacion.numero,
                    tipo_nombre: habitacion.tipo_nombre,
                    piso: habitacion.piso
                },
                cliente: {
                    id: reserva.cliente_id || clienteDetalle?.id || null,
                    nombre: clienteNombre,
                    documento: clienteDocumento
                },
                empleado: empleadoNombre || null,
                consumos: consumos.map((c) => ({
                    id: c.id,
                    tipo_nombre: c.tipo_nombre,
                    descripcion: c.descripcion,
                    cantidad: c.cantidad,
                    precio_unitario: c.precio_unitario,
                    total: c.total,
                    fecha: c.fecha
                })),
                resumenPago: {
                    precioNoche: habitacionReserva?.precio_noche || 0,
                    totalReserva,
                    totalConsumos,
                    anticipo,
                    saldoPendiente: toNumber(reserva?.saldo_pendiente),
                    totalFinal
                }
            }
        });
    };

    const clienteNombre = firstNonEmpty(reserva, ['cliente_nombre', 'nombre_cliente'])
        || [clienteDetalle?.nombre, clienteDetalle?.apellido].filter(Boolean).join(' ').trim()
        || '-';
    const clienteDocumento = firstNonEmpty(reserva, ['numero_documento', 'cliente_documento', 'documento'])
        || clienteDetalle?.numero_documento
        || '-';

    const formatFecha = (fecha) => {
        if (!fecha) return '-';
        return new Date(fecha).toLocaleDateString('es-CO', { timeZone: 'UTC' });
    };

    if (!habitacion) {
        return (
            <ModalBase
                open={open}
                onClose={onClose}
                width={width}
                title={title}
                subtitle={subtitle}
                headerActions={headerActions}
                footer={footer}
            >
                {children}
            </ModalBase>
        );
    }

    return (
        <ModalBase
            open={Boolean(habitacion)}
            onClose={onClose}
            width="750px"
            title={`Hab. ${habitacion.numero}`}
            subtitle={`${habitacion.tipo_nombre} - Piso ${habitacion.piso}`}
            headerActions={reserva && (
                <>
                    <button style={styles.btnExtender} onClick={() => setMostrarExtender(true)}>
                        + Dias
                    </button>
                    <button style={styles.btnCaja} onClick={irACaja}>
                        Mandar a caja
                    </button>
                    <button style={styles.btnCambio} onClick={() => { setMostrarCambio(true); cargarHabitacionesCambio(); }}>
                        🔄 Cambiar Hab.
                    </button>
                </>
            )}
        >
            {/* Pestañas */}
            <div style={styles.pestanas}>
                {['reserva', 'huesped', 'servicios'].map(p => (
                    <button key={p} style={{
                        ...styles.pestana,
                        borderBottom: pestana === p ? '3px solid #1a1a2e' : '3px solid transparent',
                        color: pestana === p ? '#1a1a2e' : '#666',
                        fontWeight: pestana === p ? 'bold' : 'normal'
                    }} onClick={() => setPestana(p)}>
                        {p === 'reserva' ? '📋 Reserva' : p === 'huesped' ? '👤 Huésped' : '🛎️ Cargar Servicios'}
                    </button>
                ))}
                {reservasFuturas.length > 0 && (
                    <button style={{
                        ...styles.pestana,
                        marginLeft: 'auto',
                        color: '#f39c12',
                        fontWeight: 'bold',
                        borderBottom: mostrarProximas ? '3px solid #f39c12' : 'none'
                    }} onClick={() => setMostrarProximas(!mostrarProximas)}>
                        📅 Próximas ({reservasFuturas.length})
                    </button>
                )}
            </div>

            {loading ? (
                <p style={styles.loading}>Cargando información...</p>
            ) : !reserva ? (
                <p style={styles.sinReserva}>No hay checkin activo en esta habitación</p>
            ) : (
                <>
                    {/* PESTAÑA RESERVA */}
                    {pestana === 'reserva' && (
                        <div>
                            <div style={styles.grid2}>
                                <div style={styles.seccion}>
                                    <h4 style={styles.seccionTitulo}>📅 Fechas</h4>
                                    <div style={styles.fila}>
                                        <span style={styles.etiqueta}>Check-in</span>
                                        <span style={styles.valor}>{formatFecha(reserva.fecha_entrada)}</span>
                                    </div>
                                    <div style={styles.fila}>
                                        <span style={styles.etiqueta}>Check-out</span>
                                        <span style={styles.valor}>{formatFecha(reserva.fecha_salida)}</span>
                                    </div>
                                    <div style={styles.fila}>
                                        <span style={styles.etiqueta}>Noches</span>
                                        <span style={styles.valor}>{calcularNoches()}</span>
                                    </div>
                                    <div style={styles.fila}>
                                        <span style={styles.etiqueta}>Adultos</span>
                                        <span style={styles.valor}>{reserva.num_adultos}</span>
                                    </div>
                                    <div style={styles.fila}>
                                        <span style={styles.etiqueta}>Niños</span>
                                        <span style={styles.valor}>{reserva.num_ninos}</span>
                                    </div>
                                    <div style={styles.fila}>
                                        <span style={styles.etiqueta}>Fuente</span>
                                        <span style={styles.valor}>{reserva.fuente}</span>
                                    </div>
                                </div>

                                <div style={styles.seccion}>
                                    <h4 style={styles.seccionTitulo}>💰 Financiero</h4>
                                    <div style={styles.fila}>
                                        <span style={styles.etiqueta}>Precio/noche</span>
                                        <span style={styles.valor}>${parseFloat(habitacionReserva?.precio_noche || 0).toLocaleString()}</span>
                                    </div>
                                    <div style={styles.fila}>
                                        <span style={styles.etiqueta}>Total reserva</span>
                                        <span style={styles.valor}>${totalReserva.toLocaleString()}</span>
                                    </div>
                                    <div style={styles.fila}>
                                        <span style={styles.etiqueta}>Anticipo</span>
                                        <span style={{ ...styles.valor, color: '#2ecc71' }}>${anticipo.toLocaleString()}</span>
                                    </div>
                                    <div style={styles.fila}>
                                        <span style={styles.etiqueta}>Saldo pendiente</span>
                                        <span style={{ ...styles.valor, color: '#e74c3c', fontWeight: 'bold' }}>${parseFloat(reserva.saldo_pendiente || 0).toLocaleString()}</span>
                                    </div>
                                    <div style={styles.fila}>
                                        <span style={styles.etiqueta}>Consumos</span>
                                        <span style={{ ...styles.valor, color: '#f39c12' }}>${totalConsumos.toLocaleString()}</span>
                                    </div>
                                    <div style={styles.fila}>
                                        <span style={styles.etiqueta}>Total final</span>
                                        <span style={{ ...styles.valor, color: '#1a1a2e', fontWeight: 'bold' }}>${totalFinal.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>

                            {reserva.observaciones && (
                                <div style={styles.observaciones}>
                                    <strong>Observaciones:</strong> {reserva.observaciones}
                                </div>
                            )}
                        </div>
                    )}

                            {/* PESTAÑA HUÉSPED */}
                            {pestana === 'huesped' && (
                                <div style={styles.seccion}>
                                    <h4 style={styles.seccionTitulo}>👤 Titular de la Reserva</h4>
                                    <div style={styles.grid2}>
                                        <div>
                                            <div style={styles.fila}>
                                                <span style={styles.etiqueta}>Nombre</span>
                                                <span style={{ ...styles.valor, fontWeight: 'bold', fontSize: '16px' }}>{clienteNombre}</span>
                                            </div>
                                            <div style={styles.fila}>
                                                <span style={styles.etiqueta}>Documento</span>
                                                <span style={styles.valor}>{clienteDocumento}</span>
                                            </div>
                                            <div style={styles.fila}>
                                                <span style={styles.etiqueta}>Teléfono</span>
                                                <span style={styles.valor}>{reserva.telefono || clienteDetalle?.telefono || '-'}</span>
                                            </div>
                                        </div>
                                        <div>
                                            <div style={styles.fila}>
                                                <span style={styles.etiqueta}>Reserva ID</span>
                                                <span style={styles.valor}>#{reserva.id}</span>
                                            </div>
                                            <div style={styles.fila}>
                                                <span style={styles.etiqueta}>Estado</span>
                                                <span style={{ ...styles.valor, color: '#2ecc71', fontWeight: 'bold' }}>{reserva.estado?.toUpperCase()}</span>
                                            </div>
                                            <div style={styles.fila}>
                                                <span style={styles.etiqueta}>Empleado</span>
                                                <span style={styles.valor}>{empleadoNombre || '-'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* ── SECCIÓN PERSONAS ── */}
                                    <div style={{ marginTop: '18px', backgroundColor: '#f9f9f9', borderRadius: '8px', padding: '14px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                            <h4 style={{ margin: 0, color: '#1a1a2e', fontSize: '14px' }}>👥 Personas en la habitación</h4>
                                            {!editandoHuespedes && (
                                                <button
                                                    style={{ ...styles.btnCambio, fontSize: '12px', padding: '5px 12px' }}
                                                    onClick={() => setEditandoHuespedes(true)}
                                                >
                                                    ✏️ Editar
                                                </button>
                                            )}
                                        </div>

                                        {!editandoHuespedes ? (
                                            <div style={styles.grid2}>
                                                <div style={styles.fila}>
                                                    <span style={styles.etiqueta}>Adultos</span>
                                                    <span style={{ ...styles.valor, fontWeight: 'bold', fontSize: '16px' }}>{reserva.num_adultos}</span>
                                                </div>
                                                <div style={styles.fila}>
                                                    <span style={styles.etiqueta}>Niños</span>
                                                    <span style={{ ...styles.valor, fontWeight: 'bold', fontSize: '16px' }}>{reserva.num_ninos}</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <div style={styles.grid2}>
                                                    <div>
                                                        <label style={styles.label}>Adultos</label>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                            <button
                                                                style={styles.btnContador}
                                                                onClick={() => setNumAdultos(Math.max(1, numAdultos - 1))}
                                                            >−</button>
                                                            <span style={{ fontSize: '20px', fontWeight: 'bold', minWidth: '28px', textAlign: 'center' }}>
                                                                {numAdultos}
                                                            </span>
                                                            <button
                                                                style={styles.btnContador}
                                                                onClick={() => setNumAdultos(numAdultos + 1)}
                                                            >+</button>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label style={styles.label}>Niños</label>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                            <button
                                                                style={styles.btnContador}
                                                                onClick={() => setNumNinos(Math.max(0, numNinos - 1))}
                                                            >−</button>
                                                            <span style={{ fontSize: '20px', fontWeight: 'bold', minWidth: '28px', textAlign: 'center' }}>
                                                                {numNinos}
                                                            </span>
                                                            <button
                                                                style={styles.btnContador}
                                                                onClick={() => setNumNinos(numNinos + 1)}
                                                            >+</button>
                                                        </div>
                                                    </div>
                                                </div>

                                                {errorHuespedes && (
                                                    <p style={{ color: '#e74c3c', fontSize: '13px', margin: '10px 0 0' }}>⚠️ {errorHuespedes}</p>
                                                )}

                                                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '14px' }}>
                                                    <button
                                                        style={styles.btnCancelarExtension}
                                                        onClick={() => {
                                                            setEditandoHuespedes(false);
                                                            setNumAdultos(reserva.num_adultos);
                                                            setNumNinos(reserva.num_ninos);
                                                            setErrorHuespedes('');
                                                        }}
                                                    >
                                                        Cancelar
                                                    </button>
                                                    <button
                                                        style={{ ...styles.btnAgregar, marginTop: 0, opacity: guardandoHuespedes ? 0.7 : 1 }}
                                                        onClick={guardarHuespedes}
                                                        disabled={guardandoHuespedes}
                                                    >
                                                        {guardandoHuespedes ? 'Guardando...' : '💾 Guardar cambios'}
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* PESTAÑA SERVICIOS */}
                            {pestana === 'servicios' && (
                                <div>
                                    <div style={styles.formServicio}>
                                        <h4 style={styles.seccionTitulo}>+ Agregar servicio al total de la reserva</h4>
                                        <div style={styles.grid2}>
                                            <div>
                                                <label style={styles.label}>Tipo de Servicio *</label>
                                                <select style={styles.input}
                                                    value={formServicio.tipo_consumo_id}
                                                    onChange={e => setFormServicio({ ...formServicio, tipo_consumo_id: e.target.value })}>
                                                    <option value="">Seleccionar...</option>
                                                    {tiposConsumo.map(t => (
                                                        <option key={t.id} value={t.id}>{t.nombre}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label style={styles.label}>Descripción</label>
                                                <input style={styles.input} placeholder="Descripción"
                                                    value={formServicio.descripcion}
                                                    onChange={e => setFormServicio({ ...formServicio, descripcion: e.target.value })} />
                                            </div>
                                            <div>
                                                <label style={styles.label}>Cantidad</label>
                                                <input style={styles.input} type="number" min="1"
                                                    value={formServicio.cantidad}
                                                    onChange={e => setFormServicio({ ...formServicio, cantidad: e.target.value })} />
                                            </div>
                                            <div>
                                                <label style={styles.label}>Precio Unitario</label>
                                                <input style={styles.input} type="number"
                                                    value={formServicio.precio_unitario}
                                                    onChange={e => setFormServicio({ ...formServicio, precio_unitario: e.target.value })} />
                                            </div>
                                            <div>
                                                <label style={styles.label}>Fecha</label>
                                                <input style={styles.input} type="date"
                                                    value={formServicio.fecha}
                                                    onChange={e => setFormServicio({ ...formServicio, fecha: e.target.value })} />
                                            </div>
                                        </div>
                                        <div style={{ marginTop: '10px' }}>
                                            <strong>Total: ${(formServicio.cantidad * formServicio.precio_unitario).toLocaleString()}</strong>
                                        </div>
                                        <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <input
                                                type="checkbox"
                                                id="pagoAlMomento"
                                                checked={formServicioPagado}
                                                onChange={(e) => setFormServicioPagado(e.target.checked)}
                                                style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                                            />
                                            <label htmlFor="pagoAlMomento" style={{ cursor: 'pointer', color: '#333', fontSize: '13px' }}>
                                                Marcar como pagado (se registrará como cancelado)
                                            </label>
                                        </div>
                                        <button style={styles.btnAgregar} onClick={agregarServicio}>
                                            Registrar Servicio
                                        </button>
                                    </div>

                                    <h4 style={{ ...styles.seccionTitulo, marginTop: '20px' }}>Consumos Registrados</h4>
                                    {consumos.length === 0 ? (
                                        <p style={{ color: '#999', textAlign: 'center' }}>No hay consumos registrados</p>
                                    ) : (
                                        <table style={styles.tabla}>
                                            <thead>
                                                <tr style={styles.thead}>
                                                    <th style={styles.th}>Servicio</th>
                                                    <th style={styles.th}>Descripción</th>
                                                    <th style={styles.th}>Cant.</th>
                                                    <th style={styles.th}>Precio</th>
                                                    <th style={styles.th}>Total</th>
                                                    <th style={styles.th}>Estado</th>
                                                    <th style={styles.th}>Fecha</th>
                                                    <th style={styles.th}></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {consumos.map(c => {
                                                    const isPagado = c.estado === 'cancelado';
                                                    return (
                                                        <tr key={c.id} style={{...styles.tr, backgroundColor: isPagado ? '#f0f0f0' : 'transparent'}}>
                                                            <td style={styles.td}>{c.tipo_nombre}</td>
                                                            <td style={styles.td}>{c.descripcion || '-'}</td>
                                                            <td style={styles.td}>{c.cantidad}</td>
                                                            <td style={styles.td}>${parseFloat(c.precio_unitario).toLocaleString()}</td>
                                                            <td style={styles.td}><strong>${parseFloat(c.total).toLocaleString()}</strong></td>
                                                            <td style={styles.td}>
                                                                <span style={{
                                                                    padding: '2px 8px',
                                                                    borderRadius: '4px',
                                                                    fontSize: '11px',
                                                                    fontWeight: '600',
                                                                    backgroundColor: isPagado ? '#2ecc71' : '#fff3cd',
                                                                    color: isPagado ? 'white' : '#856404'
                                                                }}>
                                                                    {isPagado ? 'CANCELADO' : 'PENDIENTE'}
                                                                </span>
                                                            </td>
                                                            <td style={styles.td}>{formatFecha(c.fecha)}</td>
                                                            <td style={styles.td}>
                                                                <button style={styles.btnEliminar} onClick={() => eliminarConsumo(c.id)}>✕</button>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    )}
                                    <div style={styles.totalConsumos}>
                                        Total consumos: <strong>${totalConsumos.toLocaleString()}</strong>
                                    </div>
                                </div>
                            )}
                </>
            )}

            {mostrarExtender && reserva && (
                <div style={styles.overlay} onClick={() => setMostrarExtender(false)}>
                    <div style={{ ...styles.modal, width: '400px' }} onClick={(e) => e.stopPropagation()}>
                        <div style={styles.header}>
                            <div>
                                <h2 style={styles.titulo}>Extender estadia</h2>
                                <span style={styles.subtitulo}>Hab. {habitacion.numero}</span>
                            </div>
                            <button style={styles.btnCerrar} onClick={() => setMostrarExtender(false)}>✕</button>
                        </div>
                        <div style={styles.contenido}>
                            <div style={styles.formServicio}>
                                <div style={styles.fila}>
                                    <span style={styles.etiqueta}>Check-out actual</span>
                                    <span style={styles.valor}>{formatFecha(reserva.fecha_salida)}</span>
                                </div>
                                <div style={styles.fila}>
                                    <span style={styles.etiqueta}>Total actual</span>
                                    <span style={styles.valor}>${parseFloat(reserva.total || 0).toLocaleString()}</span>
                                </div>
                                <div style={styles.fila}>
                                    <span style={styles.etiqueta}>Precio por noche</span>
                                    <span style={styles.valor}>${parseFloat(habitacionReserva?.precio_noche || 0).toLocaleString()}</span>
                                </div>
                            </div>

                            <label style={styles.label}>Dias a agregar</label>
                            <input
                                style={{ ...styles.input, marginBottom: '12px' }}
                                type="number"
                                min="1"
                                max="30"
                                value={diasExtra}
                                onChange={(e) => setDiasExtra(Math.max(1, parseInt(e.target.value, 10) || 1))}
                            />

                            {diasExtra > 0 && habitacionReserva?.precio_noche && (
                                <div style={styles.extensionPreview}>
                                    <div style={styles.fila}>
                                        <span style={styles.etiqueta}>Costo dias extra</span>
                                        <span style={{ ...styles.valor, color: '#f39c12', fontWeight: 'bold' }}>
                                            + ${(diasExtra * parseFloat(habitacionReserva.precio_noche)).toLocaleString()}
                                        </span>
                                    </div>
                                    <div style={styles.fila}>
                                        <span style={styles.etiqueta}>Nuevo total</span>
                                        <span style={{ ...styles.valor, color: '#1a1a2e', fontWeight: 'bold' }}>
                                            ${(parseFloat(reserva.total || 0) + diasExtra * parseFloat(habitacionReserva.precio_noche)).toLocaleString()}
                                        </span>
                                    </div>
                                    <div style={styles.fila}>
                                        <span style={styles.etiqueta}>Nuevo check-out</span>
                                        <span style={{ ...styles.valor, color: '#2ecc71', fontWeight: 'bold' }}>
                                            {formatFecha(
                                                new Date(new Date(reserva.fecha_salida).getTime() + diasExtra * 86400000)
                                                    .toISOString().split('T')[0]
                                            )}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {errorExtension && (
                                <p style={styles.errorExtension}>{errorExtension}</p>
                            )}

                            <div style={styles.extensionActions}>
                                <button
                                    style={styles.btnCancelarExtension}
                                    onClick={() => {
                                        setMostrarExtender(false);
                                        setErrorExtension('');
                                    }}
                                >
                                    Cancelar
                                </button>
                                <button
                                    style={{ ...styles.btnAgregar, marginTop: 0, opacity: guardandoExtension ? 0.7 : 1 }}
                                    onClick={extenderReserva}
                                    disabled={guardandoExtension}
                                >
                                    {guardandoExtension ? 'Guardando...' : `Confirmar +${diasExtra} dia(s)`}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {mostrarCambio && reserva && (
                <div style={styles.overlay} onClick={cerrarModalCambio}>
                    <div style={{ ...styles.modal, width: '720px', maxHeight: '85vh' }} onClick={(e) => e.stopPropagation()}>
                        <div style={styles.header}>
                            <div>
                                <h2 style={styles.titulo}>🔄 Cambiar Habitación</h2>
                                <span style={styles.subtitulo}>Reserva #{reserva.id} · Hab. {habitacion.numero} → Mantenimiento</span>
                            </div>
                            <button style={styles.btnCerrar} onClick={cerrarModalCambio}>✕</button>
                        </div>

                        <div style={styles.contenido}>
                            <div style={{ marginBottom: '12px' }}>
                                <strong>📋 Cargos que se transferirán</strong>
                                <div style={{ marginTop: '8px' }}>{clienteNombre}</div>

                                <div style={styles.fila}>
                                    <span style={styles.etiqueta}>Noches</span>
                                    <span style={styles.valor}><strong>{calcularNoches()}</strong></span>
                                </div>
                                <div style={styles.fila}>
                                    <span style={styles.etiqueta}>Personas</span>
                                    <span style={styles.valor}><strong>{reserva.num_adultos} adulto(s) · {reserva.num_ninos} niño(s)</strong></span>
                                </div>
                                <div style={styles.fila}>
                                    <span style={styles.etiqueta}>Check-in → Check-out</span>
                                    <span style={styles.valor}><strong>{formatFecha(reserva.fecha_entrada)}</strong> → <strong>{formatFecha(reserva.fecha_salida)}</strong></span>
                                </div>
                                <div style={styles.fila}>
                                    <span style={styles.etiqueta}>Total reserva</span>
                                    <span style={styles.valor}><strong>${parseFloat(reserva.total || 0).toLocaleString()}</strong></span>
                                </div>
                                <div style={styles.fila}>
                                    <span style={styles.etiqueta}>Consumos pendientes</span>
                                    <span style={styles.valor}><strong>${totalConsumos.toLocaleString()}</strong></span>
                                </div>
                                <div style={styles.fila}>
                                    <span style={styles.etiqueta}>Total final</span>
                                    <span style={styles.valor}><strong>${totalFinal.toLocaleString()}</strong></span>
                                </div>
                            </div>

                            <div style={{ marginBottom: '10px' }}>
                                <label style={styles.label}>⚠️ Motivo del cambio *</label>
                                <input
                                    placeholder="Ej: Problema eléctrico, humedad, daño en baño..."
                                    maxLength={300}
                                    value={motivoCambio}
                                    onChange={(e) => setMotivoCambio(e.target.value)}
                                    style={styles.input}
                                />
                                <div style={{ fontSize: '12px', color: '#666', marginTop: '6px' }}>{motivoCambio.length}/300 · Se guardará en notas de mantenimiento y en la reserva</div>
                            </div>

                            <div style={{ marginBottom: '10px' }}>
                                <label style={styles.label}>🏨 Seleccionar nueva habitación</label>

                                {cargandoHabs ? (
                                    <p style={{ color: '#666' }}>Cargando habitaciones disponibles...</p>
                                ) : habitacionesCambio.length === 0 ? (
                                    <p style={{ color: '#999' }}>No hay habitaciones disponibles para el cambio en este momento</p>
                                ) : (
                                    <div style={{ display: 'grid', gap: '8px' }}>
                                        {habitacionesCambio.map((h) => {
                                            const seleccionada = habSeleccionada?.id === h.id;
                                            const esReservada  = h.motivo_disponible === 'reservada_sin_conflicto';
                                            return (
                                                <div key={h.id} style={{ ...styles.roomCard, borderColor: seleccionada ? '#2563eb' : '#e6e6e6' }} onClick={() => setHabSeleccionada(h)}>
                                                    <div style={styles.roomRow}>
                                                        <div style={{ fontWeight: '700' }}>Hab. {h.numero}</div>
                                                        <div style={styles.roomStatus}>{esReservada ? '📅 Reservada (sin conflicto)' : '✅ Disponible'}</div>
                                                    </div>
                                                    <div style={styles.roomInfo}>
                                                        <div>{h.tipo_nombre} · Piso {h.piso}</div>
                                                        <div>{h.tipo_cama || 'Cama estándar'}</div>
                                                        <div style={{ fontWeight: '700' }}>${parseFloat(h.precio_base || 0).toLocaleString()}/noche</div>
                                                    </div>
                                                    {esReservada && h.proxima_entrada && (
                                                        <div style={{ marginTop: '6px', fontSize: '12px', color: '#666' }}>
                                                            ⚡ Próxima reserva: {new Date(h.proxima_entrada).toLocaleDateString('es-CO', { timeZone: 'UTC' })} (después del checkout actual)
                                                        </div>
                                                    )}
                                                    {seleccionada && <div style={styles.selectedBadge}>✓ Seleccionada</div>}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {habSeleccionada && habitacionReserva && (() => {
                                const diff = parseFloat(habSeleccionada.precio_base || 0) - parseFloat(habitacionReserva.precio_noche || 0);
                                if (diff === 0) return null;
                                return (
                                    <div style={{ marginBottom: '10px', color: '#333' }}>
                                        {diff > 0 ? '⬆️' : '⬇️'} La nueva hab. tiene precio base <strong>{diff > 0 ? 'mayor' : 'menor'}</strong> en <strong>${Math.abs(diff).toLocaleString()}/noche</strong>. El total no se recalcula automáticamente; ajustalo desde Extender o Caja.
                                    </div>
                                );
                            })()}

                            {errorCambio && <p style={{ color: '#e74c3c' }}>⚠️ {errorCambio}</p>}

                            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '12px' }}>
                                <button style={styles.btnCancelarExtension} onClick={cerrarModalCambio}>Cancelar</button>
                                <button
                                    style={{ ...styles.btnAgregar, opacity: guardandoCambio ? 0.7 : 1 }}
                                    onClick={ejecutarCambio}
                                    disabled={guardandoCambio || !habSeleccionada || !motivoCambio.trim()}
                                >
                                    {guardandoCambio ? 'Realizando cambio...' : `Confirmar cambio → Hab. ${habSeleccionada?.numero || '?'}`}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL PARA PRÓXIMAS LLEGADAS */}
            {mostrarProximas && (
                <div style={styles.overlay} onClick={() => setMostrarProximas(false)}>
                    <div style={{ ...styles.modal, width: '800px' }} onClick={(event) => event.stopPropagation()}>
                        <div style={styles.header}>
                            <div>
                                <h2 style={styles.titulo}>📅 Próximas Llegadas</h2>
                                <span style={styles.subtitulo}>{habitacion.numero} - {habitacion.tipo_nombre}</span>
                            </div>
                            <button style={styles.btnCerrar} onClick={() => setMostrarProximas(false)}>✕</button>
                        </div>

                        <div style={styles.contenido}>
                            {reservasFuturas.length === 0 ? (
                                <p style={styles.sinReserva}>No hay reservas futuras programadas para esta habitación</p>
                            ) : (
                                <div style={styles.listaProximas}>
                                    {reservasFuturas.map((r) => {
                                        const noches = Math.round((new Date(r.fecha_salida) - new Date(r.fecha_entrada)) / (1000 * 60 * 60 * 24));
                                        return (
                                            <div key={r.id} style={styles.tarjetaProximaGrande}>
                                                <div style={styles.tarjetaHeaderGrande}>
                                                    <div>
                                                        <span style={styles.numeroReservaGrande}>Reserva #{r.id}</span>
                                                        <span style={{...styles.badge, backgroundColor: r.estado === 'confirmada' ? '#2ecc71' : '#f39c12', marginLeft: '10px'}}>
                                                            {r.estado?.toUpperCase()}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div style={styles.grid2}>
                                                    <div>
                                                        <div style={styles.filaProxima}>
                                                            <span style={styles.etiqueta}>Huésped</span>
                                                            <span style={{...styles.valor, fontWeight: 'bold', fontSize: '14px'}}>{r.cliente_nombre || '-'}</span>
                                                        </div>
                                                        <div style={styles.filaProxima}>
                                                            <span style={styles.etiqueta}>Check-in</span>
                                                            <span style={styles.valor}>{formatFecha(r.fecha_entrada)}</span>
                                                        </div>
                                                        <div style={styles.filaProxima}>
                                                            <span style={styles.etiqueta}>Check-out</span>
                                                            <span style={styles.valor}>{formatFecha(r.fecha_salida)}</span>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div style={styles.filaProxima}>
                                                            <span style={styles.etiqueta}>Noches</span>
                                                            <span style={{...styles.valor, fontWeight: 'bold'}}>{noches}</span>
                                                        </div>
                                                        <div style={styles.filaProxima}>
                                                            <span style={styles.etiqueta}>Total</span>
                                                            <span style={{...styles.valor, color: '#2ecc71', fontWeight: 'bold'}}>
                                                                ${parseFloat(r.total || 0).toLocaleString()}
                                                            </span>
                                                        </div>
                                                        <div style={styles.filaProxima}>
                                                            <span style={styles.etiqueta}>Anticipo</span>
                                                            <span style={{...styles.valor, color: '#f39c12'}}>
                                                                ${parseFloat(r.anticipo || 0).toLocaleString()}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            {exitoCambio && (
                <div style={styles.toastExito}>
                    ✅ Habitación cambiada: <strong>{exitoCambio.origen}</strong> → <strong>{exitoCambio.destino}</strong>. La hab. {exitoCambio.origen} pasó a Mantenimiento. Motivo: {exitoCambio.motivo}
                </div>
            )}
        </ModalBase>
    );
}

const styles = {
    overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
    modal: { backgroundColor: 'white', borderRadius: '12px', width: '750px', maxWidth: '95vw', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 40px rgba(0,0,0,0.3)' },
    header: { backgroundColor: '#1a1a2e', padding: '20px 25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    headerActions: { display: 'flex', alignItems: 'center', gap: '10px' },
    titulo: { margin: 0, color: 'white', fontSize: '20px' },
    subtitulo: { color: '#aaa', fontSize: '13px' },
    btnExtender: { backgroundColor: '#2563eb', border: 'none', color: 'white', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' },
    btnCaja: { backgroundColor: '#f39c12', border: 'none', color: 'white', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' },
    btnCerrar: { backgroundColor: 'transparent', border: '1px solid #666', color: 'white', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', fontSize: '16px' },
    footer: { padding: '0 25px 20px', display: 'flex', gap: '10px', flexWrap: 'wrap' },
    pestanas: { display: 'flex', borderBottom: '1px solid #eee', padding: '0 20px' },
    pestana: { padding: '12px 20px', border: 'none', backgroundColor: 'transparent', cursor: 'pointer', fontSize: '14px', transition: 'all 0.2s' },
    contenido: { padding: '20px 25px', overflowY: 'auto', flex: 1 },
    loading: { textAlign: 'center', color: '#666', padding: '30px' },
    sinReserva: { textAlign: 'center', color: '#999', padding: '30px' },
    grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' },
    seccion: { marginBottom: '15px' },
    seccionTitulo: { margin: '0 0 12px 0', color: '#1a1a2e', borderBottom: '1px solid #eee', paddingBottom: '6px' },
    fila: { display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f5f5f5' },
    etiqueta: { color: '#666', fontSize: '13px' },
    valor: { color: '#333', fontSize: '13px' },
    observaciones: { backgroundColor: '#f9f9f9', padding: '10px', borderRadius: '6px', fontSize: '13px', marginTop: '10px' },
    formServicio: { backgroundColor: '#f9f9f9', padding: '15px', borderRadius: '8px', marginBottom: '15px' },
    label: { display: 'block', fontSize: '12px', color: '#666', marginBottom: '4px' },
    input: { width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '13px', boxSizing: 'border-box' },
    btnAgregar: { marginTop: '12px', padding: '10px 20px', backgroundColor: '#1a1a2e', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' },
    tabla: { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
    thead: { backgroundColor: '#f0f2f5' },
    th: { padding: '8px 10px', textAlign: 'left', color: '#333', fontWeight: '600' },
    tr: { borderBottom: '1px solid #eee' },
    td: { padding: '8px 10px', color: '#333' },
    btnEliminar: { backgroundColor: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', padding: '3px 8px', cursor: 'pointer', fontSize: '12px' },
    totalConsumos: { textAlign: 'right', marginTop: '10px', fontSize: '14px', color: '#333' },
    extensionPreview: { backgroundColor: '#e8f5e9', borderRadius: '8px', padding: '12px', marginBottom: '12px' },
    errorExtension: { color: '#e74c3c', fontSize: '13px', marginBottom: '10px' },
    extensionActions: { display: 'flex', gap: '10px', justifyContent: 'flex-end' },
    btnCancelarExtension: { backgroundColor: '#95a5a6', color: 'white', padding: '8px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer' },
    btnCambio: { backgroundColor: '#6b7280', border: 'none', color: 'white', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' },
    btnContador: { width: '32px', height: '32px', borderRadius: '6px', border: '1px solid #ddd', backgroundColor: 'white', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' },
    toastExito: { position: 'fixed', right: '18px', bottom: '18px', backgroundColor: '#2ecc71', color: 'white', padding: '12px 16px', borderRadius: '8px', boxShadow: '0 6px 18px rgba(0,0,0,0.2)', zIndex: 1100, maxWidth: '360px', fontSize: '14px' },
    roomCard: { border: '1px solid #e6e6e6', borderRadius: '8px', padding: '10px', cursor: 'pointer', backgroundColor: 'white' },
    roomRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' },
    roomInfo: { display: 'flex', gap: '12px', fontSize: '13px', color: '#444', justifyContent: 'space-between' },
    roomStatus: { fontSize: '13px', color: '#666' },
    selectedBadge: { marginTop: '8px', display: 'inline-block', padding: '4px 8px', backgroundColor: '#2563eb', color: 'white', borderRadius: '6px', fontSize: '12px', fontWeight: '700' },
    
    // ESTILOS PARA PRÓXIMAS LLEGADAS MODAL
    listaProximas: { display: 'flex', flexDirection: 'column', gap: '12px' },
    tarjetaProximaGrande: { 
        backgroundColor: '#f9f9f9', 
        border: '1px solid #e0e0e0', 
        borderRadius: '8px', 
        padding: '14px', 
        borderLeft: '4px solid #f39c12' 
    },
    tarjetaHeaderGrande: { 
        marginBottom: '10px', 
        paddingBottom: '10px', 
        borderBottom: '1px solid #eee' 
    },
    numeroReservaGrande: { 
        fontWeight: 'bold', 
        fontSize: '15px', 
        color: '#1a1a2e' 
    },
    badge: { 
        padding: '3px 8px', 
        borderRadius: '4px', 
        fontSize: '11px', 
        fontWeight: 'bold', 
        color: 'white' 
    },
    filaProxima: { 
        display: 'flex', 
        justifyContent: 'space-between', 
        padding: '5px 0', 
        borderBottom: '1px solid #f0f0f0' 
    }
};

export default ModalHabitacion;