import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import clienteService from '../services/clienteService';

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

    if (loading) return <p style={{ textAlign: 'center', marginTop: '50px' }}>Cargando...</p>;

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <button style={styles.btnVolver} onClick={() => navigate('/clientes')}>← Volver</button>
                <h2 style={styles.titulo}>Editar Cliente #{id}</h2>
                <div />
            </div>

            <div style={styles.formulario}>
                {error && <p style={styles.error}>{error}</p>}
                {exito && <p style={styles.exito}>{exito}</p>}

                <div style={styles.formGrid}>
                    <div>
                        <label style={styles.label}>Tipo Documento *</label>
                        <select style={styles.input} name="tipo_documento"
                            value={formData.tipo_documento} onChange={handleChange}>
                            <option value="CC">CC</option>
                            <option value="CE">CE</option>
                            <option value="Pasaporte">Pasaporte</option>
                            <option value="NIT">NIT</option>
                            <option value="Otro">Otro</option>
                        </select>
                    </div>
                    <div>
                        <label style={styles.label}>Número Documento *</label>
                        <input style={styles.input} name="numero_documento"
                            placeholder="Número de documento"
                            value={formData.numero_documento} onChange={handleChange} />
                    </div>
                    <div>
                        <label style={styles.label}>Nombre *</label>
                        <input style={styles.input} name="nombre"
                            placeholder="Nombre"
                            value={formData.nombre} onChange={handleChange} />
                    </div>
                    <div>
                        <label style={styles.label}>Apellido *</label>
                        <input style={styles.input} name="apellido"
                            placeholder="Apellido"
                            value={formData.apellido} onChange={handleChange} />
                    </div>
                    <div>
                        <label style={styles.label}>Nacionalidad</label>
                        <input style={styles.input} name="nacionalidad"
                            placeholder="Nacionalidad"
                            value={formData.nacionalidad} onChange={handleChange} />
                    </div>
                    <div>
                        <label style={styles.label}>Teléfono</label>
                        <input style={styles.input} name="telefono"
                            placeholder="Teléfono"
                            value={formData.telefono} onChange={handleChange} />
                    </div>
                    <div>
                        <label style={styles.label}>Email</label>
                        <input style={styles.input} name="email" type="email"
                            placeholder="Email"
                            value={formData.email} onChange={handleChange} />
                    </div>
                    <div>
                        <label style={styles.label}>Dirección</label>
                        <input style={styles.input} name="direccion"
                            placeholder="Dirección"
                            value={formData.direccion} onChange={handleChange} />
                    </div>
                    <div>
                        <label style={styles.label}>Empresa</label>
                        <input style={styles.input} name="empresa"
                            placeholder="Empresa"
                            value={formData.empresa} onChange={handleChange} />
                    </div>
                    <div>
                        <label style={styles.label}>Fecha Nacimiento</label>
                        <input style={styles.input} name="fecha_nacimiento" type="date"
                            value={formData.fecha_nacimiento} onChange={handleChange} />
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                        <label style={styles.label}>Notas</label>
                        <textarea style={styles.textarea} name="notas"
                            placeholder="Notas adicionales"
                            value={formData.notas} onChange={handleChange} />
                    </div>
                </div>

                <div style={styles.formAcciones}>
                    <button style={styles.btnGuardar} onClick={guardar}>Actualizar Cliente</button>
                    <button style={styles.btnCancelar} onClick={() => navigate('/clientes')}>Cancelar</button>
                </div>
            </div>
        </div>
    );
}

const styles = {
    container: { padding: '20px', backgroundColor: '#f0f2f5', minHeight: '100vh' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
    titulo: { margin: 0, color: '#1a1a2e' },
    formulario: { backgroundColor: 'white', borderRadius: '10px', padding: '25px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' },
    formGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px', marginBottom: '20px' },
    label: { display: 'block', fontSize: '13px', color: '#666', marginBottom: '5px' },
    input: { width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px', boxSizing: 'border-box' },
    textarea: { width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px', boxSizing: 'border-box', height: '80px', resize: 'vertical' },
    formAcciones: { display: 'flex', gap: '10px' },
    btnGuardar: { padding: '10px 25px', backgroundColor: '#3498db', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '15px' },
    btnCancelar: { padding: '10px 25px', backgroundColor: '#e74c3c', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '15px' },
    btnVolver: { padding: '8px 15px', backgroundColor: '#95a5a6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' },
    error: { color: '#e74c3c', backgroundColor: '#fde8e8', padding: '10px', borderRadius: '6px', marginBottom: '15px' },
    exito: { color: '#2ecc71', backgroundColor: '#e8fde8', padding: '10px', borderRadius: '6px', marginBottom: '15px' }
};

export default EditarCliente;