import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import habitacionService from '../services/habitacionService';
import reservaService from '../services/reservaService';
import ModalHabitacion from '../components/ModalHabitacion';
import { AppButton, PageHeader } from '../components/ui';
import { extraerLista } from '../utils/apiResponse';
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
            } else if (filtroEstado === 'reservada') {
                res = await habitacionService.getAll();
                const habitacionesFiltradas = extraerLista(res)
                    .filter((habitacion) =>
                        String(habitacion.estado || '').toLowerCase() === 'reservada'
                    )
                setHabitaciones(habitacionesFiltradas);
                return;
            } else {
                res = await habitacionService.getByEstado(filtroEstado);
            }
            
            // Cargar reservas para verificar habitaciones disponibles con futuras
            const resReservas = await reservaService.getAll();
            const reservasLista = extraerLista(resReservas);
            
            const habitacionesData = extraerLista(res);
            const hoy = new Date();
            hoy.setHours(0, 0, 0, 0);
            
            // Marcar habitaciones que tienen reservas futuras
            habitacionesData.forEach(h => {
                const tieneFuturas = reservasLista.some(r => {
                    if (r.estado === 'cancelada') return false;
                    const fechaEntrada = new Date(r.fecha_entrada);
                    fechaEntrada.setHours(0, 0, 0, 0);
                    if (fechaEntrada < hoy) return false;
                    
                    // Buscar por habitacion (singular o plural, número o array)
                    const habDirecta = r.habitacion === h.id || r.habitacion === String(h.id);
                    const habEnArray = r.habitaciones && Array.isArray(r.habitaciones) && 
                        (r.habitaciones.includes(h.id) || 
                         r.habitaciones.includes(String(h.id)) ||
                         r.habitaciones.find(hab => hab.id === h.id || hab === h.id));
                    
                    return habDirecta || habEnArray;
                });
                
                h.tieneFuturas = tieneFuturas;
            });
            
            setHabitaciones(habitacionesData);
        } catch (err) {
            console.error('Error cargando habitaciones', err);
        } finally {
            setLoading(false);
        }
    };;

    const cambiarEstado = async (id, estado) => {
    try {
        let finalEstado = estado;

        if (String(estado).toLowerCase() === 'disponible') {
            const res = await reservaService.tieneFuturas(id);
            const tiene = res.data?.data?.tiene_reservas_futuras ?? res.data?.tiene_reservas_futuras;

            if (tiene) {
                finalEstado = 'reservada';
                alert('⚠️ Esta habitación tiene reservas futuras. El estado se ajustó a "Reservada" automáticamente.');
            }
        }

        await habitacionService.updateEstado(id, finalEstado);
        cargarHabitaciones();

    } catch (err) {
        const serverMsg = err?.response?.data || err?.message || String(err);
        console.error('Error cambiando estado', serverMsg);
        alert(`Error al cambiar estado: ${typeof serverMsg === 'string' ? serverMsg : JSON.stringify(serverMsg)}`);
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
            reservada: '#8e44ad',
            mantenimiento: '#f39c12',
            bloqueada: '#95a5a6'
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
                {['todos', 'disponible', 'ocupada', 'mantenimiento', 'bloqueada', 'reservada'].map(estado => (
                    <AppButton
                        key={estado}
                        size="sm"
                        variant={filtroEstado === estado ? 'primary' : 'secondary'}
                        onClick={() => setFiltroEstado(estado)}
                    >
                        {estado === 'reservada' ? 'Llegada Prevista' : estado.charAt(0).toUpperCase() + estado.slice(1)}
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
                                <option value="reservada">Reservada</option>
                                <option value="mantenimiento">Mantenimiento</option>
                                <option value="bloqueada">Bloqueada</option>
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

                        {(h.estado === 'ocupada' || h.estado === 'reservada' || h.tieneFuturas) && (
                            <AppButton className="full-width mt-8"
                                onClick={() => setModalHabitacion(h)}>
                                👁️ Consultar Reservas
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