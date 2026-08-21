const TONES = {
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  warning: 'bg-amber-50 text-amber-700 ring-amber-600/25',
  info: 'bg-sky-50 text-sky-700 ring-sky-600/20',
  danger: 'bg-rose-50 text-rose-700 ring-rose-600/20',
  neutral: 'bg-slate-100 text-slate-600 ring-slate-500/15',
};

export default function StatusBadge({ status, tone }) {
  const resolved = tone || 'neutral';
  return (
    <span
      className={`inline-flex max-w-full items-center rounded-md px-2 py-[3px] text-xs font-medium ring-1 ring-inset truncate ${TONES[resolved]}`}
    >
      {status}
    </span>
  );
}
