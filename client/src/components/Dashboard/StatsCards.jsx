const cards = [
  { key: 'total', label: 'Total', color: 'border-l-blue-500', bg: 'bg-blue-50' },
  { key: 'pendentes', label: 'Pendentes', color: 'border-l-amber-500', bg: 'bg-amber-50' },
  { key: 'enviados', label: 'Enviados', color: 'border-l-emerald-500', bg: 'bg-emerald-50' },
  { key: 'selecionados', label: 'Selecionados', color: 'border-l-violet-500', bg: 'bg-violet-50' },
];

export default function StatsCards({ stats }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((card) => (
        <div
          key={card.key}
          className={`${card.bg} ${card.color} border-l-4 rounded-xl p-4 shadow-sm`}
        >
          <p className="text-sm text-slate-500 font-medium">{card.label}</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">
            {stats[card.key] ?? 0}
          </p>
        </div>
      ))}
    </div>
  );
}
