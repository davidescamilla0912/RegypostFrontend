import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import gastoService from '../services/gastoService';
import { AppButton, DataTable, PageHeader } from '../components/ui';
import '../components/ui/ui.css';

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
    const columns = [
        { key: 'id', label: 'ID' },
        { key: 'fecha', label: 'Fecha' },
        { key: 'categoria', label: 'Categoria' },
        { key: 'descripcion', label: 'Descripcion' },
        { key: 'monto', label: 'Monto' },
        { key: 'empleado', label: 'Empleado' },
        { key: 'acciones', label: 'Acciones' }
    ];

    if (loading) return <p className="page-loading">Cargando gastos...</p>;

    return (
        <div className="page-container">
            <PageHeader
                title="Gastos"
                onBack={() => navigate('/dashboard')}
                backLabel="← Volver"
                actions={(
                    <AppButton onClick={() => {
                        setEditando(null);
                        setFormData({ fecha: '', categoria: 'varios', descripcion: '', monto: '', empleado_id: '' });
                        setMostrarFormulario(!mostrarFormulario);
                    }}>
                        + Nuevo Gasto
                    </AppButton>
                )}
            />

            <div className="summary-row">
                <div className="summary-card">
                    <p className="summary-card__label">Total Gastos</p>
                    <p className="summary-card__value">${totalGastos.toLocaleString()}</p>
                </div>
                <div className="summary-card">
                    <p className="summary-card__label">Cantidad</p>
                    <p className="summary-card__value">{gastos.length}</p>
                </div>
            </div>

            {mostrarFormulario && (
                <div className="panel">
                    <h3 className="panel-title">{editando ? 'Editar Gasto' : 'Nuevo Gasto'}</h3>
                    <div className="form-grid form-grid--3">
                        <input className="input-base" type="date"
                            value={formData.fecha}
                            onChange={e => setFormData({ ...formData, fecha: e.target.value })} />
                        <select className="select-base"
                            value={formData.categoria}
                            onChange={e => setFormData({ ...formData, categoria: e.target.value })}>
                            {categorias.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <input className="input-base" placeholder="Descripcion"
                            value={formData.descripcion}
                            onChange={e => setFormData({ ...formData, descripcion: e.target.value })} />
                        <input className="input-base" placeholder="Monto *" type="number"
                            value={formData.monto}
                            onChange={e => setFormData({ ...formData, monto: e.target.value })} />
                        <input className="input-base" placeholder="Empleado ID (opcional)" type="number"
                            value={formData.empleado_id}
                            onChange={e => setFormData({ ...formData, empleado_id: e.target.value })} />
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
                <AppButton onClick={filtrarPorFecha}>Filtrar fecha</AppButton>
                <select className="select-base"
                    value={filtroCategoria}
                    onChange={e => filtrarPorCategoria(e.target.value)}>
                    <option value="">Todas las categorias</option>
                    {categorias.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <AppButton variant="secondary" onClick={() => {
                    setEditando(null);
                    setFormData({ fecha: '', categoria: 'varios', descripcion: '', monto: '', empleado_id: '' });
                    setFiltroFecha('');
                    setFiltroCategoria('');
                    cargarGastos();
                }}>
                    Limpiar
                </AppButton>
            </div>

            <DataTable
                columns={columns}
                data={gastos}
                rowKey="id"
                renderCell={(g, column) => {
                    if (column.key === 'id') return `#${g.id}`;
                    if (column.key === 'fecha') return g.fecha;
                    if (column.key === 'categoria') return <span className="badge" style={{ backgroundColor: '#3498db' }}>{g.categoria}</span>;
                    if (column.key === 'descripcion') return g.descripcion || '-';
                    if (column.key === 'monto') return <strong>${parseFloat(g.monto).toLocaleString()}</strong>;
                    if (column.key === 'empleado') return g.empleado_nombre || '-';
                    if (column.key === 'acciones') {
                        return (
                            <div className="row-actions">
                                <AppButton variant="info" size="sm" onClick={() => editar(g)}>Editar</AppButton>
                                <AppButton variant="danger" size="sm" onClick={() => eliminar(g.id)}>Eliminar</AppButton>
                            </div>
                        );
                    }
                    return '-';
                }}
                emptyMessage="No hay gastos registrados."
            />
        </div>
    );
}

export default Gastos;