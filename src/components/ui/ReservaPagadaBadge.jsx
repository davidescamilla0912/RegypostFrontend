/**
 * Badge visual que indica si una reserva está pagada o tiene saldo pendiente.
 * Reutilizable en CheckOut, ModalHabitacion, Caja, etc.
 */
function ReservaPagadaBadge({ pagada, totalPagado = 0, totalARecaudar = 0, size = 'md' }) {
    const toCurrency = (v) => `$${new Intl.NumberFormat('es-CO').format(Number(v) || 0)}`;

    const sizes = {
        sm: { padding: '3px 10px', fontSize: '11px', borderRadius: '10px' },
        md: { padding: '6px 14px', fontSize: '13px', borderRadius: '10px' },
        lg: { padding: '8px 18px', fontSize: '14px', borderRadius: '10px' },
    };

    if (pagada) {
        return (
            <span style={{
                ...sizes[size],
                backgroundColor: '#27ae60',
                color: '#fff',
                fontWeight: 700,
                display: 'inline-block',
                letterSpacing: '0.3px',
            }}>
                ✓ RESERVA PAGADA
            </span>
        );
    }

    const saldo = Math.max(totalARecaudar - totalPagado, 0);

    return (
        <span style={{
            ...sizes[size],
            backgroundColor: '#fdecea',
            color: '#c0392b',
            fontWeight: 700,
            border: '1px solid #f5c6c2',
            display: 'inline-block',
        }}>
            Saldo pendiente: {toCurrency(saldo)}
        </span>
    );
}

export default ReservaPagadaBadge;
