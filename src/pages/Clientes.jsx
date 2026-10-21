import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import clienteService from '../services/clienteService';
import { AppButton, DataTable, PageHeader } from '../components/ui';
import { extraerLista } from '../utils/apiResponse';
import '../components/ui/ui.css';

function Clientes() {
    const [clientes, setClientes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busqueda, setBusqueda] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        cargarClientes();
    }, []);

    const cargarClientes = async () => {
        try {
            const res = await clienteService.getAll();
            setClientes(extraerLista(res));
        } catch (err) {
            console.error('Error cargando clientes', err);
        } finally {
            setLoading(false);
        }
    };

    const buscar = async () => {
        if (!busqueda) return cargarClientes();
        try {
            const res = await clienteService.search(busqueda);
            setClientes(extraerLista(res));
        } catch (err) {
            console.error('Error buscando', err);
        }
    };

    const eliminar = async (id) => {
        if (window.confirm('¿Eliminar este cliente?')) {
            await clienteService.delete(id);
            cargarClientes();
        }
    };

    const columns = [
        { key: 'id', label: 'ID' },
        { key: 'documento', label: 'Documento' },
        { key: 'nombre', label: 'Nombre' },
        { key: 'telefono', label: 'Telefono' },
        { key: 'email', label: 'Email' },
        { key: 'nacionalidad', label: 'Nacionalidad' },
        { key: 'acciones', label: 'Acciones' }
    ];

    if (loading) return <p className="page-loading">Cargando clientes...</p>;

    return (
        <div className="page-container">
            <PageHeader
                title="Clientes"
                onBack={() => navigate('/dashboard')}
                backLabel="← Volver"
                actions={(
                    <AppButton onClick={() => navigate('/clientes/nuevo')}>+ Nuevo Cliente</AppButton>
                )}
            />

            <div className="toolbar">
                <input
                    className="input-base"
                    type="text"
                    placeholder="Buscar por nombre, documento o email..."
                    value={busqueda}
                    onChange={e => setBusqueda(e.target.value)}
                    onKeyPress={e => e.key === 'Enter' && buscar()}
                />
                <AppButton onClick={buscar}>Buscar</AppButton>
            </div>

            <DataTable
                columns={columns}
                data={clientes}
                rowKey="id"
                renderCell={(c, column) => {
                    if (column.key === 'id') return `#${c.id}`;
                    if (column.key === 'documento') return `${c.tipo_documento} ${c.numero_documento}`;
                    if (column.key === 'nombre') return `${c.nombre} ${c.apellido}`;
                    if (column.key === 'telefono') return c.telefono || '-';
                    if (column.key === 'email') return c.email || '-';
                    if (column.key === 'nacionalidad') return c.nacionalidad;
                    if (column.key === 'acciones') {
                        return (
                            <div className="row-actions">
                                <AppButton
                                    variant="info"
                                    size="sm"
                                    onClick={() => navigate(`/clientes/editar/${c.id}`)}
                                >
                                    Editar
                                </AppButton>
                                <AppButton
                                    variant="danger"
                                    size="sm"
                                    onClick={() => eliminar(c.id)}
                                >
                                    Eliminar
                                </AppButton>
                            </div>
                        );
                    }
                    return '-';
                }}
                emptyMessage="No hay clientes registrados."
            />
        </div>
    );
}

export default Clientes;