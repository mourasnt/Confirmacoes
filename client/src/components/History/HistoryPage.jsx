import { useState, useEffect } from 'react';
import { fetchHistory } from '../../services/api.js';
import EmptyState from '../ui/EmptyState.jsx';
import { historyColumns, Cell } from '../table/columns.jsx';

const HistoryIcon = (
  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 6v6l4 2m6-2a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z"
    />
  </svg>
);

export default function HistoryPage() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory()
      .then(setHistory)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="w-full">
        <div className="mb-6 h-8 w-48 animate-pulse rounded bg-slate-200" />
        <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200/60">
          <div className="h-11 animate-pulse border-b border-slate-200 bg-slate-50" />
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-12 animate-pulse border-b border-slate-100 bg-white"
              style={{ opacity: 1 - i * 0.08 }}
            >
              <div className="flex h-full items-center gap-4 px-4">
                <div className="h-3 w-24 rounded bg-slate-200" />
                <div className="h-3 flex-1 max-w-[260px] rounded bg-slate-200" />
                <div className="h-3 w-32 rounded bg-slate-200" />
                <div className="ml-auto h-5 w-20 rounded bg-slate-200" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const columns = historyColumns.filter((col) => history.some((row) => row[col.key] !== undefined));

  return (
    <div className="w-full">
      <h1 className="mb-6 text-2xl font-semibold text-slate-800">Histórico de Envios</h1>

      {history.length === 0 ? (
        <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200/60">
          <EmptyState
            icon={HistoryIcon}
            title="Nenhum envio registrado"
            hint="Os envios de confirmação aparecerão aqui assim que forem realizados."
          />
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200/60">
          <div className="scroll-thin max-h-[70vh] overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50">
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      scope="col"
                      className="sticky top-0 z-10 bg-slate-50 px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400"
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {history.map((row) => (
                  <tr key={row.id} className="group bg-white transition-colors hover:bg-slate-50">
                    {columns.map((col) => (
                      <td key={col.key} className="h-12 overflow-hidden p-0 align-middle">
                        <Cell col={col} row={row} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between gap-x-4 border-t border-slate-100 px-4 py-2.5 text-xs text-slate-400">
            <span>
              <span className="font-medium tabular-nums text-slate-600">{history.length}</span>{' '}
              registro{history.length !== 1 ? 's' : ''}
            </span>
            <span className="hidden sm:block">Mais recentes primeiro</span>
          </div>
        </div>
      )}
    </div>
  );
}
