export default function DataTable({ data, selected, onToggle, onSelectAll }) {
  const allSelected = data.length > 0 && selected.length === data.length;
  const someSelected = selected.length > 0 && selected.length < data.length;

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-12 text-center">
        <p className="text-slate-400 text-lg">Nenhum dado encontrado</p>
        <p className="text-slate-300 text-sm mt-1">
          Carregue os dados clicando em "Recarregar Dados"
        </p>
      </div>
    );
  }

  const columns = Object.keys(data[0]).filter((k) => k !== 'uid');

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 sticky top-0">
            <tr>
              <th className="p-3 w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => el && (el.indeterminate = someSelected)}
                  onChange={onSelectAll}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
              </th>
              {columns.map((col) => (
                <th key={col} className="p-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((row) => (
              <tr
                key={row.uid}
                className={`hover:bg-slate-50 transition-colors ${
                  selected.includes(row.uid) ? 'bg-indigo-50' : ''
                }`}
              >
                <td className="p-3">
                  <input
                    type="checkbox"
                    checked={selected.includes(row.uid)}
                    onChange={() => onToggle(row.uid)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </td>
                {columns.map((col) => (
                  <td key={col} className="p-3 text-slate-600 whitespace-nowrap">
                    {row[col] || '-'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
