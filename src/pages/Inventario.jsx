import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import inventarioService from '../services/inventarioService';

function Inventario() {
    const [productos, setProductos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filtro, setFiltro] = useState('todos');
    const [mostrarFormulario, setMostrarFormulario] = useState(false);
    const [mostrarMovimiento, setMostrarMovimiento] = useState(false);
    const [productoSeleccionado, setProductoSeleccionado] = useState(null);
    const [formData, setFormData] = useState({
        nombre: '', categoria: '', precio_unitario: 0, stock_minimo: 5, stock_inicial: 0
    });
    const [movData, setMovData] = useState({
        producto_id: '', tipo_movimiento: 'entrada', cantidad: 1,
        referencia: '', observacion: ''
    });
    const navigate = useNavigate();

    useEffect(() => {
        cargarProductos();
    }, [filtro]);

    const cargarProductos = async () => {
        try {
            let res;
            if (filtro === 'reponer') {
                res = await inventarioService.getPorReponer();
            } else {
                res = await inventarioService.getAll();
            }
            setProductos(res.data);
        } catch (err) {
            console.error('Error cargando inventario', err);
        } finally {
            setLoading(false);
        }
    };

    const crearProducto = async () => {
    try {
        const res = await inventarioService.create(formData);
        const productoId = res.data.id;
        if (formData.stock_inicial > 0) {
            await inventarioService.registrarMovimiento({
                producto_id: productoId,
                tipo_movimiento: 'entrada',
                cantidad: parseInt(formData.stock_inicial),
                referencia: 'stock_inicial',
                observacion: 'Stock inicial al crear producto'
            });
        }
        setMostrarFormulario(false);
        setFormData({ nombre: '', categoria: '', precio_unitario: 0, stock_minimo: 5, stock_inicial: 0 });
        cargarProductos();
    } catch (err) {
        console.error('Error creando producto', err);
    }
};

    const registrarMovimiento = async () => {
        try {
            await inventarioService.registrarMovimiento(movData);
            setMostrarMovimiento(false);
            setMovData({ producto_id: '', tipo_movimiento: 'entrada', cantidad: 1, referencia: '', observacion: '' });
            cargarProductos();
        } catch (err) {
            console.error('Error registrando movimiento', err);
        }
    };

    const abrirMovimiento = (producto) => {
        setProductoSeleccionado(producto);
        setMovData({ ...movData, producto_id: producto.id });
        setMostrarMovimiento(true);
    };

    const eliminar = async (id) => {
        if (window.confirm('¿Desactivar este producto?')) {
            await inventarioService.delete(id);
            cargarProductos();
        }
    };

    if (loading) return <p style={styles.loading}>Cargando inventario...</p>;

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <button style={styles.btnVolver} onClick={() => navigate('/dashboard')}>← Volver</button>
                <h2 style={styles.titulo}>Inventario</h2>
                <button style={styles.btnCrear} onClick={() => setMostrarFormulario(!mostrarFormulario)}>
                    + Nuevo Producto
                </button>
            </div>

            {mostrarFormulario && (
                <div style={styles.formulario}>
                    <h3 style={styles.formTitulo}>Nuevo Producto</h3>
                      <div>
                        <label style={styles.label}>Nombre *</label>
                        <input style={styles.input} placeholder="Nombre *"
                         value={formData.nombre}
                        onChange={e => setFormData({ ...formData, nombre: e.target.value })} />
                    </div>
                    <div>
                        <label style={styles.label}>Categoría</label>
                        <input style={styles.input} placeholder="Categoría"
                        value={formData.categoria}
                        onChange={e => setFormData({ ...formData, categoria: e.target.value })} />
                    </div>
                    <div>
                        <label style={styles.label}>Precio unitario</label>
                        <input style={styles.input} placeholder="Precio unitario" type="number"
                        value={formData.precio_unitario}
                        onChange={e => setFormData({ ...formData, precio_unitario: e.target.value })} />
                    </div>
                    <div>
                        <label style={styles.label}>Stock mínimo</label>
                        <input style={styles.input} placeholder="Stock mínimo" type="number"
                        value={formData.stock_minimo}
                        onChange={e => setFormData({ ...formData, stock_minimo: e.target.value })} />
                    </div>
                    <div>
                        <label style={styles.label}>Stock inicial</label>
                        <input style={styles.input} placeholder="Stock inicial" type="number"
                        value={formData.stock_inicial}
                        onChange={e => setFormData({ ...formData, stock_inicial: e.target.value })} />
                    </div>
                    <div style={styles.formAcciones}>
                        <button style={styles.btnGuardar} onClick={crearProducto}>Guardar</button>
                        <button style={styles.btnCancelarForm} onClick={() => setMostrarFormulario(false)}>Cancelar</button>
                    </div>
                </div>
            )}

            {mostrarMovimiento && (
                <div style={styles.formulario}>
                    <h3 style={styles.formTitulo}>Registrar Movimiento — {productoSeleccionado?.nombre}</h3>
                    <div style={styles.formGrid}>
                        <select style={styles.input}
                            value={movData.tipo_movimiento}
                            onChange={e => setMovData({ ...movData, tipo_movimiento: e.target.value })}>
                            <option value="entrada">Entrada</option>
                            <option value="salida">Salida</option>
                            <option value="ajuste">Ajuste</option>
                        </select>
                        <input style={styles.input} placeholder="Cantidad" type="number"
                            value={movData.cantidad}
                            onChange={e => setMovData({ ...movData, cantidad: e.target.value })} />
                        <input style={styles.input} placeholder="Referencia"
                            value={movData.referencia}
                            onChange={e => setMovData({ ...movData, referencia: e.target.value })} />
                        <input style={styles.input} placeholder="Observación"
                            value={movData.observacion}
                            onChange={e => setMovData({ ...movData, observacion: e.target.value })} />
                    </div>
                    <div style={styles.formAcciones}>
                        <button style={styles.btnGuardar} onClick={registrarMovimiento}>Registrar</button>
                        <button style={styles.btnCancelarForm} onClick={() => setMostrarMovimiento(false)}>Cancelar</button>
                    </div>
                </div>
            )}

            <div style={styles.filtros}>
                {['todos', 'reponer'].map(f => (
                    <button key={f} style={{
                        ...styles.btnFiltro,
                        backgroundColor: filtro === f ? '#1a1a2e' : '#ddd',
                        color: filtro === f ? 'white' : '#333'
                    }} onClick={() => setFiltro(f)}>
                        {f === 'todos' ? 'Todos' : '⚠️ Por Reponer'}
                    </button>
                ))}
            </div>

            <div style={styles.grid}>
                {productos.map(p => (
                    <div key={p.id} style={styles.card}>
                        <div style={styles.cardHeader}>
                            <h3 style={styles.nombreProducto}>{p.nombre}</h3>
                            <span style={{
                                ...styles.badge,
                                backgroundColor: p.alerta === 'REPONER' ? '#e74c3c' : '#2ecc71'
                            }}>
                                {p.alerta}
                            </span>
                        </div>
                        <p style={styles.info}>📦 Categoría: {p.categoria || '-'}</p>
                        <p style={styles.info}>💰 Precio: ${p.precio_unitario?.toLocaleString()}</p>
                        <p style={styles.info}>📊 Stock mínimo: {p.stock_minimo}</p>
                        <p style={{
                            ...styles.stockActual,
                            color: p.alerta === 'REPONER' ? '#e74c3c' : '#2ecc71'
                        }}>
                            Stock actual: {p.stock_actual}
                        </p>
                        <div style={styles.acciones}>
                            <button style={styles.btnMovimiento}
                                onClick={() => abrirMovimiento(p)}>
                                + Movimiento
                            </button>
                            <button style={styles.btnEliminar}
                                onClick={() => eliminar(p.id)}>
                                Desactivar
                            </button>
                        </div>
                    </div>
                ))}
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
    formGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '15px' },
    input: { padding: '10px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px' },
    formAcciones: { display: 'flex', gap: '10px' },
    btnGuardar: { padding: '10px 20px', backgroundColor: '#2ecc71', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' },
    btnCancelarForm: { padding: '10px 20px', backgroundColor: '#e74c3c', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' },
    filtros: { display: 'flex', gap: '10px', marginBottom: '20px' },
    btnFiltro: { padding: '8px 15px', border: 'none', borderRadius: '20px', cursor: 'pointer', fontSize: '13px' },
    btnVolver: { padding: '8px 15px', backgroundColor: '#95a5a6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' },
    btnCrear: { padding: '8px 15px', backgroundColor: '#1a1a2e', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '15px' },
    card: { backgroundColor: 'white', borderRadius: '10px', padding: '15px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' },
    cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' },
    nombreProducto: { margin: 0, color: '#1a1a2e', fontSize: '15px' },
    badge: { padding: '3px 8px', borderRadius: '20px', color: 'white', fontSize: '11px', fontWeight: 'bold' },
    info: { margin: '4px 0', fontSize: '13px', color: '#555' },
    stockActual: { fontSize: '16px', fontWeight: 'bold', margin: '8px 0' },
    acciones: { display: 'flex', gap: '5px', marginTop: '10px' },
    btnMovimiento: { flex: 1, padding: '6px', backgroundColor: '#3498db', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' },
    btnEliminar: { flex: 1, padding: '6px', backgroundColor: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' },
    label: { display: 'block', fontSize: '13px', color: '#666', marginBottom: '4px' }
};

export default Inventario;