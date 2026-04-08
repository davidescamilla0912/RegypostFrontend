import axios from 'axios';
// se conecta con todo el backed de flask, y se encarga de enviar el token en cada request
const api = axios.create({
    baseURL: 'http://127.0.0.1:5000'
});

// Agrega el token automáticamente en cada request
api.interceptors.request.use(config => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default api;