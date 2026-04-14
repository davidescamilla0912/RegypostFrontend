import api from './api';

const rolService = {
    getAll: () => api.get('/roles')
};

export default rolService;