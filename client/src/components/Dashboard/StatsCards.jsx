const cards = [
  { key: 'total', label: 'Total', color: 'text-blue-700', dot: 'bg-blue-500' },
  { key: 'pendentes', label: 'Pendentes', color: 'text-amber-700', dot: 'bg-amber-500' },
  { key: 'enviados', label: 'Enviados', color: 'text-emerald-700', dot: 'bg-emerald-500' },
  { key: 'selecionados', label: 'Selecionados', color: 'text-violet-700', dot: 'bg-violet-500' },
];

export default function StatsCards({ stats }) {
  return (
    <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.key}
          className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200/60 transition-shadow hover:shadow-md"
        >
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 shrink-0 rounded-full ${card.dot}`} aria-hidden="true" />
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              {card.label}
            </p>
          </div>
          <p className={`mt-2 text-2xl font-semibold tabular-nums ${card.color}`}>
            {stats[card.key] ?? 0}
          </p>
        </div>
      ))}
    </div>
  );
}
