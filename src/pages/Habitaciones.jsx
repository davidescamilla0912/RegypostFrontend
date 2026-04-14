import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import habitacionService from '../services/habitacionService';
import ModalHabitacion from '../components/ModalHabitacion';
import { AppButton, PageHeader } from '../components/ui';
import '../components/ui/ui.css';

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

    if (loading) return <p className="page-loading">Cargando habitaciones...</p>;

    return (
        <div className="page-container">
            <PageHeader
                title="Habitaciones"
                onBack={() => navigate('/dashboard')}
                backLabel="← Volver"
                actions={(
                    <AppButton onClick={() => navigate('/habitaciones/nueva')}>+ Nueva Habitación</AppButton>
                )}
            />

            <div className="toolbar">
                {['todos', 'disponible', 'ocupada', 'mantenimiento', 'inactiva'].map(estado => (
                    <AppButton
                        key={estado}
                        size="sm"
                        variant={filtroEstado === estado ? 'primary' : 'secondary'}
                        onClick={() => setFiltroEstado(estado)}
                    >
                        {estado.charAt(0).toUpperCase() + estado.slice(1)}
                    </AppButton>
                ))}
            </div>

            <div className="cards-grid cards-grid--sm">
                {habitaciones.map(h => (
                    <div key={h.id} className="entity-card">
                        <div className="entity-card__header">
                            <h3 className="entity-card__title">Hab. {h.numero}</h3>
                            <span className="badge" style={{ backgroundColor: getColorEstado(h.estado) }}>
                                {h.estado}
                            </span>
                        </div>
                        <p className="entity-card__text">🏢 Piso {h.piso}</p>
                        <p className="entity-card__text">🛏️ {h.tipo_cama}</p>
                        <p className="entity-card__text">📋 {h.tipo_nombre}</p>
                        <p className="entity-card__text">💰 ${h.precio_base?.toLocaleString()}/noche</p>

                        <div className="mt-10">
                            <select
                                className="select-base full-width"
                                value={h.estado}
                                onChange={e => cambiarEstado(h.id, e.target.value)}
                            >
                                <option value="disponible">Disponible</option>
                                <option value="ocupada">Ocupada</option>
                                <option value="mantenimiento">Mantenimiento</option>
                                <option value="inactiva">Inactiva</option>
                            </select>
                        </div>

                        <div className="row-actions mt-10">
                            <AppButton variant="info" size="sm"
                                onClick={() => navigate(`/habitaciones/editar/${h.id}`)}>
                                Editar
                            </AppButton>
                            <AppButton variant="danger" size="sm"
                                onClick={() => eliminar(h.id)}>
                                Eliminar
                            </AppButton>
                        </div>

                        {h.estado === 'ocupada' && (
                            <AppButton className="full-width mt-8"
                                onClick={() => setModalHabitacion(h)}>
                                👁️ Consultar
                            </AppButton>
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

export default Habitaciones;