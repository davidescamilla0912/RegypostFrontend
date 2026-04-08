import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import parqueaderoService from '../services/parqueaderoService';
import reservaService from '../services/reservaService';

function Parqueadero() {
    const [registros, setRegistros] = useState([]);
    const [filtro, setFiltro] = useState('todos');
    const [loading, setLoading] = useState(true);
    const [busquedaPlaca, setBusquedaPlaca] = useState('');
    const [mostrarFormulario, setMostrarFormulario] = useState(false);
    const [reservas, setReservas] = useState([]);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        placa: '',
        hora_entrada: '',
        reserva_id: '',
        habitacion_id: '',
        valor: 0,
        notas: ''
    });
    const navigate = useNavigate();

    useEffect(() => {
        cargarRegistros();
        cargarReservas();
    }, [filtro]);

    const cargarReservas = async () => {
        try {
            const res = await reservaService.getAll();
            const payload = Array.isArray(res.data)
                ? res.data
                : Array.isArray(res.data?.data)
                    ? res.data.data
                    : [];
            setReservas(payload);
        } catch (err) {
            console.error('Error cargando reservas', err);
        }
    };

    const cargarRegistros = async () => {
        try {
            let res;
            if (filtro === 'activos') {
                res = await parqueaderoService.getActivos();
            } else {
                res = await parqueaderoService.getAll();
            }
            setRegistros(res.data);
        } catch (err) {
            console.error('Error cargando parqueadero', err);
        } finally {
            setLoading(false);
        }
    };

    const buscarPlaca = async () => {
        if (!busquedaPlaca) return cargarRegistros();
        try {
            const res = await parqueaderoService.getByPlaca(busquedaPlaca);
            setRegistros(res.data);
        } catch (err) {
            console.error('Error buscando placa', err);
        }
    };

    const registrarEntrada = async () => {
        setError('');

        const placa = formData.placa.trim().toUpperCase();
        if (!placa) {
            setError('La placa es obligatoria.');
            return;
        }

        const horaEntradaRaw = formData.hora_entrada?.trim();
        if (!horaEntradaRaw) {
            setError('La hora de entrada es obligatoria.');
            return;
        }

        const parseOptionalInt = (value) => {
            const clean = String(value ?? '').trim();
            if (!clean) return { value: null, valid: true };
            const parsed = Number(clean);
            if (!Number.isInteger(parsed) || parsed <= 0) return { value: null, valid: false };
            return { value: parsed, valid: true };
        };

        const reservaParsed = parseOptionalInt(formData.reserva_id);
        if (!reservaParsed.valid) {
            setError('Reserva ID debe ser un numero valido o dejarse vacio.');
            return;
        }

        const habitacionParsed = parseOptionalInt(formData.habitacion_id);
        if (!habitacionParsed.valid) {
            setError('Habitacion ID debe ser un numero valido o dejarse vacio.');
            return;
        }

        if (reservaParsed.value !== null) {
            const existeReserva = reservas.some((r) => Number(r.id) === reservaParsed.value);
            if (!existeReserva) {
                setError('La reserva seleccionada no existe. Usa una reserva valida o deja el campo vacio.');
                return;
            }
        }

        const payload = {
            placa,
            hora_entrada: horaEntradaRaw.replace('T', ' ') + (horaEntradaRaw.length === 16 ? ':00' : ''),
            reserva_id: reservaParsed.value,
            habitacion_id: habitacionParsed.value,
            valor: Number(formData.valor) || 0,
            notas: formData.notas?.trim() || ''
        };

        try {
            await parqueaderoService.create(payload);
            setMostrarFormulario(false);
            setFormData({ placa: '', hora_entrada: '', reserva_id: '', habitacion_id: '', valor: 0, notas: '' });
            cargarRegistros();
        } catch (err) {
            console.error('Error registrando entrada', err);
            const backendMessage = err?.response?.data?.message || err?.response?.data?.error || err?.response?.data?.detail;
            setError(backendMessage || 'No se pudo registrar la entrada de parqueadero.');
        }
    };

    const registrarSalida = async (id) => {
        const hora_salida = new Date().toISOString().slice(0, 19).replace('T', ' ');
        const valor = prompt('¿Cuánto cobra el parqueadero?', '0');
        if (valor === null) return;
        try {
            await parqueaderoService.registrarSalida(id, { hora_salida, valor: parseFloat(valor) });
            cargarRegistros();
        } catch (err) {
            console.error('Error registrando salida', err);
        }
    };

    const eliminar = async (id) => {
        if (window.confirm('¿Eliminar este registro?')) {
            await parqueaderoService.delete(id);
            cargarRegistros();
        }
    };

    if (loading) return <p style={styles.loading}>Cargando parqueadero...</p>;

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <button style={styles.btnVolver} onClick={() => navigate('/dashboard')}>← Volver</button>
                <h2 style={styles.titulo}>Parqueadero</h2>
                <button style={styles.btnCrear} onClick={() => setMostrarFormulario(!mostrarFormulario)}>
                    + Registrar Entrada
                </button>
            </div>

            {mostrarFormulario && (
                <div style={styles.formulario}>
                    <h3 style={styles.formTitulo}>Nueva Entrada</h3>
                    {error ? <p style={styles.error}>{error}</p> : null}
                    <div style={styles.formGrid}>
                        <input style={styles.input} placeholder="Placa *"
                            value={formData.placa}
                            onChange={e => setFormData({ ...formData, placa: e.target.value })} />
                        <input style={styles.input} type="datetime-local"
                            value={formData.hora_entrada}
                            onChange={e => setFormData({ ...formData, hora_entrada: e.target.value })} />
                        <select
                            style={styles.input}
                            value={formData.reserva_id}
                            onChange={e => setFormData({ ...formData, reserva_id: e.target.value })}
                        >
                            <option value="">Reserva ID (opcional)</option>
                            {reservas.map((r) => (
                                <option key={r.id} value={r.id}>
                                    #{r.id} - {r.fecha_entrada || r.check_in || '-'}
                                </option>
                            ))}
                        </select>
                        <input style={styles.input} placeholder="Habitación ID (opcional)"
                            value={formData.habitacion_id}
                            onChange={e => setFormData({ ...formData, habitacion_id: e.target.value })} />
                        <input style={styles.input} placeholder="Valor" type="number"
                            value={formData.valor}
                            onChange={e => setFormData({ ...formData, valor: e.target.value })} />
                        <input style={styles.input} placeholder="Notas"
                            value={formData.notas}
                            onChange={e => setFormData({ ...formData, notas: e.target.value })} />
                    </div>
                    <div style={styles.formAcciones}>
                        <button style={styles.btnGuardar} onClick={registrarEntrada}>Registrar</button>
                        <button style={styles.btnCancelar} onClick={() => setMostrarFormulario(false)}>Cancelar</button>
                    </div>
                </div>
            )}

            <div style={styles.filtros}>
                {['todos', 'activos'].map(f => (
                    <button key={f} style={{
                        ...styles.btnFiltro,
                        backgroundColor: filtro === f ? '#1a1a2e' : '#ddd',
                        color: filtro === f ? 'white' : '#333'
                    }} onClick={() => setFiltro(f)}>
                        {f === 'todos' ? 'Todos' : 'Activos'}
                    </button>
                ))}
                <input style={styles.inputBuscar} placeholder="Buscar por placa..."
                    value={busquedaPlaca}
                    onChange={e => setBusquedaPlaca(e.target.value)}
                    onKeyPress={e => e.key === 'Enter' && buscarPlaca()} />
                <button style={styles.btnBuscar} onClick={buscarPlaca}>Buscar</button>
            </div>

            <div style={styles.tableContainer}>
                <table style={styles.tabla}>
                    <thead>
                        <tr style={styles.thead}>
                            <th style={styles.th}>ID</th>
                            <th style={styles.th}>Placa</th>
                            <th style={styles.th}>Entrada</th>
                            <th style={styles.th}>Salida</th>
                            <th style={styles.th}>Habitación</th>
                            <th style={styles.th}>Valor</th>
                            <th style={styles.th}>Estado</th>
                            <th style={styles.th}>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {registros.map(r => (
                            <tr key={r.id} style={styles.tr}>
                                <td style={styles.td}>#{r.id}</td>
                                <td style={styles.td}><strong>{r.placa}</strong></td>
                                <td style={styles.td}>{r.hora_entrada}</td>
                                <td style={styles.td}>{r.hora_salida || '-'}</td>
                                <td style={styles.td}>{r.habitacion_numero || '-'}</td>
                                <td style={styles.td}>${r.valor?.toLocaleString()}</td>
                                <td style={styles.td}>
                                    <span style={{
                                        ...styles.badge,
                                        backgroundColor: r.hora_salida ? '#95a5a6' : '#2ecc71'
                                    }}>
                                        {r.hora_salida ? 'Salió' : 'Activo'}
                                    </span>
                                </td>
                                <td style={styles.td}>
                                    <div style={styles.acciones}>
                                        {!r.hora_salida && (
                                            <button style={styles.btnSalida}
                                                onClick={() => registrarSalida(r.id)}>
                                                Salida
                                            </button>
                                        )}
                                        <button style={styles.btnEliminar}
                                            onClick={() => eliminar(r.id)}>
                                            Eliminar
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

const styles = {
    container: { padding: '20px', backgroundColor: '#f0f2f5', minHeight: '100vh' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
    titulo: { margin: 0, color: '#1a1a2e' },
    loading: { textAlign: 'center', marginTop: '50px' },
    formulario: { backgroundColor: 'white', borderRadius: '10px', padding: '20px', marginBottom: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' },
    formTitulo: { margin: '0 0 15px 0', color: '#1a1a2e' },
    formGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '15px' },
    error: { margin: '0 0 12px 0', color: '#c0392b', fontSize: '13px' },
    input: { padding: '10px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px' },
    formAcciones: { display: 'flex', gap: '10px' },
    btnGuardar: { padding: '10px 20px', backgroundColor: '#2ecc71', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' },
    btnCancelar: { padding: '10px 20px', backgroundColor: '#e74c3c', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' },
    filtros: { display: 'flex', gap: '10px', marginBottom: '20px', alignItems: 'center' },
    btnFiltro: { padding: '8px 15px', border: 'none', borderRadius: '20px', cursor: 'pointer', fontSize: '13px' },
    inputBuscar: { padding: '8px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px', flex: 1 },
    btnBuscar: { padding: '8px 15px', backgroundColor: '#1a1a2e', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' },
    btnVolver: { padding: '8px 15px', backgroundColor: '#95a5a6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' },
    btnCrear: { padding: '8px 15px', backgroundColor: '#1a1a2e', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' },
    tableContainer: { backgroundColor: 'white', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', overflow: 'auto' },
    tabla: { width: '100%', borderCollapse: 'collapse' },
    thead: { backgroundColor: '#1a1a2e' },
    th: { padding: '12px 15px', color: 'white', textAlign: 'left', fontSize: '14px' },
    tr: { borderBottom: '1px solid #eee' },
    td: { padding: '12px 15px', fontSize: '14px', color: '#333' },
    badge: { padding: '4px 10px', borderRadius: '20px', color: 'white', fontSize: '12px' },
    acciones: { display: 'flex', gap: '5px' },
    btnSalida: { padding: '5px 10px', backgroundColor: '#f39c12', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' },
    btnEliminar: { padding: '5px 10px', backgroundColor: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }
};

export default Parqueadero;