import { useState, useEffect, useCallback } from 'react';
import pagoService from '../services/pagoService';

/**
 * Hook que determina si una reserva está totalmente pagada.
 * Compara la suma de pagos registrados contra el total a cobrar.
 *
 * @param {object} params
 * @param {number|string} params.reservaId
 * @param {number} params.totalARecaudar  – totalReserva - anticipo + consumos
 * @returns {{ pagada: boolean, totalPagado: number, loading: boolean, recargar: Function }}
 */
function useReservaPagada({ reservaId, totalARecaudar = 0 }) {
    const [pagada, setPagada] = useState(false);
    const [totalPagado, setTotalPagado] = useState(0);
    const [loading, setLoading] = useState(true);

    const verificar = useCallback(async () => {
        if (!reservaId) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const res = await pagoService.getAll();
            const lista = Array.isArray(res?.data) ? res.data
                : Array.isArray(res?.data?.data) ? res.data.data
                : [];

            const suma = lista
                .filter(p => String(p.reserva_id) === String(reservaId))
                .reduce((acc, p) => acc + Number(p.monto || 0), 0);

            setTotalPagado(suma);
            setPagada(suma > 0 && suma >= totalARecaudar);
        } catch {
            setPagada(false);
            setTotalPagado(0);
        } finally {
            setLoading(false);
        }
    }, [reservaId, totalARecaudar]);

    useEffect(() => {
        verificar();
    }, [verificar]);

    return { pagada, totalPagado, loading, recargar: verificar };
}

export default useReservaPagada;
