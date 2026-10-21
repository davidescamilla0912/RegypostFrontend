import api from './api';

const authService = {
    login: (usuario, contrasena) => api.post('/auth/login', { usuario, contrasena }),
    /** Quien soy segun el token. No confia en lo que haya en localStorage (§5.2). */
    me: () => api.get('/auth/me'),
};

export default authService;
