import { useNavigate } from 'react-router-dom';
import '../components/ui/Dashboard.css';

function Dashboard() {
    const navigate = useNavigate();
    const empleado = JSON.parse(localStorage.getItem('empleado'));

    const modulos = [
        { nombre: 'Clientes', descripcion: 'Gestiona el registro y perfil de clientes.', ruta: '/clientes', color: '#1f6feb' },
        { nombre: 'Reservas', descripcion: 'Controla entradas, salidas y estado de reservas.', ruta: '/reservas', color: '#0f766e' },
        { nombre: 'Habitaciones', descripcion: 'Administra disponibilidad y detalle de habitaciones.', ruta: '/habitaciones', color: '#7c3aed' },
        { nombre: 'Inventario', descripcion: 'Supervisa stock de productos e insumos.', ruta: '/inventario', color: '#b45309' },
        { nombre: 'Gastos', descripcion: 'Registra egresos y consulta movimientos.', ruta: '/gastos', color: '#be123c' },
        { nombre: 'Caja', descripcion: 'Visualiza pagos, cierres y flujo de efectivo.', ruta: '/caja', color: '#155e75' },
        { nombre: 'Empleados', descripcion: 'Gestiona usuarios internos y sus datos.', ruta: '/empleados', color: '#1d4ed8' },
        { nombre: 'Parqueadero', descripcion: 'Controla cupos y movimientos de vehiculos.', ruta: '/parqueadero', color: '#4d7c0f' }
    ];

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('empleado');
        navigate('/');
    };

    return (
        <div className="dashboard">
            <div className="dashboard__header">
                <div>
                    <p className="dashboard__eyebrow">Panel de control</p>
                    <h1 className="dashboard__title">Regy Hotel</h1>
                </div>
                <div className="dashboard__user">
                    <span className="dashboard__user-name">{empleado?.nombre} {empleado?.apellido}</span>
                    <button className="dashboard__logout" onClick={handleLogout} type="button">
                        Cerrar sesion
                    </button>
                </div>
            </div>

            <div className="dashboard__grid">
                {modulos.map((modulo) => (
                    <button
                        key={modulo.ruta}
                        className="dashboard__card"
                        onClick={() => navigate(modulo.ruta)}
                        style={{ '--accent': modulo.color }}
                        type="button"
                    >
                        <h3 className="dashboard__card-title">{modulo.nombre}</h3>
                        <p className="dashboard__card-desc">{modulo.descripcion}</p>
                    </button>
                ))}
            </div>
        </div>
    );
}

export default Dashboard;