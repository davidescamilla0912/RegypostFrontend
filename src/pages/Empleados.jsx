import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import empleadoService from '../services/empleadoService';
import { AppButton, DataTable, PageHeader } from '../components/ui';
import { extraerLista } from '../utils/apiResponse';
import '../components/ui/ui.css';

function Empleados() {
    const [empleados, setEmpleados] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        cargarEmpleados();
    }, []);

    const cargarEmpleados = async () => {
        try {
            const res = await empleadoService.getAll();
            setEmpleados(extraerLista(res));
        } catch (err) {
            console.error('Error cargando empleados', err);
        } finally {
            setLoading(false);
        }
    };

    const eliminar = async (id) => {
        if (window.confirm('¿Eliminar este empleado?')) {
            await empleadoService.delete(id);
            cargarEmpleados();
        }
    };

    const columns = [
        { key: 'id', label: 'ID' },
        { key: 'nombre', label: 'Nombre' },
        { key: 'usuario', label: 'Usuario' },
        { key: 'telefono', label: 'Telefono' },
        { key: 'email', label: 'Email' },
        { key: 'roles', label: 'Roles' },
        { key: 'estado', label: 'Estado' },
        { key: 'acciones', label: 'Acciones' }
    ];

    if (loading) return <p className="page-loading">Cargando empleados...</p>;

    return (
        <div className="page-container">
            <PageHeader
                title="Empleados"
                onBack={() => navigate('/dashboard')}
                backLabel="← Volver"
                actions={(
                    <AppButton onClick={() => navigate('/empleados/nuevo')}>+ Nuevo Empleado</AppButton>
                )}
            />

            <DataTable
                columns={columns}
                data={empleados}
                rowKey="id"
                renderCell={(e, column) => {
                    if (column.key === 'id') return `#${e.id}`;
                    if (column.key === 'nombre') return `${e.nombre} ${e.apellido}`;
                    if (column.key === 'usuario') return e.usuario;
                    if (column.key === 'telefono') return e.telefono || '-';
                    if (column.key === 'email') return e.email || '-';
                    if (column.key === 'roles') {
                        return <span className="badge" style={{ backgroundColor: '#3498db' }}>{e.roles || 'Sin rol'}</span>;
                    }
                    if (column.key === 'estado') {
                        return (
                            <span
                                className="badge"
                                style={{ backgroundColor: e.activo ? '#2ecc71' : '#e74c3c' }}
                            >
                                {e.activo ? 'Activo' : 'Inactivo'}
                            </span>
                        );
                    }
                    if (column.key === 'acciones') {
                        return (
                            <div className="row-actions">
                                <AppButton
                                    variant="info"
                                    size="sm"
                                    onClick={() => navigate(`/empleados/editar/${e.id}`)}
                                >
                                    Editar
                                </AppButton>
                                <AppButton
                                    variant="danger"
                                    size="sm"
                                    onClick={() => eliminar(e.id)}
                                >
                                    Eliminar
                                </AppButton>
                            </div>
                        );
                    }
                    return '-';
                }}
                emptyMessage="No hay empleados registrados."
            />
        </div>
    );
}

export default Empleados;