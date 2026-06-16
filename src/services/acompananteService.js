import api from './api';

const acompananteService = {
    getByReserva: (reservaId) => api.get(`/reservas/${reservaId}/acompanantes`),
    create: (reservaId, data) => api.post(`/reservas/${reservaId}/acompanantes`, data),
    createBulk: (reservaId, data) => api.post(`/reservas/${reservaId}/acompanantes/bulk`, data),
    update: (id, data) => api.put(`/acompanantes/${id}`, data),
    delete: (id) => api.delete(`/acompanantes/${id}`),
};

export default acompananteService;
