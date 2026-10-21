import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import habitacionService from '../services/habitacionService';
import { AppButton, PageHeader } from '../components/ui';
import { normalizarLista, normalizarObjeto, mensajeDeError } from '../utils/api';
import '../components/ui/ui.css';

function EditarHabitacion() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [tipos, setTipos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState('');
    const [exito, setExito] = useState('');
    const [formData, setFormData] = useState({
        numero: '',
        piso: '',
        tipo_cama: '',
        tipo_id: '',
        notas_mantenimiento: ''
    });
    // El estado de la habitacion no se edita aqui: se cambia desde la tarjeta
    // de Habitaciones, que es donde vive la regla de reservas futuras.
    const [estadoActual, setEstadoActual] = useState('');

    useEffect(() => {
        const inicializar = async () => {
            try {
                const [habRes, tiposRes] = await Promise.all([
                    habitacionService.getById(id),
                    habitacionService.getTipos()
                ]);

                const habitacion = normalizarObjeto(habRes) || {};
                const listaTipos = normalizarLista(tiposRes);
                setTipos(listaTipos);

                setFormData({
                    numero: habitacion.numero != null ? String(habitacion.numero) : '',
                    piso: habitacion.piso != null ? String(habitacion.piso) : '',
                    tipo_cama: habitacion.tipo_cama || '',
                    tipo_id: habitacion.tipo_id != null ? String(habitacion.tipo_id) : '',
                    notas_mantenimiento: habitacion.notas_mantenimiento || ''
                });
                setEstadoActual(habitacion.estado || '');
            } catch (err) {
                setError(mensajeDeError(err, 'No se pudo cargar la habitacion.'));
            } finally {
                setLoading(false);
            }
        };
        inicializar();
    }, [id]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const validar = () => {
        if (!formData.numero.trim()) return 'El numero es obligatorio.';
        if (!formData.piso.trim()) return 'El piso es obligatorio.';
        if (!formData.tipo_id) return 'Debes seleccionar un tipo de habitacion.';
        if (!tipos.some((t) => Number(t.id) === Number(formData.tipo_id))) {
            return 'El tipo de habitacion seleccionado no es valido.';
        }
        return '';
    };

    const guardar = async () => {
        const mensaje = validar();
        if (mensaje) {
            setError(mensaje);
            setExito('');
            return;
        }

        try {
            setGuardando(true);
            setError('');

            await habitacionService.update(id, {
                numero: formData.numero.trim(),
                piso: Number(formData.piso),
                tipo_cama: formData.tipo_cama.trim(),
                tipo_id: Number(formData.tipo_id),
                estado: estadoActual,
                notas_mantenimiento: formData.notas_mantenimiento.trim() || null
            });

            setExito('Habitacion actualizada correctamente.');
            setTimeout(() => navigate('/habitaciones'), 1000);
        } catch (err) {
            setError(mensajeDeError(err, 'Error al actualizar la habitacion.'));
            setExito('');
        } finally {
            setGuardando(false);
        }
    };

    if (loading) return <p className="page-loading">Cargando habitacion...</p>;

    return (
        <div className="page-container">
            <PageHeader
                title={`Editar Habitacion #${id}`}
                onBack={() => navigate('/habitaciones')}
                backLabel="← Volver"
            />

            <div className="panel">
                {error && <p className="error-text">{error}</p>}
                {exito && <p className="success-text">{exito}</p>}

                <div className="form-grid form-grid--2">
                    <div>
                        <label className="label">Numero *</label>
                        <input
                            className="input-base full-width"
                            name="numero"
                            placeholder="Ej: 301"
                            value={formData.numero}
                            onChange={handleChange}
                        />
                    </div>

                    <div>
                        <label className="label">Piso *</label>
                        <input
                            className="input-base full-width"
                            name="piso"
                            type="number"
                            min="1"
                            placeholder="Ej: 3"
                            value={formData.piso}
                            onChange={handleChange}
                        />
                    </div>

                    <div>
                        <label className="label">Tipo de cama</label>
                        <input
                            className="input-base full-width"
                            name="tipo_cama"
                            placeholder="Ej: Doble"
                            value={formData.tipo_cama}
                            onChange={handleChange}
                        />
                    </div>

                    <div>
                        <label className="label">Tipo de habitacion *</label>
                        <select
                            className="select-base full-width"
                            name="tipo_id"
                            value={formData.tipo_id}
                            onChange={handleChange}
                        >
                            <option value="">Seleccione un tipo</option>
                            {tipos.map((t) => (
                                <option key={t.id} value={t.id}>{t.nombre}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="label">Estado actual</label>
                        <input className="input-base full-width" value={estadoActual || '-'} disabled />
                        <small className="muted-text">
                            El estado se cambia desde la tarjeta en la pantalla de Habitaciones.
                        </small>
                    </div>

                    <div style={{ gridColumn: '1 / -1' }}>
                        <label className="label">Notas de mantenimiento</label>
                        <textarea
                            className="input-base full-width"
                            name="notas_mantenimiento"
                            placeholder="Opcional"
                            value={formData.notas_mantenimiento}
                            onChange={handleChange}
                            style={{ minHeight: 90, resize: 'vertical' }}
                        />
                    </div>
                </div>

                <div className="form-actions">
                    <AppButton variant="primary" onClick={guardar} disabled={guardando}>
                        {guardando ? 'Guardando...' : 'Actualizar Habitacion'}
                    </AppButton>
                    <AppButton variant="danger" onClick={() => navigate('/habitaciones')} disabled={guardando}>
                        Cancelar
                    </AppButton>
                </div>
            </div>
        </div>
    );
}

export default EditarHabitacion;
