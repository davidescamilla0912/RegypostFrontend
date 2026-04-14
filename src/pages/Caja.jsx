import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import cajaService from '../services/cajaService';
import pagoService from '../services/pagoService';
import { AppButton, DataTable, PageHeader } from '../components/ui';
import '../components/ui/ui.css';

function Caja() {
    const [cuadres, setCuadres] = useState([]);
    const [pagosOriginales, setPagosOriginales] = useState([]);
    const [pagos, setPagos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [mostrarFormulario, setMostrarFormulario] = useState(false);
    const [editando, setEditando] = useState(null);
    const [filtroFecha, setFiltroFecha] = useState('');
    const [mostrarResumenCobro, setMostrarResumenCobro] = useState(false);
    const [guardandoPago, setGuardandoPago] = useState(false);
    const [mensajePago, setMensajePago] = useState('');
    const [errorPago, setErrorPago] = useState('');
    const [formPago, setFormPago] = useState({
        fecha_pago: new Date().toISOString().slice(0, 10),
        metodo: 'efectivo',
        referencia: '',
        notas: ''
    });
    const location = useLocation();
    const pagoDesdeHabitacion = location.state || null;
    const [formData, setFormData] = useState({
        fecha: '',
        empleado_id: '',
        saldo_anterior: 0,
        efectivo: 0,
        gastos_turno: 0,
        tarjetas: 0,
        consignacion: 0,
        factura_cxc: 0,
        factura_credito: 0,
        total_movimiento: 0,
        observaciones: ''
    });
    const navigate = useNavigate();

    const formatMoney = (value) => `$${parseFloat(value || 0).toLocaleString()}`;

    const formatFechaPago = (value) => {
        if (!value) return '-';

        const fecha = new Date(value);
        if (Number.isNaN(fecha.getTime())) return value;

        return new Intl.DateTimeFormat('es-CO', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        }).format(fecha);
    };

    const fechaClave = (value) => {
        if (!value) return '';

        if (typeof value === 'string') {
            const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
            if (match?.[1]) return match[1];
        }

        const fecha = new Date(value);
        if (Number.isNaN(fecha.getTime())) return '';

        const year = fecha.getUTCFullYear();
        const month = String(fecha.getUTCMonth() + 1).padStart(2, '0');
        const day = String(fecha.getUTCDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const getEmpleadoSesionId = () => {
        try {
            const empleadoSesion = JSON.parse(localStorage.getItem('empleado') || '{}');
            return empleadoSesion?.id || '';
        } catch (err) {
            return '';
        }
    };

    const buildNotasPago = () => {
        if (!pagoDesdeHabitacion) return '';

        const consumosTexto = Array.isArray(pagoDesdeHabitacion?.consumos)
            ? pagoDesdeHabitacion.consumos
                .map((consumo) => `${consumo.tipo_nombre || 'Consumo'}: ${consumo.descripcion || 'Sin descripción'} (${formatMoney(consumo.total)})`)
                .join(' | ')
            : '';

        return [
            `Reserva #${pagoDesdeHabitacion?.reserva?.id || '-'}`,
            `Habitación ${pagoDesdeHabitacion?.habitacion?.numero || '-'}`,
            `Cliente ${pagoDesdeHabitacion?.cliente?.nombre || '-'} ${pagoDesdeHabitacion?.cliente?.documento || ''}`.trim(),
            `Total final ${formatMoney(pagoDesdeHabitacion?.resumenPago?.totalFinal || 0)}`,
            consumosTexto ? `Consumos: ${consumosTexto}` : ''
        ].filter(Boolean).join(' | ');
    };

    useEffect(() => {
        cargarDatos();
    }, []);

    const normalizarLista = (res) => (
        Array.isArray(res?.data)
            ? res.data
            : Array.isArray(res?.data?.data)
                ? res.data.data
                : []
    );

    const cargarCuadres = async () => {
        try {
            const res = await cajaService.getAll();
            setCuadres(normalizarLista(res));
        } catch (err) {
            console.error('Error cargando cuadres', err);
        }
    };

    const cargarPagos = async () => {
        try {
            const res = await pagoService.getAll();
            const listaPagos = normalizarLista(res);
            const pagosOrdenados = [...listaPagos].sort((a, b) => {
                const fechaA = new Date(a?.fecha_pago || a?.fecha || 0).getTime();
                const fechaB = new Date(b?.fecha_pago || b?.fecha || 0).getTime();
                return fechaB - fechaA;
            });
            setPagosOriginales(pagosOrdenados);
            setPagos(pagosOrdenados);
        } catch (err) {
            console.error('Error cargando pagos', err);
            setPagosOriginales([]);
            setPagos([]);
        }
    };

    const cargarDatos = async () => {
        try {
            setLoading(true);
            await Promise.all([cargarCuadres(), cargarPagos()]);
        } finally {
            setLoading(false);
        }
    };

    const filtrarPorFecha = async () => {
        if (!filtroFecha) {
            setPagos(pagosOriginales);
            return cargarCuadres();
        }

        const pagosFiltrados = pagosOriginales.filter(
            (pago) => fechaClave(pago.fecha_pago || pago.fecha) === filtroFecha
        );
        setPagos(pagosFiltrados);

        try {
            const res = await cajaService.getByFecha(filtroFecha);
            setCuadres(normalizarLista(res));
        } catch (err) {
            console.error('Error filtrando', err);
        }
    };

    const calcularTotal = (data) => {
        return (
            parseFloat(data.efectivo || 0) +
            parseFloat(data.tarjetas || 0) +
            parseFloat(data.consignacion || 0) +
            parseFloat(data.factura_cxc || 0) +
            parseFloat(data.factura_credito || 0) -
            parseFloat(data.gastos_turno || 0)
        );
    };

    const pagoResumen = pagoDesdeHabitacion?.resumenPago || null;
    const reservaCaja = pagoDesdeHabitacion?.reserva || null;
    const habitacionCaja = pagoDesdeHabitacion?.habitacion || null;
    const clienteCaja = pagoDesdeHabitacion?.cliente || null;
    const consumosCaja = Array.isArray(pagoDesdeHabitacion?.consumos) ? pagoDesdeHabitacion.consumos : [];

    useEffect(() => {
        if (pagoResumen) {
            setMostrarResumenCobro(true);
        }
    }, [pagoResumen]);

    useEffect(() => {
        if (!pagoResumen) {
            setMostrarResumenCobro(false);
            return;
        }

        setFormPago((prev) => ({
            ...prev,
            fecha_pago: prev.fecha_pago || new Date().toISOString().slice(0, 10),
            notas: prev.notas || buildNotasPago()
        }));
    }, [pagoResumen]);

    const registrarPago = async () => {
        if (!pagoResumen || !reservaCaja) return;

        try {
            setGuardandoPago(true);
            setMensajePago('');
            setErrorPago('');

            const payload = {
                reserva_id: reservaCaja.id,
                empleado_id: pagoDesdeHabitacion?.empleado_id || getEmpleadoSesionId() || null,
                monto: pagoResumen.totalFinal,
                metodo: formPago.metodo,
                referencia: formPago.referencia?.trim() || '',
                fecha_pago: formPago.fecha_pago || new Date().toISOString().slice(0, 10),
                notas: formPago.notas?.trim() || buildNotasPago()
            };

            await pagoService.create(payload);
            setMensajePago('Pago registrado correctamente en la tabla pagos.');
            await cargarPagos();
        } catch (err) {
            console.error('Error guardando pago', err);
            const backendMessage = err?.response?.data?.message || err?.response?.data?.error || err?.response?.data?.detail;
            setErrorPago(backendMessage || 'No se pudo registrar el pago.');
        } finally {
            setGuardandoPago(false);
        }
    };

    const guardar = async () => {
        try {
            const dataFinal = {
                ...formData,
                total_movimiento: calcularTotal(formData)
            };
            if (editando) {
                await cajaService.update(editando, dataFinal);
            } else {
                await cajaService.create(dataFinal);
            }
            setMostrarFormulario(false);
            setEditando(null);
            setFormData({
                fecha: '', empleado_id: '', saldo_anterior: 0, efectivo: 0,
                gastos_turno: 0, tarjetas: 0, consignacion: 0,
                factura_cxc: 0, factura_credito: 0, total_movimiento: 0, observaciones: ''
            });
            cargarCuadres();
        } catch (err) {
            console.error('Error guardando cuadre', err);
        }
    };

    const editar = (cuadre) => {
        setEditando(cuadre.id);
        setFormData({
            fecha: cuadre.fecha,
            empleado_id: cuadre.empleado_id || '',
            saldo_anterior: cuadre.saldo_anterior,
            efectivo: cuadre.efectivo,
            gastos_turno: cuadre.gastos_turno,
            tarjetas: cuadre.tarjetas,
            consignacion: cuadre.consignacion,
            factura_cxc: cuadre.factura_cxc,
            factura_credito: cuadre.factura_credito,
            total_movimiento: cuadre.total_movimiento,
            observaciones: cuadre.observaciones || ''
        });
        setMostrarFormulario(true);
    };

    const eliminar = async (id) => {
        if (window.confirm('¿Eliminar este cuadre?')) {
            await cajaService.delete(id);
            cargarCuadres();
        }
    };

    const columns = [
        { key: 'id', label: 'ID' },
        { key: 'fecha', label: 'Fecha' },
        { key: 'empleado', label: 'Empleado' },
        { key: 'efectivo', label: 'Efectivo' },
        { key: 'tarjetas', label: 'Tarjetas' },
        { key: 'gastos', label: 'Gastos' },
        { key: 'total', label: 'Total' },
        { key: 'acciones', label: 'Acciones' }
    ];

    const paymentColumns = [
        { key: 'id', label: 'ID' },
        { key: 'reserva_id', label: 'Reserva ID' },
        { key: 'empleado_id', label: 'Empleado ID' },
        { key: 'metodo', label: 'Método' },
        { key: 'monto', label: 'Monto' },
        { key: 'referencia', label: 'Referencia' },
        { key: 'fecha_pago', label: 'Fecha pago' },
        { key: 'notas', label: 'Notas' }
    ];

    if (loading) return <p className="page-loading">Cargando cuadres...</p>;

    return (
        <div className="page-container">
            <PageHeader
                title="Cuadre de Caja"
                onBack={() => navigate('/dashboard')}
                backLabel="← Volver"
                actions={(
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {pagoResumen && (
                            <AppButton
                                variant="secondary"
                                onClick={() => setMostrarResumenCobro((prev) => !prev)}
                            >
                                {mostrarResumenCobro ? 'Ocultar cobro' : 'Ver cobro enviado'}
                            </AppButton>
                        )}
                        <AppButton onClick={() => {
                            setEditando(null);
                            setFormData({
                                fecha: '', empleado_id: '', saldo_anterior: 0, efectivo: 0,
                                gastos_turno: 0, tarjetas: 0, consignacion: 0,
                                factura_cxc: 0, factura_credito: 0, total_movimiento: 0, observaciones: ''
                            });
                            setMostrarFormulario(!mostrarFormulario);
                        }}>
                            + Nuevo Cuadre
                        </AppButton>
                    </div>
                )}
            />

            {pagoResumen && mostrarResumenCobro && (
                <div className="panel" style={{ marginBottom: '16px', border: '1px solid #f39c12' }}>
                    <h3 className="panel-title" style={{ marginBottom: '12px' }}>Cobro enviado desde habitación</h3>
                    <div className="form-grid form-grid--3">
                        <div>
                            <strong>Cliente</strong>
                            <div>{clienteCaja?.nombre || '-'}</div>
                            <div>{clienteCaja?.documento || '-'}</div>
                        </div>
                        <div>
                            <strong>Habitación</strong>
                            <div>{habitacionCaja?.numero ? `Hab. ${habitacionCaja.numero}` : '-'}</div>
                            <div>{habitacionCaja?.tipo_nombre || ''}{habitacionCaja?.piso ? ` - Piso ${habitacionCaja.piso}` : ''}</div>
                        </div>
                        <div>
                            <strong>Reserva</strong>
                            <div>#{reservaCaja?.id || '-'}</div>
                            <div>{reservaCaja?.estado || '-'}</div>
                        </div>
                        <div>
                            <strong>Check-in</strong>
                            <div>{reservaCaja?.fecha_entrada || '-'}</div>
                        </div>
                        <div>
                            <strong>Check-out</strong>
                            <div>{reservaCaja?.fecha_salida || '-'}</div>
                        </div>
                        <div>
                            <strong>Empleado</strong>
                            <div>{pagoDesdeHabitacion?.empleado || '-'}</div>
                        </div>
                    </div>
                    <div className="preview-box" style={{ marginTop: '12px' }}>
                        <strong>Total reserva: {formatMoney(pagoResumen.totalReserva)}</strong><br />
                        <strong>Consumos: {formatMoney(pagoResumen.totalConsumos)}</strong><br />
                        <strong>Anticipo: {formatMoney(pagoResumen.anticipo)}</strong><br />
                        <strong>Saldo pendiente: {formatMoney(pagoResumen.saldoPendiente)}</strong><br />
                        <strong>Total final a cobrar: {formatMoney(pagoResumen.totalFinal)}</strong>
                    </div>
                    {consumosCaja.length > 0 && (
                        <div style={{ marginTop: '12px' }}>
                            <strong>Consumos cargados:</strong>
                            <ul style={{ margin: '8px 0 0 18px' }}>
                                {consumosCaja.map((consumo) => (
                                    <li key={consumo.id || `${consumo.tipo_nombre}-${consumo.fecha}`}>
                                        {consumo.tipo_nombre} - {consumo.descripcion || 'Sin descripción'} - {formatMoney(consumo.total)}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <div style={{ marginTop: '16px' }}>
                        <h4 className="panel-title" style={{ marginBottom: '12px' }}>Registrar pago</h4>
                        <div className="form-grid form-grid--3">
                            <div>
                                <label className="label">Fecha de pago</label>
                                <input
                                    className="input-base full-width"
                                    type="date"
                                    value={formPago.fecha_pago}
                                    onChange={(e) => setFormPago((prev) => ({ ...prev, fecha_pago: e.target.value }))}
                                />
                            </div>
                            <div>
                                <label className="label">Método</label>
                                <select
                                    className="select-base full-width"
                                    value={formPago.metodo}
                                    onChange={(e) => setFormPago((prev) => ({ ...prev, metodo: e.target.value }))}
                                >
                                    <option value="efectivo">Efectivo</option>
                                    <option value="tarjeta">Tarjeta</option>
                                    <option value="transferencia">Transferencia</option>
                                    <option value="mixto">Mixto</option>
                                </select>
                            </div>
                            <div>
                                <label className="label">Referencia</label>
                                <input
                                    className="input-base full-width"
                                    placeholder="Referencia"
                                    value={formPago.referencia}
                                    onChange={(e) => setFormPago((prev) => ({ ...prev, referencia: e.target.value }))}
                                />
                            </div>
                            <div className="full-width" style={{ gridColumn: '1 / -1' }}>
                                <label className="label">Notas</label>
                                <textarea
                                    className="input-base full-width"
                                    rows={3}
                                    value={formPago.notas}
                                    onChange={(e) => setFormPago((prev) => ({ ...prev, notas: e.target.value }))}
                                />
                            </div>
                        </div>

                        {mensajePago && <p style={{ marginTop: '12px', color: '#27ae60', fontWeight: '600' }}>{mensajePago}</p>}
                        {errorPago && <p className="error-text" style={{ marginTop: '12px' }}>{errorPago}</p>}

                        <div className="form-actions" style={{ justifyContent: 'flex-end' }}>
                            <AppButton variant="info" onClick={registrarPago} disabled={guardandoPago}>
                                {guardandoPago ? 'Guardando...' : `Registrar pago por ${formatMoney(pagoResumen.totalFinal)}`}
                            </AppButton>
                        </div>
                    </div>
                </div>
            )}

            {mostrarFormulario && (
                <div className="panel">
                    <h3 className="panel-title">{editando ? 'Editar Cuadre' : 'Nuevo Cuadre'}</h3>
                    <div className="form-grid form-grid--3">
                        <div>
                            <label className="label">Fecha *</label>
                            <input className="input-base full-width" type="date"
                                value={formData.fecha}
                                onChange={e => setFormData({ ...formData, fecha: e.target.value })} />
                        </div>
                        <div>
                            <label className="label">Empleado ID</label>
                            <input className="input-base full-width" type="number" placeholder="ID del empleado"
                                value={formData.empleado_id}
                                onChange={e => setFormData({ ...formData, empleado_id: e.target.value })} />
                        </div>
                        <div>
                            <label className="label">Saldo Anterior</label>
                            <input className="input-base full-width" type="number"
                                value={formData.saldo_anterior}
                                onChange={e => setFormData({ ...formData, saldo_anterior: e.target.value })} />
                        </div>
                        <div>
                            <label className="label">Efectivo</label>
                            <input className="input-base full-width" type="number"
                                value={formData.efectivo}
                                onChange={e => setFormData({ ...formData, efectivo: e.target.value })} />
                        </div>
                        <div>
                            <label className="label">Gastos Turno</label>
                            <input className="input-base full-width" type="number"
                                value={formData.gastos_turno}
                                onChange={e => setFormData({ ...formData, gastos_turno: e.target.value })} />
                        </div>
                        <div>
                            <label className="label">Tarjetas</label>
                            <input className="input-base full-width" type="number"
                                value={formData.tarjetas}
                                onChange={e => setFormData({ ...formData, tarjetas: e.target.value })} />
                        </div>
                        <div>
                            <label className="label">Consignacion</label>
                            <input className="input-base full-width" type="number"
                                value={formData.consignacion}
                                onChange={e => setFormData({ ...formData, consignacion: e.target.value })} />
                        </div>
                        <div>
                            <label className="label">Factura CXC</label>
                            <input className="input-base full-width" type="number"
                                value={formData.factura_cxc}
                                onChange={e => setFormData({ ...formData, factura_cxc: e.target.value })} />
                        </div>
                        <div>
                            <label className="label">Factura Credito</label>
                            <input className="input-base full-width" type="number"
                                value={formData.factura_credito}
                                onChange={e => setFormData({ ...formData, factura_credito: e.target.value })} />
                        </div>
                        <div>
                            <label className="label">Observaciones</label>
                            <input className="input-base full-width" placeholder="Observaciones"
                                value={formData.observaciones}
                                onChange={e => setFormData({ ...formData, observaciones: e.target.value })} />
                        </div>
                    </div>
                    <div className="preview-box">
                        <strong>Total calculado: ${calcularTotal(formData).toLocaleString()}</strong>
                    </div>
                    <div className="form-actions">
                        <AppButton variant="info" onClick={guardar}>
                            {editando ? 'Actualizar' : 'Guardar'}
                        </AppButton>
                        <AppButton variant="danger" onClick={() => setMostrarFormulario(false)}>Cancelar</AppButton>
                    </div>
                </div>
            )}

            <div className="toolbar">
                <input className="input-base" type="date"
                    value={filtroFecha}
                    onChange={e => setFiltroFecha(e.target.value)} />
                <AppButton onClick={filtrarPorFecha}>Filtrar</AppButton>
                <AppButton variant="secondary" onClick={() => {
                    setFiltroFecha('');
                    setPagos(pagosOriginales);
                    cargarCuadres();
                }}>Limpiar</AppButton>
            </div>

            <div className="panel" style={{ marginTop: '20px' }}>
                <h3 className="panel-title">Historial de pagos de reservas</h3>
                <DataTable
                    columns={paymentColumns}
                    data={pagos}
                    rowKey="id"
                    renderCell={(pago, column) => {
                        if (column.key === 'id') return `#${pago.id}`;
                        if (column.key === 'reserva_id') return pago.reserva_id ?? '-';
                        if (column.key === 'empleado_id') return pago.empleado_id ?? '-';
                        if (column.key === 'metodo') return pago.metodo || '-';
                        if (column.key === 'monto') return `$${parseFloat(pago.monto || 0).toLocaleString()}`;
                        if (column.key === 'referencia') return pago.referencia || '-';
                        if (column.key === 'fecha_pago') return formatFechaPago(pago.fecha_pago || pago.fecha);
                        if (column.key === 'notas') return pago.notas || '-';
                        return '-';
                    }}
                    emptyMessage="No hay pagos registrados todavía."
                />
            </div>
        </div>
    );
}

export default Caja;