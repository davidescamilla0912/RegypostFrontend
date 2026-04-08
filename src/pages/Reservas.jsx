import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import reservaService from '../services/reservaService';
import habitacionService from '../services/habitacionService';
import clienteService from '../services/clienteService';

const ESTADOS_CICLO = ['pendiente', 'confirmada', 'check-in', 'check-out'];
const ESTADOS_QUE_BLOQUEAN = new Set(['pendiente', 'confirmada', 'check-in']);

const normalizarEstado = (estado) => String(estado || '').trim().toLowerCase();

const fromApiEstado = (estadoApi) => {
	const estado = normalizarEstado(estadoApi);
	if (estado === 'checkin') return 'check-in';
	if (estado === 'checkout') return 'check-out';
	if (estado === 'booking') return 'pendiente';
	return estado;
};

const toApiEstado = (estadoUI) => {
	const estado = normalizarEstado(estadoUI);
	if (estado === 'check-in') return 'checkin';
	if (estado === 'check-out') return 'checkout';
	return estado;
};

const initialForm = {
	clienteId: '',
	habitacionId: '',
	checkIn: '',
	checkOut: '',
	noches: 0,
	valorNoche: '',
	valorTotal: 0,
	anticipo: '',
	saldoPendiente: 0,
	estado: 'pendiente',
	observaciones: ''
};

const calcularNoches = (checkIn, checkOut) => {
	if (!checkIn || !checkOut) return 0;

	const fechaEntrada = new Date(checkIn);
	const fechaSalida = new Date(checkOut);
	const diffMs = fechaSalida - fechaEntrada;

	if (Number.isNaN(diffMs) || diffMs <= 0) return 0;
	return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
};

const toDateSafe = (value) => {
	if (!value || value === '-') return null;
	const date = new Date(`${value}T00:00:00`);
	if (Number.isNaN(date.getTime())) return null;
	return date;
};

const fechasSeCruzan = (inicioA, finA, inicioB, finB) => (
	inicioA < finB && inicioB < finA
);

const getHabitacionIdFromReserva = (reserva) => {
	const detalle = reserva?.reserva_habitaciones?.[0] || reserva?.habitaciones?.[0] || null;
	return Number(
		detalle?.habitacion_id
		|| detalle?.habitacion?.id
		|| reserva?.habitacion_id
		|| reserva?.habitacion
	) || null;
};

const getFechaEntradaReserva = (reserva) => (
	reserva?.fecha_entrada
	|| reserva?.check_in
	|| reserva?.checkIn
	|| null
);

const getFechaSalidaReserva = (reserva) => (
	reserva?.fecha_salida
	|| reserva?.check_out
	|| reserva?.checkOut
	|| null
);

const toCurrency = (value) => {
	const numericValue = Number(value) || 0;
	return new Intl.NumberFormat('es-CO').format(numericValue);
};

