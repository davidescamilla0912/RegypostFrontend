import api from './api';

const gastoService = {
    getAll: () => api.get('/gastos'),
    getById: (id) => api.get(`/gastos/${id}`),
    getByFecha: (fecha) => api.get(`/gastos/fecha/${fecha}`),
    getByCategoria: (categoria) => api.get(`/gastos/categoria/${categoria}`),
    create: (data) => api.post('/gastos', data),
    update: (id, data) => api.put(`/gastos/${id}`, data),
    delete: (id) => api.delete(`/gastos/${id}`)
};

export default gastoService;