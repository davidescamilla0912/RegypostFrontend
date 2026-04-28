import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppButton, PageHeader } from '../components/ui';
import empleadoService from '../services/empleadoService';
import rolService from '../services/rolService';

function EditarEmpleado() {
    const { id } = useParams();
    const [formData, setFormData] = useState({
        nombre: '',
        apellido: '',
        usuario: '',
        telefono: '',
        email: '',
        rolesSeleccionados: [],
        activo: '1'
    });
    const [roles, setRoles] = useState([]);
    const [rolesActuales, setRolesActuales] = useState([]);
    const [datosIniciales, setDatosIniciales] = useState(null);
    const [rolesInicialesIds, setRolesInicialesIds] = useState([]);
    const [error, setError] = useState('');
    const [exito, setExito] = useState('');
    const [loading, setLoading] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const inicializar = async () => {
            try {
                const [empleadoRes, rolesRes] = await Promise.all([
                    empleadoService.getById(id),
                    rolService.getAll()
                ]);

                const empleado = empleadoRes?.data || {};
                const listaRoles = Array.isArray(rolesRes?.data) ? rolesRes.data : [];
                setRoles(listaRoles);

                const currentRoles = extraerRoles(empleado, listaRoles);
                setRolesActuales(currentRoles);

                const rolesIds = currentRoles.map(rol => Number(rol.id)).filter(id => Number.isFinite(id));
                setRolesInicialesIds(rolesIds);

                const datosForm = {
                    nombre: empleado.nombre || '',
                    apellido: empleado.apellido || '',
                    usuario: empleado.usuario || '',
                    telefono: empleado.telefono || '',
                    email: empleado.email || '',
                    rolesSeleccionados: rolesIds,
                    activo: empleado.activo ? '1' : '0'
                };

                setFormData(datosForm);
                setDatosIniciales(datosForm);
            } catch (err) {
                setError('Error cargando el empleado o los roles.');
            } finally {
                setLoading(false);
            }
        };
        inicializar();
    }, [id]);

    const extraerRoles = (empleado, listaRolesDisponibles = []) => {
        // Si empleado.roles es un STRING separado por comas
        if (typeof empleado.roles === 'string' && empleado.roles.trim().length > 0) {
            const nombresRoles = empleado.roles.split(',').map(r => r.trim());
            
            return nombresRoles.map(nombreRol => {
                const rolEncontrado = listaRolesDisponibles.find(r => 
                    r.nombre.toLowerCase() === nombreRol.toLowerCase()
                );
                if (rolEncontrado) {
                    return {
                        id: Number(rolEncontrado.id),
                        nombre: rolEncontrado.nombre
                    };
                }
                return null;
            }).filter(rol => rol !== null);
        }
        // Si empleado.roles es un ARRAY de objetos
        else if (Array.isArray(empleado.roles) && empleado.roles.length > 0) {
            return empleado.roles.map((rol) => ({
                id: Number(rol.id),
                nombre: rol.nombre
            })).filter((rol) => Number.isFinite(rol.id));
        }
        // Si empleado.roles_detalle
        else if (Array.isArray(empleado.roles_detalle) && empleado.roles_detalle.length > 0) {
            return empleado.roles_detalle.map((rol) => ({
                id: Number(rol.id),
                nombre: rol.nombre
            })).filter((rol) => Number.isFinite(rol.id));
        }
        // Si empleado.usuario_roles
        else if (Array.isArray(empleado.usuario_roles) && empleado.usuario_roles.length > 0) {
            return empleado.usuario_roles.map((rol) => ({
                id: Number(rol.id),
                nombre: rol.nombre
            })).filter((rol) => Number.isFinite(rol.id));
        }
        // Si empleado.rol_id (un solo rol)
        else if (empleado.rol_id) {
            return [{ id: Number(empleado.rol_id), nombre: 'Rol' }].filter((rol) => Number.isFinite(rol.id));
        }

        return [];
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleRolChange = (rolId) => {
        setFormData((prev) => {
            const rolesActuales = Array.isArray(prev.rolesSeleccionados) ? prev.rolesSeleccionados : [];
            const rolIdNum = Number(rolId);
            
            if (rolesActuales.includes(rolIdNum)) {
                // Si ya existe, lo quitamos
                const nuevosRoles = rolesActuales.filter(id => id !== rolIdNum);
                return { ...prev, rolesSeleccionados: nuevosRoles };
            } else {
                // Si no existe, lo agregamos
                return { ...prev, rolesSeleccionados: [...rolesActuales, rolIdNum] };
            }
        });
    };

    const validar = () => {
        if (!formData.nombre.trim()) return 'El nombre es obligatorio.';
        if (!formData.telefono.trim()) return 'El telefono es obligatorio.';
        if (!formData.email.trim()) return 'El email es obligatorio.';
        if (!formData.rolesSeleccionados || formData.rolesSeleccionados.length === 0) return 'Debes seleccionar al menos un rol.';
        if (formData.activo !== '1' && formData.activo !== '0') return 'Selecciona un estado valido.';
        return '';
    };

    const sincronizarRoles = async (empleadoId, rolesSeleccionados) => {
        const rolesSeleccionadosNum = (rolesSeleccionados || []).map(id => Number(id)).filter(Number.isFinite);
        const rolesInicialesNum = (rolesInicialesIds || []).map(id => Number(id)).filter(Number.isFinite);

        // Roles a asignar (nuevos)
        const rolesParaAsignar = rolesSeleccionadosNum.filter(id => !rolesInicialesNum.includes(id));
        
        // Roles a quitar (que estaban antes pero ahora no)
        const rolesParaQuitar = rolesInicialesNum.filter(id => !rolesSeleccionadosNum.includes(id));

        // Asignar nuevos roles
        for (const rolId of rolesParaAsignar) {
            await empleadoService.asignarRol(empleadoId, rolId);
        }

        // Quitar roles
        for (const rolId of rolesParaQuitar) {
            await empleadoService.quitarRol(empleadoId, rolId);
        }
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
                telefono: formData.telefono.trim(),
                email: formData.email.trim(),
                activo: Number(formData.activo)
            };

            const baseActual = {
                nombre: formData.nombre.trim(),
                apellido: formData.apellido.trim(),
                usuario: formData.usuario.trim(),
                telefono: formData.telefono.trim(),
                email: formData.email.trim(),
                activo: formData.activo
            };

            const baseInicial = {
                nombre: (datosIniciales?.nombre || '').trim(),
                apellido: (datosIniciales?.apellido || '').trim(),
                usuario: (datosIniciales?.usuario || '').trim(),
                telefono: (datosIniciales?.telefono || '').trim(),
                email: (datosIniciales?.email || '').trim(),
                activo: datosIniciales?.activo || ''
            };

            const cambioDatosBase = Object.keys(baseActual).some((key) => baseActual[key] !== baseInicial[key]);
            const rolesInicialesOrdenados = ((datosIniciales?.rolesSeleccionados || []).sort((a, b) => a - b)).join(',');
            const rolesActualesOrdenados = ((formData.rolesSeleccionados || []).sort((a, b) => a - b)).join(',');
            const cambioRoles = rolesActualesOrdenados !== rolesInicialesOrdenados;

            if (!cambioDatosBase && !cambioRoles) {
                setExito('No hay cambios para guardar.');
                setTimeout(() => navigate('/empleados'), 800);
                return;
            }

            if (cambioRoles) {
                await sincronizarRoles(id, formData.rolesSeleccionados);
            }

            if (cambioDatosBase) {
                await empleadoService.update(id, payload);
            }

            setExito('Empleado actualizado correctamente.');
            setTimeout(() => navigate('/empleados'), 1200);
        } catch (err) {
            const backendMsg = err?.response?.data?.mensaje || err?.response?.data?.error;
            setError(backendMsg || 'Error al actualizar el empleado.');
            setExito('');
        } finally {
            setGuardando(false);
        }
    };

    if (loading) return <p className="page-loading">Cargando...</p>;

    return (
        <div className="page-container">
            <PageHeader 
                title={`Editar Empleado #${id}`}
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
                        <label className="label">Usuario</label>
                        <input
                            className="input-base full-width"
                            name="usuario"
                            placeholder="Usuario"
                            value={formData.usuario}
                            onChange={handleChange}
                        />
                    </div>
                    <div className="form-grid-span-2">
                        <label className="label">Roles *</label>
                        <div className="roles-container">
                            {roles.length > 0 ? (
                                roles.map((rol) => {
                                    const rolId = Number(rol.id);
                                    const isChecked = Array.isArray(formData.rolesSeleccionados) && formData.rolesSeleccionados.some(r => Number(r) === rolId);
                                    return (
                                        <label key={rol.id} className="checkbox-label">
                                            <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={() => handleRolChange(rolId)}
                                                className="checkbox-input"
                                            />
                                            <span>{rol.nombre}</span>
                                        </label>
                                    );
                                })
                            ) : (
                                <p className="muted-text mb-0">No hay roles disponibles</p>
                            )}
                        </div>
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
                        variant="primary"
                        size="lg"
                        onClick={guardar} 
                        disabled={guardando}
                    >
                        {guardando ? 'Guardando...' : 'Actualizar Empleado'}
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

export default EditarEmpleado;