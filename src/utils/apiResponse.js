export const extraerLista = (response) => {
    if (Array.isArray(response?.data?.data)) return response.data.data;
    if (Array.isArray(response?.data)) return response.data;
    if (Array.isArray(response)) return response;
    return [];
};

export const extraerRecurso = (response) => response?.data?.data ?? response?.data ?? null;