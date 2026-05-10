import api from './api';

const reservaService = {
    getAll: () => api.get('/reservas'),
    getById: (id) => api.get(`/reservas/${id}`),
    getActivas: () => api.get('/reservas/activas'),
    getByEstado: (estado) => api.get(`/reservas/estado/${estado}`),
    create: (data) => api.post('/reservas', data),
    update: (id, data) => api.put(`/reservas/${id}`, data),
    updateEstado: (id, estado) => api.patch(`/reservas/${id}/estado`, { estado }),
    confirmar: (id, anticipo) => api.patch(`/reservas/${id}/confirmar`, { anticipo }),
    delete: (id) => api.delete(`/reservas/${id}`),
    getHabitaciones: (id) => api.get(`/reservas/${id}/habitaciones`),
    agregarHabitacion: (id, data) => api.post(`/reservas/${id}/habitaciones`, data),
    quitarHabitacion: (reserva_id, habitacion_id) => api.delete(`/reservas/${reserva_id}/habitaciones/${habitacion_id}`),
    tieneFuturas: (habitacionId) => api.get(`/reservas/habitacion/${habitacionId}/futuras`),
    extender: (id, diasExtra) => api.patch(`/reservas/${id}/extender`, { dias_extra: diasExtra })
};


export default reservaService;