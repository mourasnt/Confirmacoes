import { useState, useRef, useMemo, useCallback } from 'react';

const ROW_HEIGHT = 44;
const OVERSCAN = 8;

export default function DataTable({ data, selected, onToggle, onSelectAll }) {
  const scrollRef = useRef(null);
  const ticking = useRef(false);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewport, setViewport] = useState(600);

  const total = data ? data.length : 0;
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const allSelected = total > 0 && selectedSet.size === total;
  const someSelected = selectedSet.size > 0 && selectedSet.size < total;

  const columns = useMemo(
    () => (total ? Object.keys(data[0]).filter((k) => k !== 'uid') : []),
    [data, total]
  );

  const template = useMemo(
    () => `48px ${columns.map(() => 'minmax(150px, 1fr)').join(' ')}`,
    [columns]
  );

  const onScroll = useCallback(() => {
    if (ticking.current) return;
    ticking.current = true;
    requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (el) {
        setScrollTop(el.scrollTop);
        setViewport(el.clientHeight);
      }
      ticking.current = false;
    });
  }, []);

  if (!data || total === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-12 text-center">
        <p className="text-slate-400 text-lg">Nenhum dado encontrado</p>
        <p className="text-slate-300 text-sm mt-1">
          Ajuste o filtro de datas ou carregue os dados clicando em "Recarregar Dados"
        </p>
      </div>
    );
  }

  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const endIndex = Math.min(total, Math.ceil((scrollTop + viewport) / ROW_HEIGHT) + OVERSCAN);
  const visible = data.slice(startIndex, endIndex);

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div ref={scrollRef} className="overflow-auto max-h-[600px]" onScroll={onScroll}>
        <div style={{ width: 'max-content', minWidth: '100%' }}>
          <div
            className="sticky top-0 z-10 grid bg-slate-50 border-b border-slate-200"
            style={{ gridTemplateColumns: template }}
          >
            <div className="p-3 flex items-center">
              <input
                type="checkbox"
                checked={allSelected}
                ref={(el) => el && (el.indeterminate = someSelected)}
                onChange={onSelectAll}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                aria-label="Selecionar todos"
              />
            </div>
            {columns.map((col) => (
              <div
                key={col}
                className="p-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap"
              >
                {col}
              </div>
            ))}
          </div>

          <div style={{ height: total * ROW_HEIGHT, position: 'relative' }}>
            {visible.map((row, i) => {
              const index = startIndex + i;
              const isSel = selectedSet.has(row.uid);
              return (
                <div
                  key={row.uid}
                  className={`absolute left-0 right-0 grid items-center border-b border-slate-100 ${
                    isSel ? 'bg-indigo-50' : 'hover:bg-slate-50'
                  }`}
                  style={{
                    gridTemplateColumns: template,
                    height: ROW_HEIGHT,
                    transform: `translateY(${index * ROW_HEIGHT}px)`,
                  }}
                >
                  <div className="p-3 flex items-center">
                    <input
                      type="checkbox"
                      checked={isSel}
                      onChange={() => onToggle(row.uid)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      aria-label={`Selecionar ${row.uid}`}
                    />
                  </div>
                  {columns.map((col) => (
                    <div
                      key={col}
                      className="p-3 text-slate-600 whitespace-nowrap truncate"
                      title={row[col] || '-'}
                    >
                      {row[col] || '-'}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="p-3 text-xs text-slate-400 border-t border-slate-100">
        {total} registro{total !== 1 ? 's' : ''}
        {selectedSet.size > 0 && ` · ${selectedSet.size} selecionado${selectedSet.size !== 1 ? 's' : ''}`}
      </div>
    </div>
  );
}
