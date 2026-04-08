import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import empleadoService from '../services/empleadoService';

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
            setEmpleados(res.data);
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

    if (loading) return <p style={styles.loading}>Cargando empleados...</p>;

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <button style={styles.btnVolver} onClick={() => navigate('/dashboard')}>← Volver</button>
                <h2 style={styles.titulo}>Empleados</h2>
                <button style={styles.btnCrear} onClick={() => navigate('/empleados/nuevo')}>+ Nuevo Empleado</button>
            </div>

            <div style={styles.tableContainer}>
                <table style={styles.tabla}>
                    <thead>
                        <tr style={styles.thead}>
                            <th style={styles.th}>ID</th>
                            <th style={styles.th}>Nombre</th>
                            <th style={styles.th}>Usuario</th>
                            <th style={styles.th}>Teléfono</th>
                            <th style={styles.th}>Email</th>
                            <th style={styles.th}>Roles</th>
                            <th style={styles.th}>Estado</th>
                            <th style={styles.th}>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {empleados.map(e => (
                            <tr key={e.id} style={styles.tr}>
                                <td style={styles.td}>#{e.id}</td>
                                <td style={styles.td}>{e.nombre} {e.apellido}</td>
                                <td style={styles.td}>{e.usuario}</td>
                                <td style={styles.td}>{e.telefono || '-'}</td>
                                <td style={styles.td}>{e.email || '-'}</td>
                                <td style={styles.td}>
                                    <span style={styles.badge}>{e.roles || 'Sin rol'}</span>
                                </td>
                                <td style={styles.td}>
                                    <span style={{
                                        ...styles.badgeEstado,
                                        backgroundColor: e.activo ? '#2ecc71' : '#e74c3c'
                                    }}>
                                        {e.activo ? 'Activo' : 'Inactivo'}
                                    </span>
                                </td>
                                <td style={styles.td}>
                                    <div style={styles.acciones}>
                                        <button style={styles.btnEditar}
                                            onClick={() => navigate(`/empleados/editar/${e.id}`)}>
                                            Editar
                                        </button>
                                        <button style={styles.btnEliminar}
                                            onClick={() => eliminar(e.id)}>
                                            Eliminar
                                        </button>
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
    tableContainer: { backgroundColor: 'white', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', overflow: 'auto' },
    tabla: { width: '100%', borderCollapse: 'collapse' },
    thead: { backgroundColor: '#1a1a2e' },
    th: { padding: '12px 15px', color: 'white', textAlign: 'left', fontSize: '14px' },
    tr: { borderBottom: '1px solid #eee' },
    td: { padding: '12px 15px', fontSize: '14px', color: '#333' },
    badge: { padding: '4px 10px', borderRadius: '20px', backgroundColor: '#3498db', color: 'white', fontSize: '12px' },
    badgeEstado: { padding: '4px 10px', borderRadius: '20px', color: 'white', fontSize: '12px' },
    acciones: { display: 'flex', gap: '5px' },
    btnEditar: { padding: '5px 10px', backgroundColor: '#3498db', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' },
    btnEliminar: { padding: '5px 10px', backgroundColor: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' },
    btnVolver: { padding: '8px 15px', backgroundColor: '#95a5a6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' },
    btnCrear: { padding: '8px 15px', backgroundColor: '#1a1a2e', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }
};

export default Empleados;