import api from './api';

const cajaService = {
    getAll: () => api.get('/caja'),
    getById: (id) => api.get(`/caja/${id}`),
    getByFecha: (fecha) => api.get(`/caja/fecha/${fecha}`),
    create: (data) => api.post('/caja', data),
    update: (id, data) => api.put(`/caja/${id}`, data),
    delete: (id) => api.delete(`/caja/${id}`)
};

export default cajaService;