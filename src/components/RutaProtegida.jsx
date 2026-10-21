import { Navigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import PermissionDenied from './PermissionDenied';

/**
 * Guarda de ruta. Sin sesion manda al login; con sesion pero sin el permiso
 * muestra la pantalla de acceso denegado en vez de dejar cargar un modulo que
 * va a fallar en cada peticion.
 *
 * Esto es UX, no seguridad: el backend valida el permiso igualmente.
 */
function RutaProtegida({ permiso, children }) {
    const { autenticado, tienePermiso } = useAuth();

    if (!autenticado) return <Navigate to="/" replace />;
    if (!tienePermiso(permiso)) {
        return <PermissionDenied message={`Necesitas el permiso "${permiso}" para entrar a esta seccion.`} />;
    }
    return children;
}

export default RutaProtegida;
