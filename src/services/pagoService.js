import api from './api';

const pagoService = {
    getAll: () => api.get('/pagos'),
    getById: (id) => api.get(`/pagos/${id}`),
    create: (data) => api.post('/pagos', data),
    update: (id, data) => api.put(`/pagos/${id}`, data),
    delete: (id) => api.delete(`/pagos/${id}`)
};

export default pagoService;
