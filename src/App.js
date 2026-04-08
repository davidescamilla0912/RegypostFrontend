import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Clientes from './pages/Clientes';
import Dashboard from './pages/Dashboard';
import Reservas from './pages/Reservas';
import Habitaciones from './pages/Habitaciones';
import Empleados from './pages/Empleados';
import Parqueadero from './pages/Parqueadero';
import Inventario from './pages/Inventario';
import Gastos from './pages/Gastos';
import Caja from './pages/Caja';
import NuevoCliente from './pages/NuevoCliente';
import EditarCliente from './pages/EditarCliente';



//rutas
function App() {
    const token = localStorage.getItem('token');

    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Login />} />
                <Route
                    path="/dashboard"
                    element={token ? <Dashboard /> : <Navigate to="/" />}
                />
                <Route
                    path="/reservas"
                    element={token ? <Reservas /> : <Navigate to="/" />}
                />
                <Route
                    path="/clientes"
                    element={token ? <Clientes /> : <Navigate to="/" />}
                />
                <Route
                    path="/habitaciones"
                    element={token ? <Habitaciones /> : <Navigate to="/" />}
                />
                <Route
                    path="/empleados"
                    element={token ? <Empleados /> : <Navigate to="/" />}
                />
                <Route
                    path="/parqueadero"
                    element={token ? <Parqueadero /> : <Navigate to="/" />}
                />
                <Route
                    path="/inventario"
                    element={token ? <Inventario /> : <Navigate to="/" />}
                />
                <Route
                    path="/gastos"
                    element={token ? <Gastos /> : <Navigate to="/" />}
                />
                <Route
                    path="/caja"
                    element={token ? <Caja /> : <Navigate to="/" />}
                />
                <Route
                    path="/clientes/nuevo"
                    element={token ? <NuevoCliente /> : <Navigate to="/" />}
                />
                <Route
                    path="/clientes/editar/:id"
                    element={token ? <EditarCliente /> : <Navigate to="/" />}
                />
                

            </Routes>
        </BrowserRouter>
    );
}

export default App;