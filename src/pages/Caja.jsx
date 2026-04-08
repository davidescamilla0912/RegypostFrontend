import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import cajaService from '../services/cajaService';

function Caja() {
    const [cuadres, setCuadres] = useState([]);
    const [loading, setLoading] = useState(true);
    const [mostrarFormulario, setMostrarFormulario] = useState(false);
    const [editando, setEditando] = useState(null);
    const [filtroFecha, setFiltroFecha] = useState('');
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

    useEffect(() => {
        cargarCuadres();
    }, []);

    const cargarCuadres = async () => {
        try {
            const res = await cajaService.getAll();
            setCuadres(res.data);
        } catch (err) {
            console.error('Error cargando cuadres', err);
        } finally {
            setLoading(false);
        }
    };

    const filtrarPorFecha = async () => {
        if (!filtroFecha) return cargarCuadres();
        try {
            const res = await cajaService.getByFecha(filtroFecha);
            setCuadres(res.data);
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

    if (loading) return <p style={styles.loading}>Cargando cuadres...</p>;

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <button style={styles.btnVolver} onClick={() => navigate('/dashboard')}>← Volver</button>
                <h2 style={styles.titulo}>Cuadre de Caja</h2>
                <button style={styles.btnCrear} onClick={() => {
                    setEditando(null);
                    setFormData({
                        fecha: '', empleado_id: '', saldo_anterior: 0, efectivo: 0,
                        gastos_turno: 0, tarjetas: 0, consignacion: 0,
                        factura_cxc: 0, factura_credito: 0, total_movimiento: 0, observaciones: ''
                    });
                    setMostrarFormulario(!mostrarFormulario);
                }}>
                    + Nuevo Cuadre
                </button>
            </div>

            {mostrarFormulario && (
                <div style={styles.formulario}>
                    <h3 style={styles.formTitulo}>{editando ? 'Editar Cuadre' : 'Nuevo Cuadre'}</h3>
                    <div style={styles.formGrid}>
                        <div>
                            <label style={styles.label}>Fecha *</label>
                            <input style={styles.input} type="date"
                                value={formData.fecha}
                                onChange={e => setFormData({ ...formData, fecha: e.target.value })} />
                        </div>
                        <div>
                            <label style={styles.label}>Empleado ID</label>
                            <input style={styles.input} type="number" placeholder="ID del empleado"
                                value={formData.empleado_id}
                                onChange={e => setFormData({ ...formData, empleado_id: e.target.value })} />
                        </div>
                        <div>
                            <label style={styles.label}>Saldo Anterior</label>
                            <input style={styles.input} type="number"
                                value={formData.saldo_anterior}
                                onChange={e => setFormData({ ...formData, saldo_anterior: e.target.value })} />
                        </div>
                        <div>
                            <label style={styles.label}>Efectivo</label>
                            <input style={styles.input} type="number"
                                value={formData.efectivo}
                                onChange={e => setFormData({ ...formData, efectivo: e.target.value })} />
                        </div>
                        <div>
                            <label style={styles.label}>Gastos Turno</label>
                            <input style={styles.input} type="number"
                                value={formData.gastos_turno}
                                onChange={e => setFormData({ ...formData, gastos_turno: e.target.value })} />
                        </div>
                        <div>
                            <label style={styles.label}>Tarjetas</label>
                            <input style={styles.input} type="number"
                                value={formData.tarjetas}
                                onChange={e => setFormData({ ...formData, tarjetas: e.target.value })} />
                        </div>
                        <div>
                            <label style={styles.label}>Consignación</label>
                            <input style={styles.input} type="number"
                                value={formData.consignacion}
                                onChange={e => setFormData({ ...formData, consignacion: e.target.value })} />
                        </div>
                        <div>
                            <label style={styles.label}>Factura CXC</label>
                            <input style={styles.input} type="number"
                                value={formData.factura_cxc}
                                onChange={e => setFormData({ ...formData, factura_cxc: e.target.value })} />
                        </div>
                        <div>
                            <label style={styles.label}>Factura Crédito</label>
                            <input style={styles.input} type="number"
                                value={formData.factura_credito}
                                onChange={e => setFormData({ ...formData, factura_credito: e.target.value })} />
                        </div>
                        <div>
                            <label style={styles.label}>Observaciones</label>
                            <input style={styles.input} placeholder="Observaciones"
                                value={formData.observaciones}
                                onChange={e => setFormData({ ...formData, observaciones: e.target.value })} />
                        </div>
                    </div>
                    <div style={styles.totalPreview}>
                        <strong>Total calculado: ${calcularTotal(formData).toLocaleString()}</strong>
                    </div>
                    <div style={styles.formAcciones}>
                        <button style={styles.btnGuardar} onClick={guardar}>
                            {editando ? 'Actualizar' : 'Guardar'}
                        </button>
                        <button style={styles.btnCancelarForm} onClick={() => setMostrarFormulario(false)}>Cancelar</button>
                    </div>
                </div>
            )}

            <div style={styles.filtros}>
                <input style={styles.inputFecha} type="date"
                    value={filtroFecha}
                    onChange={e => setFiltroFecha(e.target.value)} />
                <button style={styles.btnBuscar} onClick={filtrarPorFecha}>Filtrar</button>
                <button style={styles.btnLimpiar} onClick={() => { setFiltroFecha(''); cargarCuadres(); }}>Limpiar</button>
            </div>

            <div style={styles.tableContainer}>
                <table style={styles.tabla}>
                    <thead>
                        <tr style={styles.thead}>
                            <th style={styles.th}>ID</th>
                            <th style={styles.th}>Fecha</th>
                            <th style={styles.th}>Empleado</th>
                            <th style={styles.th}>Efectivo</th>
                            <th style={styles.th}>Tarjetas</th>
                            <th style={styles.th}>Gastos</th>
                            <th style={styles.th}>Total</th>
                            <th style={styles.th}>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {cuadres.map(c => (
                            <tr key={c.id} style={styles.tr}>
                                <td style={styles.td}>#{c.id}</td>
                                <td style={styles.td}>{c.fecha}</td>
                                <td style={styles.td}>{c.empleado_nombre || '-'}</td>
                                <td style={styles.td}>${parseFloat(c.efectivo).toLocaleString()}</td>
                                <td style={styles.td}>${parseFloat(c.tarjetas).toLocaleString()}</td>
                                <td style={styles.td}>${parseFloat(c.gastos_turno).toLocaleString()}</td>
                                <td style={styles.td}>
                                    <strong>${parseFloat(c.total_movimiento).toLocaleString()}</strong>
                                </td>
                                <td style={styles.td}>
                                    <div style={styles.acciones}>
                                        <button style={styles.btnEditar} onClick={() => editar(c)}>Editar</button>
                                        <button style={styles.btnEliminar} onClick={() => eliminar(c.id)}>Eliminar</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

const styles = {
    container: { padding: '20px', backgroundColor: '#f0f2f5', minHeight: '100vh' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
    titulo: { margin: 0, color: '#1a1a2e' },
    loading: { textAlign: 'center', marginTop: '50px' },
    formulario: { backgroundColor: 'white', borderRadius: '10px', padding: '20px', marginBottom: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' },
    formTitulo: { margin: '0 0 15px 0', color: '#1a1a2e' },
    formGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '15px' },
    label: { display: 'block', fontSize: '12px', color: '#666', marginBottom: '4px' },
    input: { width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px', boxSizing: 'border-box' },
    totalPreview: { backgroundColor: '#f0f2f5', padding: '10px 15px', borderRadius: '6px', marginBottom: '15px', color: '#1a1a2e' },
    formAcciones: { display: 'flex', gap: '10px' },
    btnGuardar: { padding: '10px 20px', backgroundColor: '#2ecc71', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' },
    btnCancelarForm: { padding: '10px 20px', backgroundColor: '#e74c3c', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' },
    filtros: { display: 'flex', gap: '10px', marginBottom: '20px', alignItems: 'center' },
    inputFecha: { padding: '8px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px' },
    btnBuscar: { padding: '8px 15px', backgroundColor: '#1a1a2e', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' },
    btnLimpiar: { padding: '8px 15px', backgroundColor: '#95a5a6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' },
    btnVolver: { padding: '8px 15px', backgroundColor: '#95a5a6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' },
    btnCrear: { padding: '8px 15px', backgroundColor: '#1a1a2e', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' },
    tableContainer: { backgroundColor: 'white', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', overflow: 'auto' },
    tabla: { width: '100%', borderCollapse: 'collapse' },
    thead: { backgroundColor: '#1a1a2e' },
    th: { padding: '12px 15px', color: 'white', textAlign: 'left', fontSize: '14px' },
    tr: { borderBottom: '1px solid #eee' },
    td: { padding: '12px 15px', fontSize: '14px', color: '#333' },
    acciones: { display: 'flex', gap: '5px' },
    btnEditar: { padding: '5px 10px', backgroundColor: '#3498db', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' },
    btnEliminar: { padding: '5px 10px', backgroundColor: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }
};

export default Caja;