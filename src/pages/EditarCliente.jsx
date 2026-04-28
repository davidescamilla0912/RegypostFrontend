import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import clienteService from '../services/clienteService';
import { AppButton, PageHeader } from '../components/ui';

function EditarCliente() {
    const { id } = useParams();
    const [formData, setFormData] = useState({
        tipo_documento: 'CC',
        numero_documento: '',
        nombre: '',
        apellido: '',
        nacionalidad: 'Colombiana',
        telefono: '',
        email: '',
        direccion: '',
        empresa: '',
        fecha_nacimiento: '',
        notas: ''
    });
    const [error, setError] = useState('');
    const [exito, setExito] = useState('');
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        cargarCliente();
    }, []);

    const cargarCliente = async () => {
        try {
            const res = await clienteService.getById(id);
            setFormData({
                tipo_documento: res.data.tipo_documento || 'CC',
                numero_documento: res.data.numero_documento || '',
                nombre: res.data.nombre || '',
                apellido: res.data.apellido || '',
                nacionalidad: res.data.nacionalidad || 'Colombiana',
                telefono: res.data.telefono || '',
                email: res.data.email || '',
                direccion: res.data.direccion || '',
                empresa: res.data.empresa || '',
                fecha_nacimiento: res.data.fecha_nacimiento || '',
                notas: res.data.notas || ''
            });
        } catch (err) {
            setError('Error cargando cliente');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const guardar = async () => {
        if (!formData.numero_documento || !formData.nombre || !formData.apellido) {
            setError('Documento, nombre y apellido son requeridos');
            return;
        }
        try {
            await clienteService.update(id, formData);
            setExito('Cliente actualizado correctamente');
            setTimeout(() => navigate('/clientes'), 1500);
        } catch (err) {
            setError('Error al actualizar el cliente');
        }
    };

    if (loading) return <p className="page-loading">Cargando...</p>;

    return (
        <div className="page-container">
            <PageHeader title={`Editar Cliente #${id}`} onBack={() => navigate('/clientes')} />

            <div className="panel">
                {error && <p className="error-text">{error}</p>}
                {exito && <p className="success-text">{exito}</p>}

                <div className="form-grid form-grid--2">
                    <div>
                        <label className="label">Tipo Documento *</label>
                        <select className="select-base full-width" name="tipo_documento"
                            value={formData.tipo_documento} onChange={handleChange}>
                            <option value="CC">CC</option>
                            <option value="CE">CE</option>
                            <option value="Pasaporte">Pasaporte</option>
                            <option value="NIT">NIT</option>
                            <option value="Otro">Otro</option>
                        </select>
                    </div>
                    <div>
                        <label className="label">Número Documento *</label>
                        <input className="input-base full-width" name="numero_documento"
                            placeholder="Número de documento"
                            value={formData.numero_documento} onChange={handleChange} />
                    </div>
                    <div>
                        <label className="label">Nombre *</label>
                        <input className="input-base full-width" name="nombre"
                            placeholder="Nombre"
                            value={formData.nombre} onChange={handleChange} />
                    </div>
                    <div>
                        <label className="label">Apellido *</label>
                        <input className="input-base full-width" name="apellido"
                            placeholder="Apellido"
                            value={formData.apellido} onChange={handleChange} />
                    </div>
                    <div>
                        <label className="label">Nacionalidad</label>
                        <input className="input-base full-width" name="nacionalidad"
                            placeholder="Nacionalidad"
                            value={formData.nacionalidad} onChange={handleChange} />
                    </div>
                    <div>
                        <label className="label">Teléfono</label>
                        <input className="input-base full-width" name="telefono"
                            placeholder="Teléfono"
                            value={formData.telefono} onChange={handleChange} />
                    </div>
                    <div>
                        <label className="label">Email</label>
                        <input className="input-base full-width" name="email" type="email"
                            placeholder="Email"
                            value={formData.email} onChange={handleChange} />
                    </div>
                    <div>
                        <label className="label">Dirección</label>
                        <input className="input-base full-width" name="direccion"
                            placeholder="Dirección"
                            value={formData.direccion} onChange={handleChange} />
                    </div>
                    <div>
                        <label className="label">Empresa</label>
                        <input className="input-base full-width" name="empresa"
                            placeholder="Empresa"
                            value={formData.empresa} onChange={handleChange} />
                    </div>
                    <div>
                        <label className="label">Fecha Nacimiento</label>
                        <input className="input-base full-width" name="fecha_nacimiento" type="date"
                            value={formData.fecha_nacimiento} onChange={handleChange} />
                    </div>
                    <div className="form-grid-span-2">
                        <label className="label">Notas</label>
                        <textarea className="input-base textarea-base full-width" name="notas"
                            placeholder="Notas adicionales"
                            value={formData.notas} onChange={handleChange} />
                    </div>
                </div>

                <div className="form-actions">
                    <AppButton variant="info" size="lg" onClick={guardar}>Actualizar Cliente</AppButton>
                    <AppButton variant="danger" size="lg" onClick={() => navigate('/clientes')}>Cancelar</AppButton>
                </div>
            </div>
        </div>
    );
}

export default EditarCliente;