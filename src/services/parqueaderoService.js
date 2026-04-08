import api from './api';

const parqueaderoService = {
    getAll: () => api.get('/parqueadero'),
    getById: (id) => api.get(`/parqueadero/${id}`),
    getActivos: () => api.get('/parqueadero/activos'),
    getByPlaca: (placa) => api.get(`/parqueadero/placa/${placa}`),
    create: (data) => api.post('/parqueadero', data),
    registrarSalida: (id, data) => api.patch(`/parqueadero/${id}/salida`, data),
    delete: (id) => api.delete(`/parqueadero/${id}`)
};

export default parqueaderoService;