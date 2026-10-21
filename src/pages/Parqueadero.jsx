import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import parqueaderoService from '../services/parqueaderoService';
import reservaService from '../services/reservaService';
import { AppButton, DataTable, PageHeader } from '../components/ui';
import { extraerLista } from '../utils/apiResponse';
import '../components/ui/ui.css';

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
            setReservas(extraerLista(res));
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
            setRegistros(extraerLista(res));
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
            setRegistros(extraerLista(res));
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

    const columns = [
        { key: 'id', label: 'ID' },
        { key: 'placa', label: 'Placa' },
        { key: 'entrada', label: 'Entrada' },
        { key: 'salida', label: 'Salida' },
        { key: 'habitacion', label: 'Habitacion' },
        { key: 'valor', label: 'Valor' },
        { key: 'estado', label: 'Estado' },
        { key: 'acciones', label: 'Acciones' }
    ];

    if (loading) return <p className="page-loading">Cargando parqueadero...</p>;

    return (
        <div className="page-container">
            <PageHeader
                title="Parqueadero"
                onBack={() => navigate('/dashboard')}
                backLabel="← Volver"
                actions={(
                    <AppButton onClick={() => setMostrarFormulario(!mostrarFormulario)}>
                        + Registrar Entrada
                    </AppButton>
                )}
            />

            {mostrarFormulario && (
                <div className="panel">
                    <h3 className="panel-title">Nueva Entrada</h3>
                    {error ? <p className="error-text">{error}</p> : null}
                    <div className="form-grid form-grid--3">
                        <input className="input-base" placeholder="Placa *"
                            value={formData.placa}
                            onChange={e => setFormData({ ...formData, placa: e.target.value })} />
                        <input className="input-base" type="datetime-local"
                            value={formData.hora_entrada}
                            onChange={e => setFormData({ ...formData, hora_entrada: e.target.value })} />
                        <select
                            className="select-base"
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
                        <input className="input-base" placeholder="Habitacion ID (opcional)"
                            value={formData.habitacion_id}
                            onChange={e => setFormData({ ...formData, habitacion_id: e.target.value })} />
                        <input className="input-base" placeholder="Valor" type="number"
                            value={formData.valor}
                            onChange={e => setFormData({ ...formData, valor: e.target.value })} />
                        <input className="input-base" placeholder="Notas"
                            value={formData.notas}
                            onChange={e => setFormData({ ...formData, notas: e.target.value })} />
                    </div>
                    <div className="form-actions">
                        <AppButton variant="info" onClick={registrarEntrada}>Registrar</AppButton>
                        <AppButton variant="danger" onClick={() => setMostrarFormulario(false)}>Cancelar</AppButton>
                    </div>
                </div>
            )}

            <div className="toolbar">
                {['todos', 'activos'].map(f => (
                    <AppButton
                        key={f}
                        size="sm"
                        variant={filtro === f ? 'primary' : 'secondary'}
                        onClick={() => setFiltro(f)}
                    >
                        {f === 'todos' ? 'Todos' : 'Activos'}
                    </AppButton>
                ))}
                <input className="input-base" style={{ flex: 1 }} placeholder="Buscar por placa..."
                    value={busquedaPlaca}
                    onChange={e => setBusquedaPlaca(e.target.value)}
                    onKeyPress={e => e.key === 'Enter' && buscarPlaca()} />
                <AppButton onClick={buscarPlaca}>Buscar</AppButton>
            </div>

            <DataTable
                columns={columns}
                data={registros}
                rowKey="id"
                renderCell={(r, column) => {
                    if (column.key === 'id') return `#${r.id}`;
                    if (column.key === 'placa') return <strong>{r.placa}</strong>;
                    if (column.key === 'entrada') return r.hora_entrada;
                    if (column.key === 'salida') return r.hora_salida || '-';
                    if (column.key === 'habitacion') return r.habitacion_numero || '-';
                    if (column.key === 'valor') return `$${r.valor?.toLocaleString()}`;
                    if (column.key === 'estado') {
                        return (
                            <span className="badge" style={{ backgroundColor: r.hora_salida ? '#95a5a6' : '#2ecc71' }}>
                                {r.hora_salida ? 'Salio' : 'Activo'}
                            </span>
                        );
                    }
                    if (column.key === 'acciones') {
                        return (
                            <div className="row-actions">
                                {!r.hora_salida && (
                                    <AppButton size="sm" onClick={() => registrarSalida(r.id)}>Salida</AppButton>
                                )}
                                <AppButton variant="danger" size="sm" onClick={() => eliminar(r.id)}>Eliminar</AppButton>
                            </div>
                        );
                    }
                    return '-';
                }}
                emptyMessage="No hay registros de parqueadero."
            />
        </div>
    );
}

export default Parqueadero;