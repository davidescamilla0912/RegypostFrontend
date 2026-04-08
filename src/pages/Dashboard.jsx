import { useNavigate } from 'react-router-dom';

function Dashboard() {
    const navigate = useNavigate();
    const empleado = JSON.parse(localStorage.getItem('empleado'));

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('empleado');
        navigate('/');
    };

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h1 style={styles.titulo}>Regy Hotel</h1>
                <div style={styles.usuario}>
                    <span>👤 {empleado?.nombre} {empleado?.apellido}</span>
                    <button style={styles.logout} onClick={handleLogout}>Cerrar sesión</button>
                </div>
            </div>

            <div style={styles.grid}>
                <div style={styles.card} onClick={() => navigate('/clientes')}>
                    <span style={styles.icono}>👥</span>
                    <h3>Clientes</h3>
                </div>
                <div style={styles.card} onClick={() => navigate('/reservas')}>
                    <span style={styles.icono}>📋</span>
                    <h3>Reservas</h3>
                </div>
                <div style={styles.card} onClick={() => navigate('/habitaciones')}>
                    <span style={styles.icono}>🛏️</span>
                    <h3>Habitaciones</h3>
                </div>
                <div style={styles.card} onClick={() => navigate('/inventario')}>
                    <span style={styles.icono}>📦</span>
                    <h3>Inventario</h3>
                </div>
                <div style={styles.card} onClick={() => navigate('/gastos')}>
                    <span style={styles.icono}>💰</span>
                    <h3>Gastos</h3>
                </div>
                <div style={styles.card} onClick={() => navigate('/caja')}>
                    <span style={styles.icono}>🏧</span>
                    <h3>Caja</h3>
                </div>
                <div style={styles.card} onClick={() => navigate('/empleados')}>
                    <span style={styles.icono}>👥</span>
                    <h3>Empleado</h3>
                </div>
                <div style={styles.card} onClick={() => navigate('/parqueadero')}>
                    <span style={styles.icono}>🚗</span>
                    <h3>Parqueadero</h3>
                </div>
            </div>
        </div>
    );
}

const styles = {
    container: {
        minHeight: '100vh',
        backgroundColor: '#f0f2f5',
        padding: '20px'
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#1a1a2e',
        color: 'white',
        padding: '15px 25px',
        borderRadius: '10px',
        marginBottom: '30px'
    },
    titulo: {
        margin: 0,
        fontSize: '22px'
    },
    usuario: {
        display: 'flex',
        alignItems: 'center',
        gap: '15px'
    },
    logout: {
        backgroundColor: '#e74c3c',
        color: 'white',
        border: 'none',
        padding: '8px 15px',
        borderRadius: '6px',
        cursor: 'pointer'
    },
    grid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '20px'
    },
    card: {
        backgroundColor: 'white',
        padding: '30px',
        borderRadius: '10px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        textAlign: 'center',
        cursor: 'pointer',
        transition: 'transform 0.2s',
    },
    icono: {
        fontSize: '40px'
    }
};

export default Dashboard;