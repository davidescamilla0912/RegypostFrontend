import axios from 'axios';
// se conecta con el backend subido a RAILWAY
const api = axios.create({
    baseURL: process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000'
});

api.interceptors.request.use(config => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default api;