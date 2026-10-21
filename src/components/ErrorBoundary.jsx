import { Component } from 'react';

/**
 * Evita que un error de render (por ejemplo, una respuesta de API con una
 * forma inesperada) deje al usuario frente a una pantalla en blanco sin
 * ninguna pista de que paso.
 */
class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { error: null };
    }

    static getDerivedStateFromError(error) {
        return { error };
    }

    componentDidCatch(error, info) {
        console.error('Error no controlado en la interfaz', error, info);
    }

    render() {
        if (!this.state.error) return this.props.children;

        return (
            <div style={styles.container}>
                <div style={styles.card}>
                    <h2 style={styles.title}>Algo salio mal</h2>
                    <p style={styles.text}>
                        La pantalla no se pudo mostrar. Vuelve al inicio e intentalo de nuevo.
                        Si el problema persiste, avisa al equipo tecnico.
                    </p>
                    <pre style={styles.detail}>{String(this.state.error?.message || this.state.error)}</pre>
                    <button style={styles.button} onClick={() => { window.location.href = '/dashboard'; }}>
                        Volver al dashboard
                    </button>
                </div>
            </div>
        );
    }
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
        maxWidth: '560px',
        width: '100%',
        backgroundColor: '#fff',
        borderRadius: '10px',
        padding: '24px',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.08)'
    },
    title: { margin: '0 0 10px 0', color: '#b91c1c' },
    text: { margin: '0 0 14px 0', color: '#4b5563' },
    detail: {
        backgroundColor: '#f9fafb',
        border: '1px solid #e5e7eb',
        borderRadius: '6px',
        padding: '10px',
        fontSize: '12px',
        color: '#6b7280',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        margin: '0 0 18px 0'
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

export default ErrorBoundary;
