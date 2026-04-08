import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import clienteService from '../services/clienteService';

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
            setClientes(res.data);
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
            setClientes(res.data);
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

    if (loading) return <p style={styles.loading}>Cargando clientes...</p>;

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <button style={styles.btnVolver} onClick={() => navigate('/dashboard')}>← Volver</button>
                <h2 style={styles.titulo}>Clientes</h2>
                <button style={styles.btnCrear} onClick={() => navigate('/clientes/nuevo')}>+ Nuevo Cliente</button>
            </div>

            <div style={styles.buscador}>
                <input
                    style={styles.inputBuscar}
                    type="text"
                    placeholder="Buscar por nombre, documento o email..."
                    value={busqueda}
                    onChange={e => setBusqueda(e.target.value)}
                    onKeyPress={e => e.key === 'Enter' && buscar()}
                />
                <button style={styles.btnBuscar} onClick={buscar}>Buscar</button>
            </div>

            <div style={styles.tableContainer}>
                <table style={styles.tabla}>
                    <thead>
                        <tr style={styles.thead}>
                            <th style={styles.th}>ID</th>
                            <th style={styles.th}>Documento</th>
                            <th style={styles.th}>Nombre</th>
                            <th style={styles.th}>Teléfono</th>
                            <th style={styles.th}>Email</th>
                            <th style={styles.th}>Nacionalidad</th>
                            <th style={styles.th}>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {clientes.map(c => (
                            <tr key={c.id} style={styles.tr}>
                                <td style={styles.td}>#{c.id}</td>
                                <td style={styles.td}>{c.tipo_documento} {c.numero_documento}</td>
                                <td style={styles.td}>{c.nombre} {c.apellido}</td>
                                <td style={styles.td}>{c.telefono || '-'}</td>
                                <td style={styles.td}>{c.email || '-'}</td>
                                <td style={styles.td}>{c.nacionalidad}</td>
                                <td style={styles.td}>
                                    <div style={styles.acciones}>
                                        <button style={styles.btnEditar}
                                            onClick={() => navigate(`/clientes/editar/${c.id}`)}>
                                            Editar
                                        </button>
                                        <button style={styles.btnEliminar}
                                            onClick={() => eliminar(c.id)}>
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
    buscador: { display: 'flex', gap: '10px', marginBottom: '20px' },
    inputBuscar: { flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px' },
    btnBuscar: { padding: '10px 20px', backgroundColor: '#1a1a2e', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' },
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

export default Clientes;