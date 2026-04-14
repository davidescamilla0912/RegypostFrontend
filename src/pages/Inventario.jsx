import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import inventarioService from '../services/inventarioService';
import { AppButton, PageHeader } from '../components/ui';
import '../components/ui/ui.css';

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

    if (loading) return <p className="page-loading">Cargando inventario...</p>;

    return (
        <div className="page-container">
            <PageHeader
                title="Inventario"
                onBack={() => navigate('/dashboard')}
                backLabel="← Volver"
                actions={(
                    <AppButton onClick={() => setMostrarFormulario(!mostrarFormulario)}>
                        + Nuevo Producto
                    </AppButton>
                )}
            />

            {mostrarFormulario && (
                <div className="panel">
                    <h3 className="panel-title">Nuevo Producto</h3>
                      <div>
                        <label className="label">Nombre *</label>
                        <input className="input-base full-width" placeholder="Nombre *"
                         value={formData.nombre}
                        onChange={e => setFormData({ ...formData, nombre: e.target.value })} />
                    </div>
                    <div>
                        <label className="label">Categoria</label>
                        <input className="input-base full-width" placeholder="Categoria"
                        value={formData.categoria}
                        onChange={e => setFormData({ ...formData, categoria: e.target.value })} />
                    </div>
                    <div>
                        <label className="label">Precio unitario</label>
                        <input className="input-base full-width" placeholder="Precio unitario" type="number"
                        value={formData.precio_unitario}
                        onChange={e => setFormData({ ...formData, precio_unitario: e.target.value })} />
                    </div>
                    <div>
                        <label className="label">Stock minimo</label>
                        <input className="input-base full-width" placeholder="Stock minimo" type="number"
                        value={formData.stock_minimo}
                        onChange={e => setFormData({ ...formData, stock_minimo: e.target.value })} />
                    </div>
                    <div>
                        <label className="label">Stock inicial</label>
                        <input className="input-base full-width" placeholder="Stock inicial" type="number"
                        value={formData.stock_inicial}
                        onChange={e => setFormData({ ...formData, stock_inicial: e.target.value })} />
                    </div>
                    <div className="form-actions mt-10">
                        <AppButton variant="info" onClick={crearProducto}>Guardar</AppButton>
                        <AppButton variant="danger" onClick={() => setMostrarFormulario(false)}>Cancelar</AppButton>
                    </div>
                </div>
            )}

            {mostrarMovimiento && (
                <div className="panel">
                    <h3 className="panel-title">Registrar Movimiento - {productoSeleccionado?.nombre}</h3>
                    <div className="form-grid form-grid--2">
                        <select className="select-base"
                            value={movData.tipo_movimiento}
                            onChange={e => setMovData({ ...movData, tipo_movimiento: e.target.value })}>
                            <option value="entrada">Entrada</option>
                            <option value="salida">Salida</option>
                            <option value="ajuste">Ajuste</option>
                        </select>
                        <input className="input-base" placeholder="Cantidad" type="number"
                            value={movData.cantidad}
                            onChange={e => setMovData({ ...movData, cantidad: e.target.value })} />
                        <input className="input-base" placeholder="Referencia"
                            value={movData.referencia}
                            onChange={e => setMovData({ ...movData, referencia: e.target.value })} />
                        <input className="input-base" placeholder="Observacion"
                            value={movData.observacion}
                            onChange={e => setMovData({ ...movData, observacion: e.target.value })} />
                    </div>
                    <div className="form-actions">
                        <AppButton variant="info" onClick={registrarMovimiento}>Registrar</AppButton>
                        <AppButton variant="danger" onClick={() => setMostrarMovimiento(false)}>Cancelar</AppButton>
                    </div>
                </div>
            )}

            <div className="toolbar">
                {['todos', 'reponer'].map(f => (
                    <AppButton
                        key={f}
                        size="sm"
                        variant={filtro === f ? 'primary' : 'secondary'}
                        onClick={() => setFiltro(f)}
                    >
                        {f === 'todos' ? 'Todos' : '⚠️ Por Reponer'}
                    </AppButton>
                ))}
            </div>

            <div className="cards-grid cards-grid--md">
                {productos.map(p => (
                    <div key={p.id} className="entity-card">
                        <div className="entity-card__header">
                            <h3 className="entity-card__title">{p.nombre}</h3>
                            <span className="badge" style={{
                                backgroundColor: p.alerta === 'REPONER' ? '#e74c3c' : '#2ecc71'
                            }}>
                                {p.alerta}
                            </span>
                        </div>
                        <p className="entity-card__text">📦 Categoria: {p.categoria || '-'}</p>
                        <p className="entity-card__text">💰 Precio: ${p.precio_unitario?.toLocaleString()}</p>
                        <p className="entity-card__text">📊 Stock minimo: {p.stock_minimo}</p>
                        <p style={{
                            fontSize: '16px',
                            fontWeight: 'bold',
                            margin: '8px 0',
                            color: p.alerta === 'REPONER' ? '#e74c3c' : '#2ecc71'
                        }}>
                            Stock actual: {p.stock_actual}
                        </p>
                        <div className="row-actions mt-10">
                            <AppButton variant="info" size="sm"
                                onClick={() => abrirMovimiento(p)}>
                                + Movimiento
                            </AppButton>
                            <AppButton variant="danger" size="sm"
                                onClick={() => eliminar(p.id)}>
                                Desactivar
                            </AppButton>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default Inventario;