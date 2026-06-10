import { useState, useEffect } from 'react';
import { fetchHistory } from '../../services/api.js';

export default function HistoryPage() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory()
      .then(setHistory)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-slate-400">Carregando...</p>;

  const columns = ['id_3zx', 'motorista', 'origem', 'destino', 'eta_origem', 'telefone', 'data_envio'];

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Histórico de Envios</h1>

      {history.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <p className="text-slate-400">Nenhum envio registrado</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  {columns.map((col) => (
                    <th key={col} className="p-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {history.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50">
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
          <div className="p-3 text-xs text-slate-400 border-t border-slate-100">
            Total: {history.length} registro{history.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}
    </div>
  );
}
