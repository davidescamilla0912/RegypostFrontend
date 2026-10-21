import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import habitacionService from '../services/habitacionService';
import { AppButton, PageHeader } from '../components/ui';
import { extraerLista } from '../utils/apiResponse';
import '../components/ui/ui.css';

function NuevoHabitacion() {
    const navigate = useNavigate();
    const [tipos, setTipos] = useState([]);
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState('');
    const [exito, setExito] = useState('');
    const [formData, setFormData] = useState({
        numero: '',
        piso: '',
        tipo_cama: '',
        tipo_id: '',
        estado: 'disponible',
        notas_mantenimiento: ''
    });

    useEffect(() => {
        cargarTipos();
    }, []);

    const cargarTipos = async () => {
        try {
            const res = await habitacionService.getTipos();
            const lista = extraerLista(res);
            setTipos(lista);

            // Preselecciona un tipo valido para evitar envios con tipo_id vacio o invalido.
            if (lista.length > 0) {
                setFormData((prev) => ({
                    ...prev,
                    tipo_id: prev.tipo_id || String(lista[0].id)
                }));
            }
        } catch (err) {
            setError('No se pudieron cargar los tipos de habitacion.');
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const validar = () => {
        if (!formData.numero.trim()) return 'El numero es obligatorio.';
        if (!formData.piso.trim()) return 'El piso es obligatorio.';
        if (!Array.isArray(tipos) || tipos.length === 0) return 'No hay tipos de habitacion disponibles para crear.';
        if (!formData.tipo_id) return 'Debes seleccionar un tipo de habitacion.';

        const tipoIdNum = Number(formData.tipo_id);
        const tipoExiste = tipos.some((t) => Number(t.id) === tipoIdNum);
        if (!tipoExiste) return 'El tipo de habitacion seleccionado no es valido.';

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

            const payload = {
                numero: formData.numero.trim(),
                piso: Number(formData.piso),
                tipo_cama: formData.tipo_cama.trim(),
                tipo_id: Number(formData.tipo_id),
                estado: formData.estado,
                notas_mantenimiento: formData.notas_mantenimiento.trim() || null
            };

            await habitacionService.create(payload);
            setExito('Habitacion creada correctamente.');
            setTimeout(() => navigate('/habitaciones'), 1000);
        } catch (err) {
            const backendMsg = err?.response?.data?.mensaje || err?.response?.data?.error;
            setError(backendMsg || 'Error al crear la habitacion. Verifica los datos.');
            setExito('');
        } finally {
            setGuardando(false);
        }
    };

    return (
        <div className="page-container">
            <PageHeader
                title="Nueva Habitacion"
                onBack={() => navigate('/habitaciones')}
                backLabel="← Volver"
            />

            <div className="panel">
                {error && (
                    <p style={{ color: '#e74c3c', backgroundColor: '#fde8e8', padding: 10, borderRadius: 6, marginBottom: 15 }}>
                        {error}
                    </p>
                )}
                {exito && (
                    <p style={{ color: '#2ecc71', backgroundColor: '#e8fde8', padding: 10, borderRadius: 6, marginBottom: 15 }}>
                        {exito}
                    </p>
                )}

                <div className="form-grid form-grid--2">
                    <div>
                        <label className="label">Numero *</label>
                        <input
                            className="input-base"
                            name="numero"
                            placeholder="Ej: 301"
                            value={formData.numero}
                            onChange={handleChange}
                        />
                    </div>

                    <div>
                        <label className="label">Piso *</label>
                        <input
                            className="input-base"
                            name="piso"
                            type="number"
                            min="1"
                            placeholder="Ej: 3"
                            value={formData.piso}
                            onChange={handleChange}
                        />
                    </div>

                    <div>
                        <label className="label">Tipo de cama *</label>
                        <input
                            className="input-base"
                            name="tipo_cama"
                            placeholder="Ej: Doble"
                            value={formData.tipo_cama}
                            onChange={handleChange}
                        />
                    </div>

                    <div>
                        <label className="label">Tipo de habitacion *</label>
                        <select
                            className="select-base"
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
                        <label className="label">Estado *</label>
                        <select
                            className="select-base"
                            name="estado"
                            value={formData.estado}
                            onChange={handleChange}
                        >
                            <option value="disponible">Disponible</option>
                            <option value="ocupada">Ocupada</option>
                            <option value="mantenimiento">Mantenimiento</option>
                            <option value="bloqueada">Bloqueada</option>
                        </select>
                    </div>

                    <div style={{ gridColumn: '1 / -1' }}>
                        <label className="label">Notas de mantenimiento</label>
                        <textarea
                            className="input-base"
                            name="notas_mantenimiento"
                            placeholder="Opcional"
                            value={formData.notas_mantenimiento}
                            onChange={handleChange}
                            style={{ width: '100%', minHeight: 90, resize: 'vertical' }}
                        />
                    </div>
                </div>

                <div className="form-actions">
                    <AppButton variant="primary" onClick={guardar} disabled={guardando || tipos.length === 0}>
                        {guardando ? 'Guardando...' : 'Guardar Habitacion'}
                    </AppButton>
                    <AppButton variant="danger" onClick={() => navigate('/habitaciones')} disabled={guardando}>
                        Cancelar
                    </AppButton>
                </div>
            </div>
        </div>
    );
}

export default NuevoHabitacion;