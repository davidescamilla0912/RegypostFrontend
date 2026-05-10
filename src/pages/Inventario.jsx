import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import inventarioService from '../services/inventarioService';
import reservaService from '../services/reservaService';
import consumoService from '../services/consumoService';
import ModalHabitacion from '../components/ModalHabitacion';
import { AppButton, PageHeader } from '../components/ui';
import '../components/ui/ui.css';

const normalizarLista = (res) => (
    Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res?.data?.data)
            ? res.data.data
            : []
);

const normalizarTexto = (valor) => String(valor || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

function Inventario() {
    const [productos, setProductos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filtro, setFiltro] = useState('todos');
    const [mostrarFormulario, setMostrarFormulario] = useState(false);
    const [mostrarMovimiento, setMostrarMovimiento] = useState(false);
    const [mostrarMovimientoHabitacion, setMostrarMovimientoHabitacion] = useState(false);
    const [mensajeExito, setMensajeExito] = useState('');
    const [productoSeleccionado, setProductoSeleccionado] = useState(null);
    const [productoSeleccionadoHabitacion, setProductoSeleccionadoHabitacion] = useState(null);
    const [tiposConsumo, setTiposConsumo] = useState([]);
    const [habitacionesActivas, setHabitacionesActivas] = useState([]);
    const [cargandoHabitacionesActivas, setCargandoHabitacionesActivas] = useState(false);
    const [formData, setFormData] = useState({
        nombre: '', categoria: '', precio_unitario: 0, stock_minimo: 5, stock_inicial: 0
    });
    const [movData, setMovData] = useState({
        producto_id: '', tipo_movimiento: 'entrada', cantidad: 1,
        referencia: '', observacion: ''
    });
    const [movHabitacionData, setMovHabitacionData] = useState({
        producto_id: '',
        tipo_movimiento: 'salida',
        cantidad: 1,
        reserva_habitacion_id: '',
        tipo_consumo_id: '',
        referencia: '',
        observacion: ''
    });
    const [movHabitacionPagado, setMovHabitacionPagado] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        cargarProductos();
    }, [filtro]);

    useEffect(() => {
        cargarDatosComplementarios();
    }, []);

    const cargarProductos = async () => {
        try {
            let res;
            if (filtro === 'reponer') {
                res = await inventarioService.getPorReponer();
            } else {
                res = await inventarioService.getAll();
            }
            setProductos(res.data);
        } catch (err) {
            console.error('Error cargando inventario', err);
        } finally {
            setLoading(false);
        }
    };

    const cargarDatosComplementarios = async () => {
        await Promise.all([
            cargarHabitacionesActivas(),
            cargarTiposConsumo()
        ]);
    };

    const cargarTiposConsumo = async () => {
        try {
            const res = await consumoService.getTipos();
            setTiposConsumo(normalizarLista(res));
        } catch (err) {
            console.error('Error cargando tipos de consumo', err);
        }
    };

    const cargarHabitacionesActivas = async () => {
        try {
            setCargandoHabitacionesActivas(true);
            const resReservas = await reservaService.getByEstado('checkin');
            const reservasActivas = normalizarLista(resReservas);

            const opciones = (await Promise.all(reservasActivas.map(async (reserva) => {
                if (!reserva?.id) return [];
                try {
                    const resHabitaciones = await reservaService.getHabitaciones(reserva.id);
                    const habitacionesReserva = normalizarLista(resHabitaciones);

                    return habitacionesReserva.map((detalle) => {
                        const habitacionId = detalle.habitacion_id || detalle.habitacion?.id || null;
                        const numero = detalle.numero || detalle.habitacion?.numero || habitacionId || '-';
                        return {
                            reserva_id: reserva.id,
                            reserva_habitacion_id: detalle.id,
                            habitacion_id: habitacionId,
                            numero,
                            label: `Reserva #${reserva.id} - Hab. ${numero}${reserva.cliente_nombre ? ` - ${reserva.cliente_nombre}` : ''}`
                        };
                    });
                } catch (err) {
                    console.warn(`No se pudieron cargar las habitaciones de la reserva ${reserva.id}`, err);
                    return [];
                }
            }))).flat();

            setHabitacionesActivas(opciones);
        } catch (err) {
            console.error('Error cargando habitaciones activas', err);
            setHabitacionesActivas([]);
        } finally {
            setCargandoHabitacionesActivas(false);
        }
    };

    const getTipoConsumoIdSugerido = (producto) => {
        if (!tiposConsumo.length) return '';

        const nombreProducto = normalizarTexto(producto?.nombre);
        const categoriaProducto = normalizarTexto(producto?.categoria);

        const coincidencia = tiposConsumo.find((tipo) => {
            const nombreTipo = normalizarTexto(tipo?.nombre);
            return (
                (nombreProducto && nombreTipo.includes(nombreProducto))
                || (nombreProducto && nombreProducto.includes(nombreTipo))
                || (categoriaProducto && nombreTipo.includes(categoriaProducto))
                || (categoriaProducto && categoriaProducto.includes(nombreTipo))
            );
        });

        return coincidencia?.id || tiposConsumo[0]?.id || '';
    };

    const mostrarExito = (mensaje) => {
        setMensajeExito(mensaje);
        window.clearTimeout(window.__inventarioSuccessTimer);
        window.__inventarioSuccessTimer = window.setTimeout(() => {
            setMensajeExito('');
        }, 3500);
    };

    const crearProducto = async () => {
    try {
        const res = await inventarioService.create(formData);
        const productoId = res.data.id;
        if (formData.stock_inicial > 0) {
            await inventarioService.registrarMovimiento({
                producto_id: productoId,
                tipo_movimiento: 'entrada',
                cantidad: parseInt(formData.stock_inicial),
                referencia: 'stock_inicial',
                observacion: 'Stock inicial al crear producto'
            });
        }
        setMostrarFormulario(false);
        setFormData({ nombre: '', categoria: '', precio_unitario: 0, stock_minimo: 5, stock_inicial: 0 });
        mostrarExito('Producto registrado correctamente.');
        cargarProductos();
    } catch (err) {
        console.error('Error creando producto', err);
    }
};

    const registrarMovimiento = async () => {
        try {
            await inventarioService.registrarMovimiento(movData);
            setMostrarMovimiento(false);
            setMovData({ producto_id: '', tipo_movimiento: 'entrada', cantidad: 1, referencia: '', observacion: '' });
            mostrarExito('Movimiento registrado correctamente en inventario.');
            cargarProductos();
        } catch (err) {
            console.error('Error registrando movimiento', err);
        }
    };

    const abrirMovimientoHabitacion = (producto = null) => {
        setProductoSeleccionadoHabitacion(producto);
        setMovHabitacionPagado(false);
        setMovHabitacionData({
            producto_id: producto?.id || '',
            tipo_movimiento: 'salida',
            cantidad: 1,
            reserva_habitacion_id: '',
            tipo_consumo_id: getTipoConsumoIdSugerido(producto),
            referencia: '',
            observacion: ''
        });
        setMostrarMovimientoHabitacion(true);
    };

    const registrarMovimientoHabitacion = async () => {
        try {
            const productoId = Number(movHabitacionData.producto_id);
            const reservaHabitacionId = Number(movHabitacionData.reserva_habitacion_id);
            const cantidad = Math.max(parseInt(movHabitacionData.cantidad, 10) || 1, 1);

            if (!productoId || !reservaHabitacionId) {
                return;
            }

            const producto = productos.find((p) => String(p.id) === String(productoId)) || productoSeleccionadoHabitacion;
            const tipoConsumoId = movHabitacionData.tipo_consumo_id || getTipoConsumoIdSugerido(producto);

            await inventarioService.registrarMovimiento({
                producto_id: productoId,
                tipo_movimiento: movHabitacionData.tipo_movimiento,
                cantidad,
                referencia: movHabitacionData.referencia || `habitacion_${reservaHabitacionId}`,
                observacion: movHabitacionData.observacion || `Movimiento a habitación ${reservaHabitacionId}`
            });

            await consumoService.create({
                tipo_consumo_id: tipoConsumoId,
                descripcion: producto?.nombre || 'Producto de inventario',
                cantidad,
                precio_unitario: Number(producto?.precio_unitario) || 0,
                fecha: new Date().toISOString().split('T')[0],
                reserva_habitacion_id: reservaHabitacionId,
                estado: movHabitacionPagado ? 'cancelado' : 'pendiente'
            });

            setMostrarMovimientoHabitacion(false);
            setProductoSeleccionadoHabitacion(null);
            setMovHabitacionPagado(false);
            setMovHabitacionData({
                producto_id: '',
                tipo_movimiento: 'salida',
                cantidad: 1,
                reserva_habitacion_id: '',
                tipo_consumo_id: '',
                referencia: '',
                observacion: ''
            });

            mostrarExito('Movimiento registrado correctamente y cargado a la habitación.');

            await cargarProductos();
        } catch (err) {
            console.error('Error registrando movimiento a habitación', err);
        }
    };

    const abrirMovimiento = (producto) => {
        setProductoSeleccionado(producto);
        setMovData({ ...movData, producto_id: producto.id });
        setMostrarMovimiento(true);
    };

    const eliminar = async (id) => {
        if (window.confirm('¿Desactivar este producto?')) {
            await inventarioService.delete(id);
            cargarProductos();
        }
    };

    if (loading) return <p className="page-loading">Cargando inventario...</p>;

    return (
        <div className="page-container">
            <PageHeader
                title="Inventario"
                onBack={() => navigate('/dashboard')}
                backLabel="← Volver"
                actions={(
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        <AppButton onClick={() => abrirMovimientoHabitacion()}>
                            + Movimiento Habitación
                        </AppButton>
                        <AppButton onClick={() => setMostrarFormulario(!mostrarFormulario)}>
                            + Nuevo Producto
                        </AppButton>
                    </div>
                )}
            />

            {mensajeExito && (
                <div className="panel" style={{ borderLeft: '4px solid #2ecc71', marginBottom: '16px' }}>
                    <strong style={{ color: '#27ae60' }}>{mensajeExito}</strong>
                </div>
            )}

            <ModalHabitacion
                open={mostrarFormulario}
                title="Nuevo Producto"
                subtitle="Registra el producto base y su stock inicial si corresponde."
                onClose={() => setMostrarFormulario(false)}
                width="620px"
                footer={(
                    <>
                        <AppButton variant="info" onClick={crearProducto}>Guardar</AppButton>
                        <AppButton variant="danger" onClick={() => setMostrarFormulario(false)}>Cancelar</AppButton>
                    </>
                )}
            >
                <div className="form-grid">
                    <div>
                        <label className="label">Nombre *</label>
                        <input className="input-base full-width" placeholder="Nombre *"
                            value={formData.nombre}
                            onChange={e => setFormData({ ...formData, nombre: e.target.value })} />
                    </div>
                    <div>
                        <label className="label">Categoria</label>
                        <input className="input-base full-width" placeholder="Categoria"
                            value={formData.categoria}
                            onChange={e => setFormData({ ...formData, categoria: e.target.value })} />
                    </div>
                    <div className="form-grid form-grid--2">
                        <div>
                            <label className="label">Precio unitario</label>
                            <input className="input-base full-width" placeholder="Precio unitario" type="number"
                                value={formData.precio_unitario}
                                onChange={e => setFormData({ ...formData, precio_unitario: e.target.value })} />
                        </div>
                        <div>
                            <label className="label">Stock minimo</label>
                            <input className="input-base full-width" placeholder="Stock minimo" type="number"
                                value={formData.stock_minimo}
                                onChange={e => setFormData({ ...formData, stock_minimo: e.target.value })} />
                        </div>
                    </div>
                    <div>
                        <label className="label">Stock inicial</label>
                        <input className="input-base full-width" placeholder="Stock inicial" type="number"
                            value={formData.stock_inicial}
                            onChange={e => setFormData({ ...formData, stock_inicial: e.target.value })} />
                    </div>
                </div>
            </ModalHabitacion>

            <ModalHabitacion
                open={mostrarMovimiento}
                title={`Registrar Movimiento${productoSeleccionado?.nombre ? ` - ${productoSeleccionado.nombre}` : ''}`}
                subtitle="Este movimiento modifica el stock general del producto."
                onClose={() => setMostrarMovimiento(false)}
                width="680px"
                footer={(
                    <>
                        <AppButton variant="info" onClick={registrarMovimiento}>Registrar</AppButton>
                        <AppButton variant="danger" onClick={() => setMostrarMovimiento(false)}>Cancelar</AppButton>
                    </>
                )}
            >
                <div className="form-grid form-grid--2">
                    <div>
                        <label className="label">Tipo de movimiento</label>
                        <select className="select-base full-width"
                            value={movData.tipo_movimiento}
                            onChange={e => setMovData({ ...movData, tipo_movimiento: e.target.value })}>
                            <option value="entrada">Entrada</option>
                            <option value="salida">Salida</option>
                            <option value="ajuste">Ajuste</option>
                        </select>
                    </div>
                    <div>
                        <label className="label">Cantidad</label>
                        <input className="input-base full-width" placeholder="Cantidad" type="number"
                            value={movData.cantidad}
                            onChange={e => setMovData({ ...movData, cantidad: e.target.value })} />
                    </div>
                    <div>
                        <label className="label">Referencia</label>
                        <input className="input-base full-width" placeholder="Referencia"
                            value={movData.referencia}
                            onChange={e => setMovData({ ...movData, referencia: e.target.value })} />
                    </div>
                    <div>
                        <label className="label">Observacion</label>
                        <input className="input-base full-width" placeholder="Observacion"
                            value={movData.observacion}
                            onChange={e => setMovData({ ...movData, observacion: e.target.value })} />
                    </div>
                </div>
            </ModalHabitacion>

            <ModalHabitacion
                open={mostrarMovimientoHabitacion}
                title="Registrar Movimiento a Habitación"
                subtitle="Este movimiento carga el producto a la habitación y registra el consumo en su reserva."
                onClose={() => setMostrarMovimientoHabitacion(false)}
                width="820px"
                footer={(
                    <>
                        <AppButton variant="info" onClick={registrarMovimientoHabitacion}>Registrar en Habitación</AppButton>
                        <AppButton variant="danger" onClick={() => setMostrarMovimientoHabitacion(false)}>Cancelar</AppButton>
                    </>
                )}
            >
                <div className="form-grid form-grid--2">
                    <div>
                        <label className="label">Producto *</label>
                        <select
                            className="select-base full-width"
                            value={movHabitacionData.producto_id}
                            onChange={e => {
                                const producto = productos.find((p) => String(p.id) === String(e.target.value));
                                setProductoSeleccionadoHabitacion(producto || null);
                                setMovHabitacionData({
                                    ...movHabitacionData,
                                    producto_id: e.target.value,
                                    tipo_consumo_id: getTipoConsumoIdSugerido(producto)
                                });
                            }}
                        >
                            <option value="">Seleccionar producto...</option>
                            {productos.map((p) => (
                                <option key={p.id} value={p.id}>{p.nombre}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="label">Habitación / Reserva *</label>
                        <select
                            className="select-base full-width"
                            value={movHabitacionData.reserva_habitacion_id}
                            onChange={e => setMovHabitacionData({ ...movHabitacionData, reserva_habitacion_id: e.target.value })}
                        >
                            <option value="">Seleccionar habitación activa...</option>
                            {habitacionesActivas.map((opcion) => (
                                <option key={opcion.reserva_habitacion_id} value={opcion.reserva_habitacion_id}>
                                    {opcion.label}
                                </option>
                            ))}
                        </select>
                        {cargandoHabitacionesActivas && <small className="muted">Cargando habitaciones activas...</small>}
                        {!cargandoHabitacionesActivas && habitacionesActivas.length === 0 && (
                            <small className="muted">No hay habitaciones ocupadas disponibles para asociar consumo.</small>
                        )}
                    </div>
                    <div>
                        <label className="label">Tipo de movimiento</label>
                        <select
                            className="select-base full-width"
                            value={movHabitacionData.tipo_movimiento}
                            onChange={e => setMovHabitacionData({ ...movHabitacionData, tipo_movimiento: e.target.value })}
                        >
                            <option value="salida">Salida</option>
                            <option value="entrada">Entrada</option>
                            <option value="ajuste">Ajuste</option>
                        </select>
                    </div>
                    <div>
                        <label className="label">Cantidad</label>
                        <input
                            className="input-base full-width"
                            type="number"
                            min="1"
                            value={movHabitacionData.cantidad}
                            onChange={e => setMovHabitacionData({ ...movHabitacionData, cantidad: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="label">Tipo de consumo</label>
                        <select
                            className="select-base full-width"
                            value={movHabitacionData.tipo_consumo_id}
                            onChange={e => setMovHabitacionData({ ...movHabitacionData, tipo_consumo_id: e.target.value })}
                        >
                            <option value="">Seleccionar tipo...</option>
                            {tiposConsumo.map((tipo) => (
                                <option key={tipo.id} value={tipo.id}>{tipo.nombre}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="label">Referencia</label>
                        <input
                            className="input-base full-width"
                            placeholder="Referencia"
                            value={movHabitacionData.referencia}
                            onChange={e => setMovHabitacionData({ ...movHabitacionData, referencia: e.target.value })}
                        />
                    </div>
                    <div className="form-grid__full">
                        <label className="label">Observación</label>
                        <input
                            className="input-base full-width"
                            placeholder="Observación"
                            value={movHabitacionData.observacion}
                            onChange={e => setMovHabitacionData({ ...movHabitacionData, observacion: e.target.value })}
                        />
                    </div>
                    <div className="form-grid__full" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
                        <input
                            type="checkbox"
                            id="pagoAlMomentoHabitacion"
                            checked={movHabitacionPagado}
                            onChange={(e) => setMovHabitacionPagado(e.target.checked)}
                            style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                        />
                        <label htmlFor="pagoAlMomentoHabitacion" style={{ cursor: 'pointer', color: '#333', fontSize: '13px', margin: 0 }}>
                            Marcar como pagado (se registrará como cancelado)
                        </label>
                    </div>
                </div>
            </ModalHabitacion>

            <div className="toolbar">
                {['todos', 'reponer'].map(f => (
                    <AppButton
                        key={f}
                        size="sm"
                        variant={filtro === f ? 'primary' : 'secondary'}
                        onClick={() => setFiltro(f)}
                    >
                        {f === 'todos' ? 'Todos' : '⚠️ Por Reponer'}
                    </AppButton>
                ))}
            </div>

            <div className="cards-grid cards-grid--md">
                {productos.map(p => (
                    <div key={p.id} className="entity-card">
                        <div className="entity-card__header">
                            <h3 className="entity-card__title">{p.nombre}</h3>
                            <span className="badge" style={{
                                backgroundColor: p.alerta === 'REPONER' ? '#e74c3c' : '#2ecc71'
                            }}>
                                {p.alerta}
                            </span>
                        </div>
                        <p className="entity-card__text">📦 Categoria: {p.categoria || '-'}</p>
                        <p className="entity-card__text">💰 Precio: ${p.precio_unitario?.toLocaleString()}</p>
                        <p className="entity-card__text">📊 Stock minimo: {p.stock_minimo}</p>
                        <p style={{
                            fontSize: '16px',
                            fontWeight: 'bold',
                            margin: '8px 0',
                            color: p.alerta === 'REPONER' ? '#e74c3c' : '#2ecc71'
                        }}>
                            Stock actual: {p.stock_actual}
                        </p>
                        <div className="row-actions mt-10">
                            <AppButton variant="info" size="sm"
                                onClick={() => abrirMovimiento(p)}>
                                + Movimiento
                            </AppButton>
                            <AppButton variant="secondary" size="sm"
                                onClick={() => abrirMovimientoHabitacion(p)}>
                                Habitación
                            </AppButton>
                            <AppButton variant="danger" size="sm"
                                onClick={() => eliminar(p.id)}>
                                Desactivar
                            </AppButton>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default Inventario;