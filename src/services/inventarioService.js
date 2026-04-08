import api from './api';

const inventarioService = {
    getAll: () => api.get('/inventario'),
    getById: (id) => api.get(`/inventario/${id}`),
    getPorReponer: () => api.get('/inventario/reponer'),
    create: (data) => api.post('/inventario', data),
    update: (id, data) => api.put(`/inventario/${id}`, data),
    delete: (id) => api.delete(`/inventario/${id}`),
    getMovimientos: (id) => api.get(`/inventario/${id}/movimientos`),
    registrarMovimiento: (data) => api.post('/inventario/movimientos', data)
};

export default inventarioService;