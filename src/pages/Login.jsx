import { useState } from 'react';
import api from '../services/api';

function Login() {
    const [usuario, setUsuario] = useState('');
    const [contrasena, setContrasena] = useState('');
    const [error, setError] = useState('');

    const handleLogin = async () => {
        try {
            const res = await api.post('/auth/login', { usuario, contrasena });
            const { token, empleado } = res.data.data;
            localStorage.setItem('token', token);
            localStorage.setItem('empleado', JSON.stringify(empleado));
            window.location.href = '/dashboard';
        } catch (err) {
            setError('Usuario o contraseña incorrectos');
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <h2 style={styles.titulo}>RegyHotel</h2>
                <p style={styles.subtitulo}>Inicia sesión</p>

                {error && <p style={styles.error}>{error}</p>}

                <input
                    style={styles.input}
                    type="text"
                    placeholder="Usuario"
                    value={usuario}
                    onChange={e => setUsuario(e.target.value)}
                />
                <input
                    style={styles.input}
                    type="password"
                    placeholder="Contraseña"
                    value={contrasena}
                    onChange={e => setContrasena(e.target.value)}
                />
                <button style={styles.boton} onClick={handleLogin}>
                    Ingresar
                </button>
            </div>
        </div>
    );
}

const styles = {
    container: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#02144d'
    },
    card: {
        backgroundColor: 'white',
        padding: '40px',
        borderRadius: '10px',
        boxShadow: '0 4px 12px rgba(2, 170, 248, 0.1)',
        width: '350px',
        display: 'flex',
        flexDirection: 'column',
        gap: '15px'
    },
    titulo: {
        textAlign: 'center',
        color: '#1a1a2e',
        margin: 0
    },
    subtitulo: {
        textAlign: 'center',
        color: '#666',
        margin: 0
    },
    input: {
        padding: '12px',
        borderRadius: '6px',
        border: '1px solid #ddd',
        fontSize: '14px'
    },
    boton: {
        padding: '12px',
        backgroundColor: '#00bdf7',
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        fontSize: '16px',
        cursor: 'pointer'
    },
    error: {
        color: 'red',
        textAlign: 'center',
        margin: 0
    }
};

export default Login;