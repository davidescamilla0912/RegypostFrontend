import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppButton, PageHeader } from '../components/ui';
import empleadoService from '../services/empleadoService';
import rolService from '../services/rolService';

function NuevoEmpleado() {
    const [formData, setFormData] = useState({
        nombre: '',
        apellido: '',
        usuario: '',
        contrasena: '',
        telefono: '',
        email: '',
        rol_id: '',
        activo: '1'
    });
    const [roles, setRoles] = useState([]);
    const [error, setError] = useState('');
    const [exito, setExito] = useState('');
    const [guardando, setGuardando] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        cargarRoles();
    }, []);

    const cargarRoles = async () => {
        try {
            const res = await rolService.getAll();
            setRoles(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            setError('No se pudieron cargar los roles.');
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const validar = () => {
        if (!formData.nombre.trim()) return 'El nombre es obligatorio.';
        if (!formData.telefono.trim()) return 'El telefono es obligatorio.';
        if (!formData.email.trim()) return 'El email es obligatorio.';
        if (!formData.rol_id) return 'Debes seleccionar un rol.';
        if (formData.activo !== '1' && formData.activo !== '0') return 'Selecciona un estado valido.';
        if (!formData.usuario.trim()) return 'El usuario es obligatorio.';
        if (!formData.contrasena.trim()) return 'La contrasena es obligatoria.';
        return '';
    };

    const guardar = async () => {
        const mensajeValidacion = validar();
        if (mensajeValidacion) {
            setError(mensajeValidacion);
            setExito('');
            return;
        }

        try {
            setGuardando(true);
            setError('');

            const payload = {
                nombre: formData.nombre.trim(),
                apellido: formData.apellido.trim(),
                usuario: formData.usuario.trim(),
                contrasena: formData.contrasena,
                telefono: formData.telefono.trim(),
                email: formData.email.trim(),
                activo: Number(formData.activo)
            };

            const createRes = await empleadoService.create(payload);
            const empleadoId = createRes?.data?.id || createRes?.data?.empleado?.id;

            if (empleadoId) {
                await empleadoService.asignarRol(empleadoId, Number(formData.rol_id));
            }

            setExito('Empleado creado correctamente.');
            setTimeout(() => navigate('/empleados'), 1200);
        } catch (err) {
            const backendMsg = err?.response?.data?.mensaje || err?.response?.data?.error;
            setError(backendMsg || 'Error al crear el empleado. Verifica la informacion.');
            setExito('');
        } finally {
            setGuardando(false);
        }
    };

    return (
        <div style={styles.container}>
            <PageHeader 
                title="Nuevo Empleado"
                onBack={() => navigate('/empleados')}
            />

            <div style={styles.formulario}>
                {error && <p style={styles.error}>{error}</p>}
                {exito && <p style={styles.exito}>{exito}</p>}

                <div style={styles.formGrid}>
                    <div>
                        <label style={styles.label}>Nombre *</label>
                        <input
                            style={styles.input}
                            name="nombre"
                            placeholder="Nombre"
                            value={formData.nombre}
                            onChange={handleChange}
                        />
                    </div>
                    <div>
                        <label style={styles.label}>Apellido</label>
                        <input
                            style={styles.input}
                            name="apellido"
                            placeholder="Apellido"
                            value={formData.apellido}
                            onChange={handleChange}
                        />
                    </div>
                    <div>
                        <label style={styles.label}>Telefono *</label>
                        <input
                            style={styles.input}
                            name="telefono"
                            placeholder="Telefono"
                            value={formData.telefono}
                            onChange={handleChange}
                        />
                    </div>
                    <div>
                        <label style={styles.label}>Email *</label>
                        <input
                            style={styles.input}
                            name="email"
                            type="email"
                            placeholder="Email"
                            value={formData.email}
                            onChange={handleChange}
                        />
                    </div>
                    <div>
                        <label style={styles.label}>Usuario *</label>
                        <input
                            style={styles.input}
                            name="usuario"
                            placeholder="Usuario para iniciar sesion"
                            value={formData.usuario}
                            onChange={handleChange}
                        />
                    </div>
                    <div>
                        <label style={styles.label}>Contrasena *</label>
                        <input
                            style={styles.input}
                            name="contrasena"
                            type="password"
                            placeholder="Contrasena"
                            value={formData.contrasena}
                            onChange={handleChange}
                        />
                    </div>
                    <div>
                        <label style={styles.label}>Rol *</label>
                        <select
                            style={styles.input}
                            name="rol_id"
                            value={formData.rol_id}
                            onChange={handleChange}
                        >
                            <option value="">Seleccione un rol</option>
                            {roles.map((rol) => (
                                <option key={rol.id} value={rol.id}>{rol.nombre}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label style={styles.label}>Estado *</label>
                        <select
                            style={styles.input}
                            name="activo"
                            value={formData.activo}
                            onChange={handleChange}
                        >
                            <option value="1">Activo</option>
                            <option value="0">Inactivo</option>
                        </select>
                    </div>
                </div>

                <div style={styles.formAcciones}>
                    <AppButton 
                        variant="success"
                        onClick={guardar} 
                        disabled={guardando}
                    >
                        {guardando ? 'Guardando...' : 'Guardar Empleado'}
                    </AppButton>
                    <AppButton 
                        variant="danger"
                        onClick={() => navigate('/empleados')} 
                        disabled={guardando}
                    >
                        Cancelar
                    </AppButton>
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
    formAcciones: { display: 'flex', gap: '10px' },
    btnGuardar: { padding: '10px 25px', backgroundColor: '#2ecc71', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '15px' },
    btnCancelar: { padding: '10px 25px', backgroundColor: '#e74c3c', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '15px' },
    btnVolver: { padding: '8px 15px', backgroundColor: '#95a5a6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' },
    error: { color: '#e74c3c', backgroundColor: '#fde8e8', padding: '10px', borderRadius: '6px', marginBottom: '15px' },
    exito: { color: '#2ecc71', backgroundColor: '#e8fde8', padding: '10px', borderRadius: '6px', marginBottom: '15px' }
};

export default NuevoEmpleado;