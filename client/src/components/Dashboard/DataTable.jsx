import { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import Checkbox from '../ui/Checkbox.jsx';
import EmptyState from '../ui/EmptyState.jsx';
import { dashboardColumns, gridTemplate, Cell } from '../table/columns.jsx';

const ROW_HEIGHT = 48;
const OVERSCAN = 8;
const CHECKBOX_W = 44;
const ID_W = dashboardColumns[0].width;

const InboxIcon = (
  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M2.25 13.5h3.86a2.25 2.25 0 0 1 2.012 1.244l.256.512a2.25 2.25 0 0 0 2.013 1.244h3.218a2.25 2.25 0 0 0 2.013-1.244l.256-.512a2.25 2.25 0 0 1 2.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 0 0-2.15-1.588H6.911a2.25 2.25 0 0 0-2.15 1.588L2.35 13.177a2.25 2.25 0 0 0-.1.661Z"
    />
  </svg>
);

export default function DataTable({ data, selected, onToggle, onSelectAll, loading = false }) {
  const scrollRef = useRef(null);
  const ticking = useRef(false);
  const [scrollTop, setScrollTop] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [viewport, setViewport] = useState(600);

  const total = data ? data.length : 0;
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const allSelected = total > 0 && selectedSet.size === total;
  const someSelected = selectedSet.size > 0 && !allSelected;

  const columns = useMemo(() => {
    if (!total) return [];
    const allKeys = Object.keys(data[0]);
    return dashboardColumns.filter((col) => allKeys.includes(col.key));
  }, [data, total]);

  const template = useMemo(
    () => `${CHECKBOX_W}px ${gridTemplate(columns)}`,
    [columns]
  );

  const measure = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setScrollTop(el.scrollTop);
    setScrollLeft(el.scrollLeft);
    setViewport(el.clientHeight);
  }, []);

  const onScroll = useCallback(() => {
    if (ticking.current) return;
    ticking.current = true;
    requestAnimationFrame(() => {
      measure();
      ticking.current = false;
    });
  }, [measure]);

  useEffect(() => {
    measure();
    const el = scrollRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = 0;
    setScrollTop(0);
    setScrollLeft(0);
  }, [data]);

  if (!data || total === 0) {
    return (
      <div className="rounded-xl bg-white shadow-sm ring-1 ring-slate-200/60">
        <EmptyState
          icon={InboxIcon}
          title="Nenhum dado encontrado"
          hint='Ajuste o filtro de datas ou carregue os dados clicando em "Recarregar Dados"'
        />
      </div>
    );
  }

  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const endIndex = Math.min(total, Math.ceil((scrollTop + viewport) / ROW_HEIGHT) + OVERSCAN);
  const visible = data.slice(startIndex, endIndex);
  const scrolledX = scrollLeft > 0;

  const stickyShadow = scrolledX
    ? 'shadow-[8px_0_12px_-10px_rgba(15,23,42,0.28)]'
    : '';

  return (
    <div
      className={`overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200/60 transition-opacity duration-200 ${
        loading ? 'pointer-events-none opacity-50' : ''
      }`}
    >
      <div ref={scrollRef} className="scroll-thin max-h-[65vh] min-h-[320px] overflow-auto" onScroll={onScroll}>
        <div className="w-max min-w-full">
          {/* Cabeçalho */}
          <div
            role="row"
            className="sticky top-0 z-20 grid h-11 items-stretch border-b border-slate-200 bg-slate-50"
            style={{ gridTemplateColumns: template }}
          >
            <div
              className={`sticky left-0 z-30 flex items-center justify-center bg-slate-50 px-1 ${stickyShadow}`}
              role="columnheader"
            >
              <Checkbox
                checked={allSelected}
                indeterminate={someSelected}
                onChange={onSelectAll}
                label="Selecionar todos"
              />
            </div>
            {columns.map((col, i) => (
              <div
                key={col.key}
                role="columnheader"
                scope="col"
                className={`flex items-center px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 ${
                  i === 0 ? `sticky left-[44px] z-30 border-r border-slate-200/70 bg-slate-50 ${stickyShadow}` : ''
                }`}
              >
                {col.label}
              </div>
            ))}
          </div>

          {/* Corpo virtualizado */}
          <div role="rowgroup" style={{ height: total * ROW_HEIGHT, position: 'relative' }}>
            {visible.map((row, i) => {
              const index = startIndex + i;
              const isSelected = selectedSet.has(row.uid);
              return (
                <div
                  key={row.uid}
                  role="row"
                  aria-selected={isSelected}
                  tabIndex={0}
                  onClick={() => onToggle(row.uid)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onToggle(row.uid);
                    }
                  }}
                  className={`group absolute left-0 right-0 grid cursor-pointer select-none items-stretch overflow-hidden border-b border-slate-100 outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500 ${
                    isSelected ? 'bg-indigo-50/80 hover:bg-indigo-100/60' : 'bg-white hover:bg-slate-50'
                  }`}
                  style={{ top: index * ROW_HEIGHT, height: ROW_HEIGHT, gridTemplateColumns: template }}
                >
                  <div
                    className={`sticky left-0 z-10 flex items-center justify-center px-1 ${
                      isSelected
                        ? 'bg-indigo-50/95 group-hover:bg-indigo-100/70'
                        : 'bg-white group-hover:bg-slate-50'
                    }`}
                  >
                    <Checkbox
                      checked={isSelected}
                      onChange={() => onToggle(row.uid)}
                      label={`Selecionar ${row.id_3zx || 'registro'}`}
                    />
                  </div>
                  {columns.map((col, ci) => (
                    <div
                      key={col.key}
                      role="cell"
                      className={
                        ci === 0
                          ? `sticky left-[44px] z-10 min-w-0 overflow-hidden border-r border-slate-100 ${
                              isSelected
                                ? 'bg-indigo-50/95 group-hover:bg-indigo-100/70'
                                : 'bg-white group-hover:bg-slate-50'
                            } ${stickyShadow}`
                          : 'min-w-0 overflow-hidden'
                      }
                    >
                      <Cell col={col} row={row} />
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-slate-100 px-4 py-2.5 text-xs text-slate-400">
        <span>
          <span className="font-medium tabular-nums text-slate-600">{total}</span>{' '}
          registro{total !== 1 ? 's' : ''}
          {selectedSet.size > 0 && (
            <>
              {' · '}
              <span className="font-medium tabular-nums text-indigo-600">{selectedSet.size}</span>{' '}
              selecionado{selectedSet.size !== 1 ? 's' : ''}
            </>
          )}
        </span>
        <span className="hidden sm:block">Clique em uma linha para selecionar</span>
      </div>
    </div>
  );
}
