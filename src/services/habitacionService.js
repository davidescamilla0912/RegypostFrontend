import api from './api';

const habitacionService = {
    getAll: () => api.get('/habitaciones'),
    getById: (id) => api.get(`/habitaciones/${id}`),
    getDisponibles: () => api.get('/habitaciones/disponibles'),
    getByEstado: (estado) => api.get(`/habitaciones/estado/${estado}`),
    create: (data) => api.post('/habitaciones', data),
    update: (id, data) => api.put(`/habitaciones/${id}`, data),
    updateEstado: (id, estado) => api.patch(`/habitaciones/${id}/estado`, { estado }),
    delete: (id) => api.delete(`/habitaciones/${id}`),
    getTipos: () => api.get('/tipos-habitacion')
};

export default habitacionService;