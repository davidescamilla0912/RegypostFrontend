import api from './api';

const clienteService = {
    getAll: () => api.get('/clientes'),
    getById: (id) => api.get(`/clientes/${id}`),
    getByDocumento: (doc) => api.get(`/clientes/documento/${doc}`),
    search: (q) => api.get(`/clientes/buscar?q=${q}`),
    create: (data) => api.post('/clientes', data),
    update: (id, data) => api.put(`/clientes/${id}`, data),
    delete: (id) => api.delete(`/clientes/${id}`)
};

export default clienteService;