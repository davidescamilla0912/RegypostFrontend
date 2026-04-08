import api from './api';

const consumoService = {
    getByReserva: (reserva_id) => api.get(`/reservas/${reserva_id}/consumos`),
    getTipos: () => api.get('/tipos-consumo'),
    create: (data) => api.post('/consumos', data),
    delete: (id) => api.delete(`/consumos/${id}`)
};

export default consumoService;