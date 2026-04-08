import { useState, useEffect } from 'react';
import reservaService from '../services/reservaService';
import consumoService from '../services/consumoService';
import clienteService from '../services/clienteService';
import empleadoService from '../services/empleadoService';

function ModalHabitacion({ habitacion, onClose, onUpdate }) {
    const [pestana, setPestana] = useState('reserva');
    const [reserva, setReserva] = useState(null);
    const [habitacionReserva, setHabitacionReserva] = useState(null);
    const [clienteDetalle, setClienteDetalle] = useState(null);
    const [empleadoNombre, setEmpleadoNombre] = useState('');
    const [consumos, setConsumos] = useState([]);
    const [tiposConsumo, setTiposConsumo] = useState([]);
    const [loading, setLoading] = useState(true);
    const [formServicio, setFormServicio] = useState({
        tipo_consumo_id: '',
        descripcion: '',
        cantidad: 1,
        precio_unitario: 0,
        fecha: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        cargarDatos();
    }, [habitacion]);

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
        try {
            setLoading(true);
            setClienteDetalle(null);
            setEmpleadoNombre('');
            // 1. Obtener reservas en checkin
            const resReservas = await reservaService.getByEstado('checkin');
            // 2. Buscar la reserva de esta habitación
            const reservasCheckin = resReservas.data;
            
            let reservaEncontrada = null;
            let habitacionReservaEncontrada = null;

            for (const r of reservasCheckin) {
                const resHabs = await reservaService.getHabitaciones(r.id);
                const habEnReserva = resHabs.data.find(h => h.habitacion_id === habitacion.id);
                if (habEnReserva) {
                    reservaEncontrada = r;
                    habitacionReservaEncontrada = habEnReserva;
                    break;
                }
            }

            if (reservaEncontrada) {
                setReserva(reservaEncontrada);
                setHabitacionReserva(habitacionReservaEncontrada);
                await resolveClienteYEmpleado(reservaEncontrada);
                const resConsumos = await consumoService.getByReserva(reservaEncontrada.id);
                setConsumos(resConsumos.data);
            }

            const resTipos = await consumoService.getTipos();
            setTiposConsumo(resTipos.data);
        } catch (err) {
            console.error('Error cargando datos', err);
        } finally {
            setLoading(false);
        }
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
                reserva_habitacion_id: habitacionReserva.id
            });
            setFormServicio({
                tipo_consumo_id: '',
                descripcion: '',
                cantidad: 1,
                precio_unitario: 0,
                fecha: new Date().toISOString().split('T')[0]
            });
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

    const totalConsumos = consumos.reduce((sum, c) => sum + parseFloat(c.total || 0), 0);
    const totalReserva = toNumber(reserva?.total);
    const anticipo = toNumber(reserva?.anticipo);
    const totalFinal = Math.max(totalReserva + totalConsumos - anticipo, 0);

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

    return (
        <div style={styles.overlay} onClick={onClose}>
            <div style={styles.modal} onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div style={styles.header}>
                    <div>
                        <h2 style={styles.titulo}>Hab. {habitacion.numero}</h2>
                        <span style={styles.subtitulo}>{habitacion.tipo_nombre} — Piso {habitacion.piso}</span>
                    </div>
                    <button style={styles.btnCerrar} onClick={onClose}>✕</button>
                </div>

                {/* Pestañas */}
                <div style={styles.pestanas}>
                    {['reserva', 'huesped', 'servicios'].map(p => (
                        <button key={p} style={{
                            ...styles.pestana,
                            borderBottom: pestana === p ? '3px solid #1a1a2e' : '3px solid transparent',
                            color: pestana === p ? '#1a1a2e' : '#666',
                            fontWeight: pestana === p ? 'bold' : 'normal'
                        }} onClick={() => setPestana(p)}>
                            {p === 'reserva' ? '📋 Reserva' : p === 'huesped' ? '👤 Huésped' : '🛎️ Servicios'}
                        </button>
                    ))}
                </div>

                {/* Contenido */}
                <div style={styles.contenido}>
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
                                </div>
                            )}

                            {/* PESTAÑA SERVICIOS */}
                            {pestana === 'servicios' && (
                                <div>
                                    <div style={styles.formServicio}>
                                        <h4 style={styles.seccionTitulo}>+ Agregar Servicio</h4>
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
                                                    <th style={styles.th}>Fecha</th>
                                                    <th style={styles.th}></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {consumos.map(c => (
                                                    <tr key={c.id} style={styles.tr}>
                                                        <td style={styles.td}>{c.tipo_nombre}</td>
                                                        <td style={styles.td}>{c.descripcion || '-'}</td>
                                                        <td style={styles.td}>{c.cantidad}</td>
                                                        <td style={styles.td}>${parseFloat(c.precio_unitario).toLocaleString()}</td>
                                                        <td style={styles.td}><strong>${parseFloat(c.total).toLocaleString()}</strong></td>
                                                        <td style={styles.td}>{formatFecha(c.fecha)}</td>
                                                        <td style={styles.td}>
                                                            <button style={styles.btnEliminar} onClick={() => eliminarConsumo(c.id)}>✕</button>
                                                        </td>
                                                    </tr>
                                                ))}
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
                </div>
            </div>
        </div>
    );
}

const styles = {
    overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
    modal: { backgroundColor: 'white', borderRadius: '12px', width: '750px', maxWidth: '95vw', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 40px rgba(0,0,0,0.3)' },
    header: { backgroundColor: '#1a1a2e', padding: '20px 25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    titulo: { margin: 0, color: 'white', fontSize: '20px' },
    subtitulo: { color: '#aaa', fontSize: '13px' },
    btnCerrar: { backgroundColor: 'transparent', border: '1px solid #666', color: 'white', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', fontSize: '16px' },
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
    totalConsumos: { textAlign: 'right', marginTop: '10px', fontSize: '14px', color: '#333' }
};

export default ModalHabitacion;