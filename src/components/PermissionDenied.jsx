import { useNavigate } from 'react-router-dom';

function PermissionDenied({ message = 'No tienes permisos para acceder a esta seccion.' }) {
    const navigate = useNavigate();

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <h2 style={styles.title}>No tienes permisos</h2>
                <p style={styles.text}>{message}</p>
                <button style={styles.button} onClick={() => navigate('/dashboard')}>
                    Volver al dashboard
                </button>
            </div>
        </div>
    );
}

const styles = {
    container: {
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f0f2f5',
        padding: '20px'
    },
    card: {
        maxWidth: '520px',
        width: '100%',
        backgroundColor: '#fff',
        borderRadius: '10px',
        padding: '24px',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.08)',
        textAlign: 'center'
    },
    title: {
        margin: '0 0 10px 0',
        color: '#b91c1c'
    },
    text: {
        margin: '0 0 18px 0',
        color: '#4b5563'
    },
    button: {
        border: 'none',
        borderRadius: '6px',
        padding: '10px 16px',
        color: '#fff',
        backgroundColor: '#111827',
        cursor: 'pointer'
    }
};

export default PermissionDenied;
