import { useMemo } from 'react';

/**
 * Identidad y permisos del empleado en sesion.
 *
 * Los permisos salen del JWT que emite el backend (§5.2). Sirven para decidir
 * QUE SE MUESTRA, nunca para autorizar: la puerta real es el servidor, que ya
 * valida cada endpoint con `@requiere_permiso(...)` y responde 403.
 */

const decodificarToken = (token) => {
    try {
        const carga = token.split('.')[1];
        if (!carga) return null;
        const base64 = carga.replace(/-/g, '+').replace(/_/g, '/');
        const json = decodeURIComponent(
            atob(base64).split('').map((c) => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`).join('')
        );
        return JSON.parse(json);
    } catch {
        return null;
    }
};

export const leerSesion = () => {
    const token = localStorage.getItem('token');
    if (!token) return null;

    const carga = decodificarToken(token);
    if (!carga) return null;

    // Un token vencido no sirve: que el usuario vuelva a entrar.
    if (carga.exp && Date.now() >= carga.exp * 1000) return null;

    return {
        id: carga.sub,
        usuario: carga.usuario || '',
        nombre: carga.nombre || '',
        apellido: carga.apellido || '',
        roles: Array.isArray(carga.roles) ? carga.roles : [],
        permisos: Array.isArray(carga.permisos) ? carga.permisos : []
    };
};

export const cerrarSesion = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('empleado');
};

function useAuth() {
    const sesion = useMemo(() => leerSesion(), []);

    return useMemo(() => ({
        sesion,
        autenticado: Boolean(sesion),
        nombreCompleto: sesion ? [sesion.nombre, sesion.apellido].filter(Boolean).join(' ').trim() : '',
        tienePermiso: (permiso) => !permiso || Boolean(sesion?.permisos.includes(permiso)),
        tieneRol: (rol) => Boolean(sesion?.roles.includes(rol)),
        cerrarSesion
    }), [sesion]);
}

export default useAuth;
