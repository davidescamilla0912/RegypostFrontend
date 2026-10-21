import './ui.css';

function DataTable({ columns, data, rowKey = 'id', renderCell, emptyMessage = 'No hay datos para mostrar.' }) {
    const rows = Array.isArray(data) ? data : [];
    const getKey = typeof rowKey === 'function' ? rowKey : (row) => row?.[rowKey];

    return (
        <div className="table-shell">
            <table className="table-base">
                <thead>
                    <tr>
                        {columns.map((column) => (
                            <th key={column.key}>{column.label}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.length === 0 && (
                        <tr>
                            <td className="table-empty" colSpan={columns.length}>{emptyMessage}</td>
                        </tr>
                    )}
                    {rows.map((row) => (
                        <tr key={getKey(row)}>
                            {columns.map((column) => (
                                <td key={column.key}>
                                    {renderCell ? renderCell(row, column) : row?.[column.key]}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default DataTable;
