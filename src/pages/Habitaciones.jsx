import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import habitacionService from '../services/habitacionService';
import ModalHabitacion from '../components/ModalHabitacion';

function Habitaciones() {
    const [habitaciones, setHabitaciones] = useState([]);
    const [filtroEstado, setFiltroEstado] = useState('todos');
    const [loading, setLoading] = useState(true);
    const [modalHabitacion, setModalHabitacion] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        cargarHabitaciones();
    }, [filtroEstado]);

    const cargarHabitaciones = async () => {
        try {
            let res;
            if (filtroEstado === 'todos') {
                res = await habitacionService.getAll();
            } else {
                res = await habitacionService.getByEstado(filtroEstado);
            }
            setHabitaciones(res.data);
        } catch (err) {
            console.error('Error cargando habitaciones', err);
        } finally {
            setLoading(false);
        }
    };

    const cambiarEstado = async (id, estado) => {
        try {
            await habitacionService.updateEstado(id, estado);
            cargarHabitaciones();
        } catch (err) {
            console.error('Error cambiando estado', err);
        }
    };

    const eliminar = async (id) => {
        if (window.confirm('¿Eliminar esta habitación?')) {
            await habitacionService.delete(id);
            cargarHabitaciones();
        }
    };

    const getColorEstado = (estado) => {
        const colores = {
            disponible: '#2ecc71',
            ocupada: '#e74c3c',
            mantenimiento: '#f39c12',
            inactiva: '#95a5a6'
        };
        return colores[estado] || '#95a5a6';
    };

    if (loading) return <p style={styles.loading}>Cargando habitaciones...</p>;

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <button style={styles.btnVolver} onClick={() => navigate('/dashboard')}>← Volver</button>
                <h2 style={styles.titulo}>Habitaciones</h2>
                <button style={styles.btnCrear} onClick={() => navigate('/habitaciones/nueva')}>+ Nueva Habitación</button>
            </div>

            <div style={styles.filtros}>
                {['todos', 'disponible', 'ocupada', 'mantenimiento', 'inactiva'].map(estado => (
                    <button
                        key={estado}
                        style={{
                            ...styles.btnFiltro,
                            backgroundColor: filtroEstado === estado ? '#1a1a2e' : '#ddd',
                            color: filtroEstado === estado ? 'white' : '#333'
                        }}
                        onClick={() => setFiltroEstado(estado)}
                    >
                        {estado.charAt(0).toUpperCase() + estado.slice(1)}
                    </button>
                ))}
            </div>

            <div style={styles.grid}>
                {habitaciones.map(h => (
                    <div key={h.id} style={styles.card}>
                        <div style={styles.cardHeader}>
                            <h3 style={styles.numHabitacion}>Hab. {h.numero}</h3>
                            <span style={{
                                ...styles.badge,
                                backgroundColor: getColorEstado(h.estado)
                            }}>
                                {h.estado}
                            </span>
                        </div>
                        <p style={styles.info}>🏢 Piso {h.piso}</p>
                        <p style={styles.info}>🛏️ {h.tipo_cama}</p>
                        <p style={styles.info}>📋 {h.tipo_nombre}</p>
                        <p style={styles.info}>💰 ${h.precio_base?.toLocaleString()}/noche</p>

                        <div style={styles.selectContainer}>
                            <select
                                style={styles.select}
                                value={h.estado}
                                onChange={e => cambiarEstado(h.id, e.target.value)}
                            >
                                <option value="disponible">Disponible</option>
                                <option value="ocupada">Ocupada</option>
                                <option value="mantenimiento">Mantenimiento</option>
                                <option value="inactiva">Inactiva</option>
                            </select>
                        </div>

                        <div style={styles.acciones}>
                            <button style={styles.btnEditar}
                                onClick={() => navigate(`/habitaciones/editar/${h.id}`)}>
                                Editar
                            </button>
                            <button style={styles.btnEliminar}
                                onClick={() => eliminar(h.id)}>
                                Eliminar
                            </button>
                        </div>

                        {h.estado === 'ocupada' && (
                            <button style={styles.btnConsultar}
                                onClick={() => setModalHabitacion(h)}>
                                👁️ Consultar
                            </button>
                        )}
                    </div>
                ))}
            </div>

            {modalHabitacion && (
                <ModalHabitacion
                    habitacion={modalHabitacion}
                    onClose={() => setModalHabitacion(null)}
                    onUpdate={cargarHabitaciones}
                />
            )}
        </div>
    );
}

const styles = {
    container: { padding: '20px', backgroundColor: '#f0f2f5', minHeight: '100vh' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
    titulo: { margin: 0, color: '#1a1a2e' },
    loading: { textAlign: 'center', marginTop: '50px' },
    filtros: { display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' },
    btnFiltro: { padding: '8px 15px', border: 'none', borderRadius: '20px', cursor: 'pointer', fontSize: '13px' },
    btnVolver: { padding: '8px 15px', backgroundColor: '#95a5a6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' },
    btnCrear: { padding: '8px 15px', backgroundColor: '#1a1a2e', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '15px' },
    card: { backgroundColor: 'white', borderRadius: '10px', padding: '15px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' },
    cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' },
    numHabitacion: { margin: 0, color: '#1a1a2e', fontSize: '18px' },
    badge: { padding: '3px 8px', borderRadius: '20px', color: 'white', fontSize: '11px', fontWeight: 'bold' },
    info: { margin: '4px 0', fontSize: '13px', color: '#555' },
    selectContainer: { marginTop: '10px' },
    select: { width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '13px' },
    acciones: { display: 'flex', gap: '5px', marginTop: '10px' },
    btnEditar: { flex: 1, padding: '6px', backgroundColor: '#3498db', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' },
    btnEliminar: { flex: 1, padding: '6px', backgroundColor: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' },
    btnConsultar: { width: '100%', padding: '6px', backgroundColor: '#1a1a2e', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', marginTop: '5px' }
};

export default Habitaciones;