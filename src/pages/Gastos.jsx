import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import gastoService from '../services/gastoService';

function Gastos() {
    const [gastos, setGastos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [mostrarFormulario, setMostrarFormulario] = useState(false);
    const [editando, setEditando] = useState(null);
    const [filtroFecha, setFiltroFecha] = useState('');
    const [filtroCategoria, setFiltroCategoria] = useState('');
    const [formData, setFormData] = useState({
        fecha: '',
        categoria: 'varios',
        descripcion: '',
        monto: '',
        empleado_id: ''
    });
    const navigate = useNavigate();

    const categorias = ['olimpica', 'ferreteria', 'turno', 'insumos', 'mantenimiento', 'varios'];

    useEffect(() => {
        cargarGastos();
    }, []);

    const cargarGastos = async () => {
        try {
            const res = await gastoService.getAll();
            setGastos(res.data);
        } catch (err) {
            console.error('Error cargando gastos', err);
        } finally {
            setLoading(false);
        }
    };

    const filtrarPorFecha = async () => {
        if (!filtroFecha) return cargarGastos();
        try {
            const res = await gastoService.getByFecha(filtroFecha);
            setGastos(res.data);
        } catch (err) {
            console.error('Error filtrando por fecha', err);
        }
    };

    const filtrarPorCategoria = async (cat) => {
        setFiltroCategoria(cat);
        if (!cat) return cargarGastos();
        try {
            const res = await gastoService.getByCategoria(cat);
            setGastos(res.data);
        } catch (err) {
            console.error('Error filtrando por categoria', err);
        }
    };

    const guardar = async () => {
        try {
            if (editando) {
                await gastoService.update(editando, formData);
            } else {
                await gastoService.create(formData);
            }
            setMostrarFormulario(false);
            setEditando(null);
            setFormData({ fecha: '', categoria: 'varios', descripcion: '', monto: '', empleado_id: '' });
            cargarGastos();
        } catch (err) {
            console.error('Error guardando gasto', err);
        }
    };

    const editar = (gasto) => {
        setEditando(gasto.id);
        setFormData({
            fecha: gasto.fecha,
            categoria: gasto.categoria,
            descripcion: gasto.descripcion,
            monto: gasto.monto,
            empleado_id: gasto.empleado_id || ''
        });
        setMostrarFormulario(true);
    };

    const eliminar = async (id) => {
        if (window.confirm('¿Eliminar este gasto?')) {
            await gastoService.delete(id);
            cargarGastos();
        }
    };

    const totalGastos = gastos.reduce((sum, g) => sum + parseFloat(g.monto || 0), 0);

    if (loading) return <p style={styles.loading}>Cargando gastos...</p>;

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <button style={styles.btnVolver} onClick={() => navigate('/dashboard')}>← Volver</button>
                <h2 style={styles.titulo}>Gastos</h2>
                <button style={styles.btnCrear} onClick={() => {
                    setEditando(null);
                    setFormData({ fecha: '', categoria: 'varios', descripcion: '', monto: '', empleado_id: '' });
                    setMostrarFormulario(!mostrarFormulario);
                }}>
                    + Nuevo Gasto
                </button>
            </div>

            <div style={styles.resumen}>
                <div style={styles.cardResumen}>
                    <p style={styles.resumenLabel}>Total Gastos</p>
                    <p style={styles.resumenValor}>${totalGastos.toLocaleString()}</p>
                </div>
                <div style={styles.cardResumen}>
                    <p style={styles.resumenLabel}>Cantidad</p>
                    <p style={styles.resumenValor}>{gastos.length}</p>
                </div>
            </div>

            {mostrarFormulario && (
                <div style={styles.formulario}>
                    <h3 style={styles.formTitulo}>{editando ? 'Editar Gasto' : 'Nuevo Gasto'}</h3>
                    <div style={styles.formGrid}>
                        <input style={styles.input} type="date"
                            value={formData.fecha}
                            onChange={e => setFormData({ ...formData, fecha: e.target.value })} />
                        <select style={styles.input}
                            value={formData.categoria}
                            onChange={e => setFormData({ ...formData, categoria: e.target.value })}>
                            {categorias.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <input style={styles.input} placeholder="Descripción"
                            value={formData.descripcion}
                            onChange={e => setFormData({ ...formData, descripcion: e.target.value })} />
                        <input style={styles.input} placeholder="Monto *" type="number"
                            value={formData.monto}
                            onChange={e => setFormData({ ...formData, monto: e.target.value })} />
                        <input style={styles.input} placeholder="Empleado ID (opcional)" type="number"
                            value={formData.empleado_id}
                            onChange={e => setFormData({ ...formData, empleado_id: e.target.value })} />
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
                <button style={styles.btnBuscar} onClick={filtrarPorFecha}>Filtrar fecha</button>
                <select style={styles.selectFiltro}
                    value={filtroCategoria}
                    onChange={e => filtrarPorCategoria(e.target.value)}>
                    <option value="">Todas las categorías</option>
                    {categorias.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <button style={styles.btnLimpiar} onClick={() => {
                    setFiltroFecha('');
                    setFiltroCategoria('');
                    cargarGastos();
                }}>Limpiar</button>
            </div>

            <div style={styles.tableContainer}>
                <table style={styles.tabla}>
                    <thead>
                        <tr style={styles.thead}>
                            <th style={styles.th}>ID</th>
                            <th style={styles.th}>Fecha</th>
                            <th style={styles.th}>Categoría</th>
                            <th style={styles.th}>Descripción</th>
                            <th style={styles.th}>Monto</th>
                            <th style={styles.th}>Empleado</th>
                            <th style={styles.th}>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {gastos.map(g => (
                            <tr key={g.id} style={styles.tr}>
                                <td style={styles.td}>#{g.id}</td>
                                <td style={styles.td}>{g.fecha}</td>
                                <td style={styles.td}>
                                    <span style={styles.badge}>{g.categoria}</span>
                                </td>
                                <td style={styles.td}>{g.descripcion || '-'}</td>
                                <td style={styles.td}><strong>${parseFloat(g.monto).toLocaleString()}</strong></td>
                                <td style={styles.td}>{g.empleado_nombre || '-'}</td>
                                <td style={styles.td}>
                                    <div style={styles.acciones}>
                                        <button style={styles.btnEditar} onClick={() => editar(g)}>Editar</button>
                                        <button style={styles.btnEliminar} onClick={() => eliminar(g.id)}>Eliminar</button>
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
    resumen: { display: 'flex', gap: '15px', marginBottom: '20px' },
    cardResumen: { backgroundColor: 'white', borderRadius: '10px', padding: '15px 25px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', textAlign: 'center' },
    resumenLabel: { margin: 0, fontSize: '13px', color: '#666' },
    resumenValor: { margin: '5px 0 0 0', fontSize: '22px', fontWeight: 'bold', color: '#1a1a2e' },
    formulario: { backgroundColor: 'white', borderRadius: '10px', padding: '20px', marginBottom: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' },
    formTitulo: { margin: '0 0 15px 0', color: '#1a1a2e' },
    formGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '15px' },
    input: { padding: '10px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px' },
    formAcciones: { display: 'flex', gap: '10px' },
    btnGuardar: { padding: '10px 20px', backgroundColor: '#2ecc71', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' },
    btnCancelarForm: { padding: '10px 20px', backgroundColor: '#e74c3c', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' },
    filtros: { display: 'flex', gap: '10px', marginBottom: '20px', alignItems: 'center' },
    inputFecha: { padding: '8px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px' },
    selectFiltro: { padding: '8px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px' },
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
    badge: { padding: '4px 10px', borderRadius: '20px', backgroundColor: '#3498db', color: 'white', fontSize: '12px' },
    acciones: { display: 'flex', gap: '5px' },
    btnEditar: { padding: '5px 10px', backgroundColor: '#3498db', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' },
    btnEliminar: { padding: '5px 10px', backgroundColor: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }
};

export default Gastos;