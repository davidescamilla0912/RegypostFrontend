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
        <div className="page-container">
            <PageHeader 
                title="Nuevo Empleado"
                onBack={() => navigate('/empleados')}
            />

            <div className="panel">
                {error && <p className="error-text">{error}</p>}
                {exito && <p className="success-text">{exito}</p>}

                <div className="form-grid form-grid--2">
                    <div>
                        <label className="label">Nombre *</label>
                        <input
                            className="input-base full-width"
                            name="nombre"
                            placeholder="Nombre"
                            value={formData.nombre}
                            onChange={handleChange}
                        />
                    </div>
                    <div>
                        <label className="label">Apellido</label>
                        <input
                            className="input-base full-width"
                            name="apellido"
                            placeholder="Apellido"
                            value={formData.apellido}
                            onChange={handleChange}
                        />
                    </div>
                    <div>
                        <label className="label">Telefono *</label>
                        <input
                            className="input-base full-width"
                            name="telefono"
                            placeholder="Telefono"
                            value={formData.telefono}
                            onChange={handleChange}
                        />
                    </div>
                    <div>
                        <label className="label">Email *</label>
                        <input
                            className="input-base full-width"
                            name="email"
                            type="email"
                            placeholder="Email"
                            value={formData.email}
                            onChange={handleChange}
                        />
                    </div>
                    <div>
                        <label className="label">Usuario *</label>
                        <input
                            className="input-base full-width"
                            name="usuario"
                            placeholder="Usuario para iniciar sesion"
                            value={formData.usuario}
                            onChange={handleChange}
                        />
                    </div>
                    <div>
                        <label className="label">Contrasena *</label>
                        <input
                            className="input-base full-width"
                            name="contrasena"
                            type="password"
                            placeholder="Contrasena"
                            value={formData.contrasena}
                            onChange={handleChange}
                        />
                    </div>
                    <div>
                        <label className="label">Rol *</label>
                        <select
                            className="select-base full-width"
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
                        <label className="label">Estado *</label>
                        <select
                            className="select-base full-width"
                            name="activo"
                            value={formData.activo}
                            onChange={handleChange}
                        >
                            <option value="1">Activo</option>
                            <option value="0">Inactivo</option>
                        </select>
                    </div>
                </div>

                <div className="form-actions">
                    <AppButton 
                        variant="success"
                        size="lg"
                        onClick={guardar} 
                        disabled={guardando}
                    >
                        {guardando ? 'Guardando...' : 'Guardar Empleado'}
                    </AppButton>
                    <AppButton 
                        variant="danger"
                        size="lg"
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

export default NuevoEmpleado;