import { useNavigate } from 'react-router-dom';
import { AppButton } from '../components/ui';
import '../components/ui/ui.css';

function NotFound() {
    const navigate = useNavigate();

    return (
        <div className="page-container">
            <div className="panel" style={{ textAlign: 'center', padding: '48px 24px' }}>
                <h2 style={{ margin: '0 0 8px', color: '#1a1a2e' }}>Pagina no encontrada</h2>
                <p className="muted-text">La direccion a la que intentaste entrar no existe.</p>
                <div className="form-actions" style={{ justifyContent: 'center' }}>
                    <AppButton onClick={() => navigate('/dashboard')}>Volver al dashboard</AppButton>
                </div>
            </div>
        </div>
    );
}

export default NotFound;