function Reservas() {
	const navigate = useNavigate();
	const [reservas, setReservas] = useState([]);
	const [habitaciones, setHabitaciones] = useState([]);
	const [clientes, setClientes] = useState([]);
	const [loading, setLoading] = useState(true);
	const [guardando, setGuardando] = useState(false);
	const [form, setForm] = useState(initialForm);
	const [error, setError] = useState('');

	useEffect(() => {
		cargarDatos();
	}, []);

	const cargarDatos = async () => {
		await Promise.all([cargarReservas(), cargarHabitaciones(), cargarClientes()]);
	};

	const cargarReservas = async () => {
		try {
			setLoading(true);
			const res = await reservaService.getAll();
			const payload = Array.isArray(res.data)
				? res.data
				: Array.isArray(res.data?.data)
					? res.data.data
					: [];

			const reservasConDetalle = await Promise.all(
				payload.map(async (reserva) => {
					if (!reserva?.id) return reserva;

					try {
						const detalleRes = await reservaService.getHabitaciones(reserva.id);
						const detalle = Array.isArray(detalleRes.data)
							? detalleRes.data
							: Array.isArray(detalleRes.data?.data)
								? detalleRes.data.data
								: [];

						return {
							...reserva,
							estado: fromApiEstado(reserva.estado),
							reserva_habitaciones: detalle
						};
					} catch (detailErr) {
						console.warn(`No se pudo cargar detalle de habitaciones para la reserva ${reserva.id}`, detailErr);
						return {
							...reserva,
							estado: fromApiEstado(reserva.estado)
						};
					}
				})
			);

			setReservas(reservasConDetalle);
		} catch (err) {
			console.error('Error cargando reservas', err);
			setError('No se pudieron cargar las reservas.');
		} finally {
			setLoading(false);
		}
	};

	const cargarHabitaciones = async () => {
		try {
			const res = await habitacionService.getAll();
			const payload = Array.isArray(res.data)
				? res.data
				: Array.isArray(res.data?.data)
					? res.data.data
					: [];
			setHabitaciones(payload);
		} catch (err) {
			console.error('Error cargando habitaciones', err);
		}
	};

	const cargarClientes = async () => {
		try {
			const res = await clienteService.getAll();
			const payload = Array.isArray(res.data)
				? res.data
				: Array.isArray(res.data?.data)
					? res.data.data
					: [];
			setClientes(payload);
		} catch (err) {
			console.error('Error cargando clientes', err);
		}
	};

	const valoresCalculados = useMemo(() => {
		const noches = calcularNoches(form.checkIn, form.checkOut);
		const valorNoche = Number(form.valorNoche) || 0;
		const anticipo = Number(form.anticipo) || 0;
		const valorTotal = noches * valorNoche;
		const saldoPendiente = Math.max(valorTotal - anticipo, 0);

		return { noches, valorTotal, saldoPendiente };
	}, [form.checkIn, form.checkOut, form.valorNoche, form.anticipo]);

	const habitacionesNoDisponibles = useMemo(() => {
		const idsNoDisponibles = new Set();

		const fechaEntradaNueva = toDateSafe(form.checkIn);
		const fechaSalidaNueva = toDateSafe(form.checkOut);
		const tieneRangoFechas = Boolean(
			fechaEntradaNueva
			&& fechaSalidaNueva
			&& fechaEntradaNueva < fechaSalidaNueva
		);

		if (!tieneRangoFechas) return idsNoDisponibles;

		reservas.forEach((reserva) => {
			const estado = fromApiEstado(reserva?.estado);
			if (!ESTADOS_QUE_BLOQUEAN.has(estado)) return;

			const habitacionId = getHabitacionIdFromReserva(reserva);
			if (!habitacionId) return;

			const fechaEntradaReserva = toDateSafe(getFechaEntradaReserva(reserva));
			const fechaSalidaReserva = toDateSafe(getFechaSalidaReserva(reserva));
			if (!fechaEntradaReserva || !fechaSalidaReserva || fechaEntradaReserva >= fechaSalidaReserva) return;

			if (fechasSeCruzan(fechaEntradaNueva, fechaSalidaNueva, fechaEntradaReserva, fechaSalidaReserva)) {
				idsNoDisponibles.add(habitacionId);
			}
		});

		return idsNoDisponibles;
	}, [habitaciones, reservas, form.checkIn, form.checkOut]);

	const habitacionesDisponibles = useMemo(() => (
		habitaciones.filter((h) => (
			normalizarEstado(h.estado) === 'disponible'
			&& !habitacionesNoDisponibles.has(Number(h.id))
		))
	), [habitaciones, habitacionesNoDisponibles]);

	useEffect(() => {
		if (!form.habitacionId) return;
		const habitacionSigueDisponible = habitacionesDisponibles.some(
			(h) => String(h.id) === String(form.habitacionId)
		);
		if (!habitacionSigueDisponible) {
			setForm((prev) => ({ ...prev, habitacionId: '', valorNoche: '' }));
		}
	}, [habitacionesDisponibles, form.habitacionId]);

	const onChange = (e) => {
		const { name, value } = e.target;
		if (name === 'habitacionId') {
			const habitacionSeleccionada = habitaciones.find((h) => String(h.id) === String(value));
			setForm((prev) => ({
				...prev,
				habitacionId: value,
				valorNoche: habitacionSeleccionada?.precio_base || prev.valorNoche
			}));
			return;
		}

		setForm((prev) => ({
			...prev,
			[name]: value
		}));
	};

	const validarFormulario = () => {
		if (!form.clienteId || !form.habitacionId || !form.checkIn || !form.checkOut) {
			setError('Cliente, Habitacion, Check-in y Check-out son obligatorios.');
			return false;
		}

		if (valoresCalculados.noches <= 0) {
			setError('La fecha de Check-out debe ser posterior al Check-in.');
			return false;
		}

		if (habitacionesNoDisponibles.has(Number(form.habitacionId))) {
			setError('La habitación seleccionada no está disponible para ese rango de fechas.');
			return false;
		}

		const habitacionSeleccionada = habitaciones.find((h) => String(h.id) === String(form.habitacionId));
		if (normalizarEstado(habitacionSeleccionada?.estado) !== 'disponible') {
			setError('Solo puedes reservar habitaciones en estado disponible.');
			return false;
		}

		return true;
	};

	const crearReserva = async (e) => {
		e.preventDefault();
		setError('');

		if (!validarFormulario()) return;

		const clienteId = Number(form.clienteId);
		const habitacionId = Number(form.habitacionId);
		const valorNoche = Number(form.valorNoche) || 0;
		const anticipo = Number(form.anticipo) || 0;
		const hoy = new Date().toISOString().slice(0, 10);

		const payload = {
			cliente_id: clienteId,
			habitacion_id: habitacionId,
			habitacion: habitacionId,
			fecha_reserva: hoy,
			fecha_entrada: form.checkIn,
			fecha_salida: form.checkOut,
			check_in: form.checkIn,
			check_out: form.checkOut,
			num_adultos: 1,
			num_ninos: 0,
			fuente: 'directa',
			noches: valoresCalculados.noches,
			precio_noche: valorNoche,
			valor_noche: valorNoche,
			total: valoresCalculados.valorTotal,
			valor_total: valoresCalculados.valorTotal,
			anticipo,
			saldo_pendiente: valoresCalculados.saldoPendiente,
			estado: toApiEstado(form.estado),
			observaciones: form.observaciones
		};

		try {
			setGuardando(true);
			const res = await reservaService.create(payload);
			const creada = res.data?.data || res.data;

			if (creada?.id && habitacionId) {
				try {
					await reservaService.agregarHabitacion(creada.id, {
						habitacion_id: habitacionId,
						precio_noche: valorNoche
					});
				} catch (linkErr) {
					console.warn('No se pudo registrar la habitación de la reserva en detalle', linkErr);
				}
			}

			await cargarReservas();
			setForm(initialForm);
		} catch (err) {
			console.error('Error creando reserva', err);
			const backendMessage = err?.response?.data?.message || err?.response?.data?.error || err?.response?.data?.detail;
			setError(backendMessage || 'No se pudo guardar la reserva. Verifica los datos e intenta de nuevo.');
		} finally {
			setGuardando(false);
		}
	};

	const etiquetaEstado = (estado) => {
		const key = fromApiEstado(estado);
		if (key === 'check-in') return 'CHECK-IN';
		if (key === 'check-out') return 'CHECK-OUT';
		if (key === 'confirmada') return 'CONFIRMADA';
		if (key === 'pendiente') return 'PENDIENTE';
		return String(estado || '-').toUpperCase();
	};

	const colorEstado = (estado) => {
		const key = fromApiEstado(estado);
		if (key === 'pendiente') return '#f39c12';
		if (key === 'confirmada') return '#2980b9';
		if (key === 'check-in') return '#27ae60';
		if (key === 'check-out') return '#c0392b';
		return '#7f8c8d';
	};

	const siguienteEstado = (estadoActual) => {
		const actual = fromApiEstado(estadoActual);
		const index = ESTADOS_CICLO.indexOf(actual);
		if (index === -1) return ESTADOS_CICLO[0];
		if (index >= ESTADOS_CICLO.length - 1) return ESTADOS_CICLO[ESTADOS_CICLO.length - 1];
		return ESTADOS_CICLO[index + 1];
	};

	const cambiarEstadoReserva = async (reserva) => {
		if (!reserva?.id) return;

		const estadoActual = fromApiEstado(getValue(reserva, 'estado'));
		const nuevoEstado = siguienteEstado(estadoActual);
		if (nuevoEstado === estadoActual) return;

		try {
			await reservaService.updateEstado(reserva.id, toApiEstado(nuevoEstado));
			setReservas((prev) => prev.map((r) => (
				r.id === reserva.id
					? { ...r, estado: nuevoEstado }
					: r
			)));
		} catch (err) {
			console.error('Error cambiando estado de reserva', err);
			setError('No se pudo cambiar el estado de la reserva.');
		}
	};

	const eliminarReserva = async (id) => {
		if (!id) return;
		if (!window.confirm('¿Eliminar esta reserva?')) return;

		try {
			const detalleRes = await reservaService.getHabitaciones(id);
			const detalle = Array.isArray(detalleRes.data)
				? detalleRes.data
				: Array.isArray(detalleRes.data?.data)
					? detalleRes.data.data
					: [];

			for (const item of detalle) {
				const habitacionId = item?.habitacion_id || item?.habitacion?.id;
				if (!habitacionId) continue;
				await reservaService.quitarHabitacion(id, habitacionId);
			}

			await reservaService.delete(id);
			setReservas((prev) => prev.filter((r) => r.id !== id));
		} catch (err) {
			console.error('Error eliminando reserva', err);
			const backendMessage = err?.response?.data?.message || err?.response?.data?.error || err?.response?.data?.detail;
			setError(backendMessage || 'No se pudo eliminar la reserva.');
		}
	};

	const getValue = (reserva, ...keys) => {
		const firstKey = keys.find((key) => reserva[key] !== undefined && reserva[key] !== null && reserva[key] !== '');
		if (!firstKey) return '-';
		return reserva[firstKey];
	};

	const getClienteNombre = (reserva) => {
		const clienteId = getValue(reserva, 'cliente_id');
		const cliente = clientes.find((c) => String(c.id) === String(clienteId));
		if (!cliente) return clienteId !== '-' ? `ID ${clienteId}` : '-';
		return `${cliente.nombre || ''} ${cliente.apellido || ''}`.trim() || `ID ${cliente.id}`;
	};

	const getHabitacionNumero = (reserva) => {
		const detalle = reserva.reserva_habitaciones?.[0] || reserva.habitaciones?.[0] || null;
		const habitacionId = getValue(reserva, 'habitacion_id', 'habitacion');
		const numeroDesdeRelacion = detalle?.habitacion?.numero || detalle?.habitacion_numero || detalle?.numero;
		const numeroDesdeReserva = getValue(reserva, 'habitacion_numero', 'numero_habitacion');
		const numeroDesdeCatalogo = habitaciones.find((h) => String(h.id) === String(habitacionId))?.numero;

		return numeroDesdeRelacion || (numeroDesdeReserva !== '-' ? numeroDesdeReserva : null) || numeroDesdeCatalogo || habitacionId || '-';
	};

	const getPrecioNoche = (reserva) => {
		const detalle = reserva.reserva_habitaciones?.[0] || reserva.habitaciones?.[0] || null;
		return Number(
			detalle?.precio_noche
			|| getValue(reserva, 'precio_noche', 'valor_noche', 'valorNoche')
		) || 0;
	};

	const getNoches = (reserva) => {
		const nochesDb = Number(getValue(reserva, 'noches')) || 0;
		if (nochesDb > 0) return nochesDb;

		const entrada = getValue(reserva, 'fecha_entrada', 'check_in', 'checkIn');
		const salida = getValue(reserva, 'fecha_salida', 'check_out', 'checkOut');
		if (entrada === '-' || salida === '-') return 0;

		return calcularNoches(entrada, salida);
	};

	return (
		<div style={styles.container}>
			<div style={styles.header}>
				<button style={styles.btnVolver} onClick={() => navigate('/dashboard')}>← Volver</button>
				<h2 style={styles.titulo}>Reservas</h2>
			</div>

			<form style={styles.form} onSubmit={crearReserva}>
				<div style={styles.grid}>
					<select style={styles.input} name="clienteId" value={form.clienteId} onChange={onChange}>
						<option value="">Cliente</option>
						{clientes.map((c) => (
							<option key={c.id} value={c.id}>{`${c.nombre || ''} ${c.apellido || ''}`.trim()} - {c.numero_documento || c.id}</option>
						))}
					</select>
					<select style={styles.input} name="habitacionId" value={form.habitacionId} onChange={onChange}>
						<option value="">Habitacion (Numero)</option>
						{habitacionesDisponibles.map((h) => (
							<option key={h.id} value={h.id}>Hab. {h.numero}</option>
						))}
					</select>
					<input style={styles.input} name="checkIn" value={form.checkIn} onChange={onChange} type="date" />
					<input style={styles.input} name="checkOut" value={form.checkOut} onChange={onChange} type="date" />
					<input style={styles.input} value={valoresCalculados.noches} disabled placeholder="Noches" />
					<input style={styles.input} name="valorNoche" value={form.valorNoche} onChange={onChange} type="number" min="0" placeholder="Valor Noche" />
					<input style={styles.input} value={valoresCalculados.valorTotal} disabled placeholder="Valor Total" />
					<input style={styles.input} name="anticipo" value={form.anticipo} onChange={onChange} type="number" min="0" placeholder="Anticipo" />
					<input style={styles.input} value={valoresCalculados.saldoPendiente} disabled placeholder="Saldo Pendiente" />
					<input style={styles.input} value={etiquetaEstado(form.estado)} disabled placeholder="Estado" />
					<input style={styles.input} name="observaciones" value={form.observaciones} onChange={onChange} placeholder="Observaciones" />
				</div>

				<div style={styles.footerForm}>
					{error ? <p style={styles.error}>{error}</p> : <span />}
					<button style={styles.btnCrear} type="submit" disabled={guardando}>
						{guardando ? 'Guardando...' : '+ Agregar Reserva'}
					</button>
				</div>
			</form>

			{loading ? (
				<p style={styles.loading}>Cargando reservas...</p>
			) : (
				<div style={styles.tableContainer}>
					<table style={styles.tabla}>
						<thead>
							<tr style={styles.thead}>
								<th style={styles.th}>Cliente</th>
								<th style={styles.th}>Habitacion</th>
								<th style={styles.th}>Check-in</th>
								<th style={styles.th}>Check-out</th>
								<th style={styles.th}>Noches</th>
								<th style={styles.th}>Valor Noche</th>
								<th style={styles.th}>Valor Total</th>
								<th style={styles.th}>Anticipo</th>
								<th style={styles.th}>Saldo Pendiente</th>
								<th style={styles.th}>Estado</th>
								<th style={styles.th}>Observaciones</th>
								<th style={styles.th}>Acciones</th>
							</tr>
						</thead>
						<tbody>
							{reservas.length === 0 ? (
								<tr>
									<td colSpan={12} style={styles.emptyCell}>No hay reservas registradas.</td>
								</tr>
							) : (
								reservas.map((r, index) => {
									const noches = getNoches(r);
									const valorNoche = getPrecioNoche(r);
									const valorTotal = Number(getValue(r, 'total', 'valor_total', 'valorTotal')) || (noches * valorNoche);
									const anticipo = Number(getValue(r, 'anticipo')) || 0;
									const saldo = Number(getValue(r, 'saldo_pendiente', 'saldoPendiente')) || Math.max(valorTotal - anticipo, 0);
									const fechaEntrada = getValue(r, 'fecha_entrada', 'check_in', 'checkIn');
									const fechaSalida = getValue(r, 'fecha_salida', 'check_out', 'checkOut');

									return (
										<tr key={r.id || `${r.habitacion_id || r.habitacion || 'reserva'}-${index}`} style={styles.tr}>
											<td style={styles.td}>{getClienteNombre(r)}</td>
											<td style={styles.td}>{getHabitacionNumero(r)}</td>
											<td style={styles.td}>{fechaEntrada}</td>
											<td style={styles.td}>{fechaSalida}</td>
											<td style={styles.td}>{noches || '-'}</td>
											<td style={styles.td}>$ {toCurrency(valorNoche)}</td>
											<td style={styles.td}>$ {toCurrency(valorTotal)}</td>
											<td style={styles.td}>$ {toCurrency(anticipo)}</td>
											<td style={styles.td}>$ {toCurrency(saldo)}</td>
											<td style={styles.td}>
												<button
													style={{ ...styles.btnEstado, backgroundColor: colorEstado(getValue(r, 'estado')) }}
													onClick={() => cambiarEstadoReserva(r)}
													disabled={!r.id}
												>
													{etiquetaEstado(getValue(r, 'estado'))}
												</button>
											</td>
											<td style={styles.td}>{getValue(r, 'observaciones')}</td>
											<td style={styles.td}>
												<button
													style={styles.btnEliminar}
													onClick={() => eliminarReserva(r.id)}
													disabled={!r.id}
												>
													Eliminar
												</button>
											</td>
										</tr>
									);
								})
							)}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
}

const styles = {
	container: { padding: '20px', backgroundColor: '#f0f2f5', minHeight: '100vh' },
	header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
	titulo: { margin: 0, color: '#1a1a2e' },
	form: {
		backgroundColor: 'white',
		borderRadius: '10px',
		boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
		padding: '15px',
		marginBottom: '20px'
	},
	grid: {
		display: 'grid',
		gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
		gap: '10px'
	},
	input: {
		padding: '10px',
		borderRadius: '6px',
		border: '1px solid #ddd',
		fontSize: '14px'
	},
	footerForm: {
		marginTop: '12px',
		display: 'flex',
		justifyContent: 'space-between',
		alignItems: 'center'
	},
	error: {
		color: '#c0392b',
		margin: 0,
		fontSize: '13px'
	},
	btnVolver: { padding: '8px 15px', backgroundColor: '#95a5a6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' },
	btnCrear: { padding: '10px 15px', backgroundColor: '#1a1a2e', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' },
	loading: { textAlign: 'center', marginTop: '40px' },
	tableContainer: { backgroundColor: 'white', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', overflow: 'auto' },
	tabla: { width: '100%', borderCollapse: 'collapse' },
	thead: { backgroundColor: '#1a1a2e' },
	th: { padding: '12px 10px', color: 'white', textAlign: 'left', fontSize: '13px', whiteSpace: 'nowrap' },
	tr: { borderBottom: '1px solid #eee' },
	td: { padding: '12px 10px', fontSize: '13px', color: '#333', whiteSpace: 'nowrap' },
	emptyCell: { textAlign: 'center', padding: '20px', color: '#777' },
	btnEstado: {
		padding: '6px 10px',
		color: 'white',
		border: 'none',
		borderRadius: '5px',
		cursor: 'pointer',
		fontSize: '12px',
		fontWeight: 'bold'
	},
	btnEliminar: {
		padding: '6px 10px',
		backgroundColor: '#e74c3c',
		color: 'white',
		border: 'none',
		borderRadius: '5px',
		cursor: 'pointer',
		fontSize: '12px'
	}
};

export default Reservas;
