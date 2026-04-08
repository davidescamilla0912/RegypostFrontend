import api from './api';

const empleadoService = {
    getAll: () => api.get('/empleados'),
    getById: (id) => api.get(`/empleados/${id}`),
    create: (data) => api.post('/empleados', data),
    update: (id, data) => api.put(`/empleados/${id}`, data),
    updateContrasena: (id, contrasena) => api.patch(`/empleados/${id}/contrasena`, { contrasena }),
    delete: (id) => api.delete(`/empleados/${id}`),
    asignarRol: (empleado_id, rol_id) => api.post(`/empleados/${empleado_id}/roles`, { rol_id }),
    quitarRol: (empleado_id, rol_id) => api.delete(`/empleados/${empleado_id}/roles/${rol_id}`)
};

export default empleadoService;