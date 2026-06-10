import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import cajaService from '../services/cajaService';
import pagoService from '../services/pagoService';
import empleadoService from '../services/empleadoService';
import useReservaPagada from '../hooks/useReservaPagada';
import ReservaPagadaBadge from '../components/ui/ReservaPagadaBadge';
import { AppButton, DataTable, PageHeader } from '../components/ui';
import '../components/ui/ui.css';

function Caja() {
    const [cuadres, setCuadres] = useState([]);
    const [empleados, setEmpleados] = useState([]);
    const [pagosOriginales, setPagosOriginales] = useState([]);
    const [pagos, setPagos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [mostrarFormulario, setMostrarFormulario] = useState(false);
    const [editando, setEditando] = useState(null);
    const [filtroFecha, setFiltroFecha] = useState('');
    const [mostrarResumenCobro, setMostrarResumenCobro] = useState(false);
    const [mostrarAbono, setMostrarAbono] = useState(false);
    const [guardandoPago, setGuardandoPago] = useState(false);
    const [editandoPago, setEditandoPago] = useState(null);
    const [guardandoEdicionPago, setGuardandoEdicionPago] = useState(false);
    const [mensajePago, setMensajePago] = useState('');
    const [mensajeEdicionPago, setMensajeEdicionPago] = useState('');
    const [errorPago, setErrorPago] = useState('');
    const [errorEdicionPago, setErrorEdicionPago] = useState('');
    const [montoAbono, setMontoAbono] = useState('');
    const [totalPagadoAcumulado, setTotalPagadoAcumulado] = useState(0);
    const [formPago, setFormPago] = useState({
        fecha_pago: new Date().toISOString().slice(0, 10),
        hora_pago: new Date().toISOString().slice(11, 16),
        metodo: 'efectivo',
        referencia: '',
        notas: ''
    });
    const location = useLocation();
    const navigate = useNavigate();

    // ── Datos enviados desde Habitaciones / CheckOut ───────────────────────────
    const pagoDesdeHabitacion = location.state || null;
    const pagoResumen = pagoDesdeHabitacion?.resumenPago || null;
    const reservaCaja = pagoDesdeHabitacion?.reserva || null;
    const habitacionCaja = pagoDesdeHabitacion?.habitacion || null;
    const clienteCaja = pagoDesdeHabitacion?.cliente || null;
    const consumosCaja = Array.isArray(pagoDesdeHabitacion?.consumos) ? pagoDesdeHabitacion.consumos : [];

    // ── Hook: verificar si esta reserva ya fue pagada ─────────────────────────
    const {
        pagada: reservaYaPagada,
        totalPagado,
        loading: loadingPago,
        recargar: recargarPago
    } = useReservaPagada({
        reservaId: reservaCaja?.id,
        totalARecaudar: pagoResumen?.totalFinal || 0,
    });

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

    // ─────────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────────
    const formatMoney = (value) => `$${parseFloat(value || 0).toLocaleString()}`;

    const formatFechaPago = (value) => {
        if (!value) return '-';
        const fecha = new Date(value);
        if (Number.isNaN(fecha.getTime())) return value;
        return new Intl.DateTimeFormat('es-CO', {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit'
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
        const y = fecha.getUTCFullYear();
        const m = String(fecha.getUTCMonth() + 1).padStart(2, '0');
        const d = String(fecha.getUTCDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    };

    const getEmpleadoSesionId = () => {
        try { return JSON.parse(localStorage.getItem('empleado') || '{}')?.id || ''; }
        catch { return ''; }
    };

    const buildNotasPago = () => {
        if (!pagoDesdeHabitacion) return '';
        const consumosTexto = consumosCaja
            .map(c => `${c.tipo_nombre || 'Consumo'}: ${c.descripcion || 'Sin descripción'} (${formatMoney(c.total)})`)
            .join(' | ');
        return [
            `Reserva #${reservaCaja?.id || '-'}`,
            `Habitación ${habitacionCaja?.numero || '-'}`,
            `Cliente ${clienteCaja?.nombre || '-'} ${clienteCaja?.documento || ''}`.trim(),
            `Total final ${formatMoney(pagoResumen?.totalFinal || 0)}`,
            consumosTexto ? `Consumos: ${consumosTexto}` : ''
        ].filter(Boolean).join(' | ');
    };

    // ─────────────────────────────────────────────────────────────────────────
    // Carga de datos
    // ─────────────────────────────────────────────────────────────────────────
    const normalizarLista = (res) => (
        Array.isArray(res?.data) ? res.data
            : Array.isArray(res?.data?.data) ? res.data.data
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
            const lista = normalizarLista(res);
            const ordenados = [...lista].sort((a, b) =>
                new Date(b?.fecha_pago || b?.fecha || 0) - new Date(a?.fecha_pago || a?.fecha || 0)
            );
            setPagosOriginales(ordenados);
            setPagos(ordenados);
        } catch (err) {
            console.error('Error cargando pagos', err);
            setPagosOriginales([]);
            setPagos([]);
        }
    };

    const cargarEmpleados = async () => {
        try {
            const res = await empleadoService.getAll();
            setEmpleados(normalizarLista(res));
        } catch (err) {
            console.error('Error cargando empleados', err);
            setEmpleados([]);
        }
    };

    const cargarDatos = async () => {
        try {
            setLoading(true);
            await Promise.all([cargarCuadres(), cargarPagos(), cargarEmpleados()]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { cargarDatos(); }, []);

    // Cuando hay datos de pago desde otra pantalla, inicializar las notas
    useEffect(() => {
        if (!pagoResumen) {
            setMostrarResumenCobro(false);
            return;
        }
        setFormPago(prev => ({
            ...prev,
            fecha_pago: prev.fecha_pago || new Date().toISOString().slice(0, 10),
            hora_pago: prev.hora_pago || new Date().toISOString().slice(11, 16),
            notas: prev.notas || buildNotasPago()
        }));
    }, [pagoResumen]);

    // Mostrar panel solo si tiene datos Y la reserva no está pagada
    useEffect(() => {
        if (pagoResumen && !loadingPago) {
            setMostrarResumenCobro(!reservaYaPagada);
        }
    }, [pagoResumen, reservaYaPagada, loadingPago]);

    // ─────────────────────────────────────────────────────────────────────────
    // Acciones
    // ─────────────────────────────────────────────────────────────────────────
    const getEmpleadoNombre = (pago) => {
        const id = pago?.empleado_id;
        if (!id) return '-';
        const emp = empleados.find(e => String(e.id) === String(id));
        if (!emp) return `ID ${id}`;
        return `${emp.nombre || ''} ${emp.apellido || ''}`.trim() || emp.usuario || `ID ${id}`;
    };

    const filtrarPorFecha = async () => {
        if (!filtroFecha) {
            setPagos(pagosOriginales);
            return cargarCuadres();
        }
        const filtrados = pagosOriginales.filter(
            p => fechaClave(p.fecha_pago || p.fecha) === filtroFecha
        );
        setPagos(filtrados);
        try {
            const res = await cajaService.getByFecha(filtroFecha);
            setCuadres(normalizarLista(res));
        } catch (err) {
            console.error('Error filtrando', err);
        }
    };

    const calcularTotal = (data) => (
        parseFloat(data.tarjetas || 0)
        + parseFloat(data.consignacion || 0)
        + parseFloat(data.factura_cxc || 0)
        + parseFloat(data.factura_credito || 0)
        - parseFloat(data.gastos_turno || 0)
    );

    const abrirEdicionPago = (pago) => {
        setEditandoPago(pago);
        setMensajeEdicionPago('');
        setErrorEdicionPago('');
        setFormPago({
            fecha_pago: (pago?.fecha_pago || pago?.fecha || '').substring(0, 10),
            hora_pago: (pago?.fecha_pago || pago?.fecha || '').substring(11, 16) || '00:00',
            metodo: pago?.metodo || 'efectivo',
            referencia: pago?.referencia || '',
            notas: pago?.notas || ''
        });
    };

    const cancelarEdicionPago = () => {
        setEditandoPago(null);
        setMensajeEdicionPago('');
        setErrorEdicionPago('');
        setFormPago({
            fecha_pago: new Date().toISOString().slice(0, 10),
            hora_pago: new Date().toISOString().slice(11, 16),
            metodo: 'efectivo',
            referencia: '',
            notas: ''
        });
    };

    const guardarEdicionPago = async () => {
        if (!editandoPago?.id) return;
        try {
            setGuardandoEdicionPago(true);
            setMensajeEdicionPago('');
            setErrorEdicionPago('');

            const fechaIso = new Date(`${formPago.fecha_pago}T${formPago.hora_pago}:00`).toISOString();
            await pagoService.update(editandoPago.id, {
                reserva_id: editandoPago.reserva_id || null,
                empleado_id: editandoPago.empleado_id || null,
                monto: editandoPago.monto,
                metodo: formPago.metodo,
                referencia: formPago.referencia?.trim() || '',
                fecha_pago: fechaIso,
                notas: formPago.notas?.trim() || ''
            });
            setMensajeEdicionPago('Pago actualizado correctamente.');
            await cargarPagos();
        } catch (err) {
            const msg = err?.response?.data?.message || err?.response?.data?.error || err?.response?.data?.detail;
            setErrorEdicionPago(msg || 'No se pudo actualizar el pago.');
        } finally {
            setGuardandoEdicionPago(false);
        }
    };

    const registrarPago = async () => {
        if (!pagoResumen || !reservaCaja) return;
        try {
            setGuardandoPago(true);
            setMensajePago('');
            setErrorPago('');

            const fechaIso = new Date(`${formPago.fecha_pago}T${formPago.hora_pago}:00`).toISOString();
            const payload = {
                reserva_id: reservaCaja.id,
                empleado_id: pagoDesdeHabitacion?.empleado_id || getEmpleadoSesionId() || null,
                monto: pagoResumen.totalFinal,
                metodo: formPago.metodo,
                referencia: formPago.referencia?.trim() || '',
                fecha_pago: fechaIso,
                notas: formPago.notas?.trim() || buildNotasPago()
            };

            await pagoService.create(payload);
            await cargarPagos();
            await recargarPago(); // actualizar hook inmediatamente

            setMensajePago('Pago registrado correctamente.');

            // Ocultar panel de cobro después de un breve momento
            setTimeout(() => {
                setMostrarResumenCobro(false);
                navigate('/checkout', { state: { reservaId: reservaCaja.id } });
            }, 1500);
        } catch (err) {
            const msg = err?.response?.data?.message || err?.response?.data?.error || err?.response?.data?.detail;
            setErrorPago(msg || 'No se pudo registrar el pago.');
        } finally {
            setGuardandoPago(false);
        }
    };

    const registrarAbono = async () => {
        if (!pagoResumen || !reservaCaja || !montoAbono || parseFloat(montoAbono) <= 0) {
            setErrorPago('Por favor ingresa un monto válido para el abono.');
            return;
        }

        const monto = parseFloat(montoAbono);
        if (monto > pagoResumen.totalFinal) {
            setErrorPago(`El abono no puede exceder el total final de ${formatMoney(pagoResumen.totalFinal)}`);
            return;
        }

        try {
            setGuardandoPago(true);
            setMensajePago('');
            setErrorPago('');

            const fechaIso = new Date(`${formPago.fecha_pago}T${formPago.hora_pago}:00`).toISOString();
            const payload = {
                reserva_id: reservaCaja.id,
                empleado_id: pagoDesdeHabitacion?.empleado_id || getEmpleadoSesionId() || null,
                monto: monto,
                metodo: formPago.metodo,
                referencia: formPago.referencia?.trim() || '',
                fecha_pago: fechaIso,
                notas: (formPago.notas?.trim() || buildNotasPago()) + ` | ABONO PARCIAL: ${formatMoney(monto)}`
            };

            await pagoService.create(payload);
            await cargarPagos();
            await recargarPago();

            setMensajePago(`Abono de ${formatMoney(monto)} registrado correctamente.`);
            setMontoAbono('');
            setMostrarAbono(false);

            setTimeout(() => {
                setMostrarResumenCobro(false);
            }, 2000);
        } catch (err) {
            const msg = err?.response?.data?.message || err?.response?.data?.error || err?.response?.data?.detail;
            setErrorPago(msg || 'No se pudo registrar el abono.');
        } finally {
            setGuardandoPago(false);
        }
    };

    const guardar = async () => {
        try {
            const dataFinal = { ...formData, total_movimiento: calcularTotal(formData) };
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

    // ─────────────────────────────────────────────────────────────────────────
    // Columnas
    // ─────────────────────────────────────────────────────────────────────────
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
        { key: 'empleado', label: 'Empleado' },
        { key: 'metodo', label: 'Método' },
        { key: 'monto', label: 'Monto' },
        { key: 'referencia', label: 'Referencia' },
        { key: 'fecha_pago', label: 'Fecha pago' },
        { key: 'notas', label: 'Notas' },
        { key: 'acciones', label: 'Acciones' }
    ];

    if (loading) return <p className="page-loading">Cargando cuadres...</p>;

    // ─────────────────────────────────────────────────────────────────────────
    // RENDER
    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className="page-container">
            <PageHeader
                title="Cuadre de Caja"
                onBack={() => navigate('/dashboard')}
                backLabel="← Volver"
                actions={(
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {/* Botón toggle solo si hay datos de pago y la reserva NO está pagada */}
                        {pagoResumen && !loadingPago && !reservaYaPagada && (
                            <AppButton variant="secondary"
                                onClick={() => setMostrarResumenCobro(prev => !prev)}>
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

            {/* ── Banner: reserva ya pagada (cuando vienen datos desde otra pantalla) ── */}
            {pagoResumen && !loadingPago && reservaYaPagada && (
                <div className="panel" style={{
                    marginBottom: '16px',
                    border: '1px solid #a9dfbf',
                    backgroundColor: '#eafaf1',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    padding: '16px 20px'
                }}>
                    <ReservaPagadaBadge pagada size="lg" />
                    <div>
                        <p style={{ margin: 0, fontWeight: 600, color: '#1e8449' }}>
                            Reserva #{reservaCaja?.id} — {clienteCaja?.nombre || '-'}
                        </p>
                        <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#27ae60' }}>
                            Esta reserva ya fue cobrada. Pago total registrado: {formatMoney(totalPagado)}.
                            Puedes consultar el detalle en el historial de pagos.
                        </p>
                    </div>
                </div>
            )}

            {/* ── Panel de cobro (solo si NO está pagada) ── */}
            {pagoResumen && mostrarResumenCobro && !reservaYaPagada && (
                <div className="panel" style={{ marginBottom: '16px', border: '1px solid #f39c12' }}>
                    <h3 className="panel-title" style={{ marginBottom: '12px' }}>
                        Cobro enviado desde habitación
                    </h3>
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
                        <div><strong>Check-in</strong><div>{reservaCaja?.fecha_entrada || '-'}</div></div>
                        <div><strong>Check-out</strong><div>{reservaCaja?.fecha_salida || '-'}</div></div>
                        <div><strong>Empleado</strong><div>{pagoDesdeHabitacion?.empleado || '-'}</div></div>
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
                                {consumosCaja.map(c => (
                                    <li key={c.id || `${c.tipo_nombre}-${c.fecha}`}>
                                        {c.tipo_nombre} — {c.descripcion || 'Sin descripción'} — {formatMoney(c.total)}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Formulario de pago */}
                    <div style={{ marginTop: '16px' }}>
                        <h4 className="panel-title" style={{ marginBottom: '12px' }}>Registrar pago</h4>
                        <div className="form-grid form-grid--3">
                            <div>
                                <label className="label">Fecha de pago</label>
                                <input className="input-base full-width" type="date"
                                    value={formPago.fecha_pago}
                                    onChange={e => setFormPago(prev => ({ ...prev, fecha_pago: e.target.value }))} />
                            </div>
                            <div>
                                <label className="label">Hora de pago</label>
                                <input className="input-base full-width" type="time"
                                    value={formPago.hora_pago}
                                    onChange={e => setFormPago(prev => ({ ...prev, hora_pago: e.target.value }))} />
                            </div>
                            <div>
                                <label className="label">Método</label>
                                <select className="select-base full-width"
                                    value={formPago.metodo}
                                    onChange={e => setFormPago(prev => ({ ...prev, metodo: e.target.value }))}>
                                    <option value="efectivo">Efectivo</option>
                                    <option value="tarjeta_debito">Tarjeta débito</option>
                                    <option value="tarjeta_credito">Tarjeta crédito</option>
                                    <option value="transferencia">Transferencia</option>
                                    <option value="nequi">Nequi</option>
                                    <option value="daviplata">Daviplata</option>
                                    <option value="consignacion">Consignación</option>
                                    <option value="cxc">CXC</option>
                                    <option value="credito">Crédito</option>
                                    <option value="canje">Canje</option>
                                    <option value="otro">Otro</option>
                                </select>
                            </div>
                            <div>
                                <label className="label">Referencia</label>
                                <input className="input-base full-width" placeholder="Referencia"
                                    value={formPago.referencia}
                                    onChange={e => setFormPago(prev => ({ ...prev, referencia: e.target.value }))} />
                            </div>
                            <div style={{ gridColumn: '1 / -1' }}>
                                <label className="label">Notas</label>
                                <textarea className="input-base full-width" rows={3}
                                    value={formPago.notas}
                                    onChange={e => setFormPago(prev => ({ ...prev, notas: e.target.value }))} />
                            </div>
                        </div>

                        {mensajePago && (
                            <p style={{ marginTop: '12px', color: '#27ae60', fontWeight: '600' }}>{mensajePago}</p>
                        )}
                        {errorPago && (
                            <p className="error-text" style={{ marginTop: '12px' }}>{errorPago}</p>
                        )}

                        <div className="form-actions" style={{ justifyContent: 'flex-end', gap: '8px' }}>
                            <AppButton variant="info" onClick={registrarPago} disabled={guardandoPago}>
                                {guardandoPago ? 'Guardando...' : `Registrar pago por ${formatMoney(pagoResumen.totalFinal)}`}
                            </AppButton>
                            <AppButton variant="secondary"
                                onClick={() => setMostrarAbono(prev => !prev)}
                                disabled={guardandoPago}>
                                {mostrarAbono ? 'Ocultar abono' : 'Registrar abono'}
                            </AppButton>
                        </div>

                        {mostrarAbono && (
                            <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#f8f9fa', borderRadius: '4px', border: '1px solid #dee2e6' }}>
                                <h5 style={{ margin: '0 0 12px 0', color: '#495057' }}>Registrar abono parcial</h5>
                                <div className="form-grid form-grid--2">
                                    <div>
                                        <label className="label">Saldo pendiente</label>
                                        <input className="input-base full-width" type="text"
                                            value={formatMoney(pagoResumen.totalFinal)} disabled />
                                    </div>
                                    <div>
                                        <label className="label">Monto del abono *</label>
                                        <input className="input-base full-width" type="number"
                                            placeholder="Ej: 800000"
                                            value={montoAbono}
                                            onChange={e => setMontoAbono(e.target.value)}
                                            min="0"
                                            max={pagoResumen.totalFinal} />
                                    </div>
                                </div>
                                {montoAbono && (
                                    <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#e8f4f8', borderRadius: '3px' }}>
                                        <strong>Saldo pendiente después del abono:</strong> {formatMoney(pagoResumen.totalFinal - parseFloat(montoAbono || 0))}
                                    </div>
                                )}
                                <div className="form-actions" style={{ justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                                    <AppButton variant="success"
                                        onClick={registrarAbono}
                                        disabled={guardandoPago || !montoAbono || parseFloat(montoAbono) <= 0}>
                                        {guardandoPago ? 'Registrando...' : 'Registrar abono'}
                                    </AppButton>
                                    <AppButton variant="secondary"
                                        onClick={() => {
                                            setMostrarAbono(false);
                                            setMontoAbono('');
                                        }}
                                        disabled={guardandoPago}>
                                        Cancelar
                                    </AppButton>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── Formulario nuevo cuadre ── */}
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
                        <AppButton variant="info" onClick={guardar}>{editando ? 'Actualizar' : 'Guardar'}</AppButton>
                        <AppButton variant="danger" onClick={() => setMostrarFormulario(false)}>Cancelar</AppButton>
                    </div>
                </div>
            )}

            {/* ── Filtros ── */}
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

            {/* ── Edición de pago ── */}
            {editandoPago && (
                <div className="panel" style={{ marginTop: '20px', border: '1px solid #3498db' }}>
                    <h3 className="panel-title">Editar pago #{editandoPago.id}</h3>
                    <div className="form-grid form-grid--3">
                        <div>
                            <label className="label">Fecha de pago</label>
                            <input className="input-base full-width" type="date"
                                value={formPago.fecha_pago}
                                onChange={e => setFormPago(prev => ({ ...prev, fecha_pago: e.target.value }))} />
                        </div>
                        <div>
                            <label className="label">Hora de pago</label>
                            <input className="input-base full-width" type="time"
                                value={formPago.hora_pago}
                                onChange={e => setFormPago(prev => ({ ...prev, hora_pago: e.target.value }))} />
                        </div>
                        <div>
                            <label className="label">Método</label>
                            <select className="select-base full-width"
                                value={formPago.metodo}
                                onChange={e => setFormPago(prev => ({ ...prev, metodo: e.target.value }))}>
                                <option value="efectivo">Efectivo</option>
                                <option value="tarjeta_debito">Tarjeta débito</option>
                                <option value="tarjeta_credito">Tarjeta crédito</option>
                                <option value="transferencia">Transferencia</option>
                                <option value="nequi">Nequi</option>
                                <option value="daviplata">Daviplata</option>
                                <option value="consignacion">Consignación</option>
                                <option value="cxc">CXC</option>
                                <option value="credito">Crédito</option>
                                <option value="canje">Canje</option>
                                <option value="otro">Otro</option>
                            </select>
                        </div>
                        <div>
                            <label className="label">Referencia</label>
                            <input className="input-base full-width" placeholder="Referencia"
                                value={formPago.referencia}
                                onChange={e => setFormPago(prev => ({ ...prev, referencia: e.target.value }))} />
                        </div>
                        <div>
                            <label className="label">Monto</label>
                            <input className="input-base full-width" type="text" value={formatMoney(editandoPago.monto)} disabled />
                        </div>
                        <div>
                            <label className="label">Reserva ID</label>
                            <input className="input-base full-width" type="text" value={editandoPago.reserva_id ?? '-'} disabled />
                        </div>
                        <div>
                            <label className="label">Empleado</label>
                            <input className="input-base full-width" type="text" value={getEmpleadoNombre(editandoPago)} disabled />
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <label className="label">Notas</label>
                            <textarea className="input-base full-width" rows={3}
                                value={formPago.notas}
                                onChange={e => setFormPago(prev => ({ ...prev, notas: e.target.value }))} />
                        </div>
                    </div>
                    {mensajeEdicionPago && <p style={{ marginTop: '12px', color: '#27ae60', fontWeight: '600' }}>{mensajeEdicionPago}</p>}
                    {errorEdicionPago && <p className="error-text" style={{ marginTop: '12px' }}>{errorEdicionPago}</p>}
                    <div className="form-actions">
                        <AppButton variant="info" onClick={guardarEdicionPago} disabled={guardandoEdicionPago}>
                            {guardandoEdicionPago ? 'Actualizando...' : 'Actualizar pago'}
                        </AppButton>
                        <AppButton variant="secondary" onClick={cancelarEdicionPago}>Cerrar</AppButton>
                    </div>
                </div>
            )}

            {/* ── Historial de pagos ── */}
            <div className="panel" style={{ marginTop: '20px' }}>
                <h3 className="panel-title">Historial de pagos de reservas</h3>
                <DataTable
                    columns={paymentColumns}
                    data={pagos}
                    rowKey="id"
                    renderCell={(pago, column) => {
                        if (column.key === 'id') return `#${pago.id}`;
                        if (column.key === 'reserva_id') return pago.reserva_id ?? '-';
                        if (column.key === 'empleado') return getEmpleadoNombre(pago);
                        if (column.key === 'metodo') return pago.metodo || '-';
                        if (column.key === 'monto') return `$${parseFloat(pago.monto || 0).toLocaleString()}`;
                        if (column.key === 'referencia') return pago.referencia || '-';
                        if (column.key === 'fecha_pago') return formatFechaPago(pago.fecha_pago || pago.fecha);
                        if (column.key === 'notas') return pago.notas || '-';
                        if (column.key === 'acciones') {
                            return (
                                <div className="row-actions">
                                    <AppButton variant="info" size="sm" onClick={() => abrirEdicionPago(pago)}>
                                        Editar
                                    </AppButton>
                                </div>
                            );
                        }
                        return '-';
                    }}
                    emptyMessage="No hay pagos registrados todavía."
                />
            </div>
        </div>
    );
}

export default Caja;