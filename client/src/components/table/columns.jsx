import StatusBadge from '../ui/StatusBadge.jsx';
import { statusTone, formatEta, formatPhone, formatDateTime } from '../../utils/format.js';

const DASH = <span className="text-slate-300">—</span>;

export const dashboardColumns = [
  { key: 'id_3zx', label: 'ID 3ZX', width: 104, type: 'id' },
  { key: 'lt', label: 'LT', width: 96, type: 'code' },
  { key: 'motorista', label: 'Motorista', width: 'minmax(180px, 1.8fr)', type: 'strong' },
  { key: 'origem', label: 'Origem', width: 'minmax(150px, 1.2fr)', type: 'text' },
  { key: 'eta_origem', label: 'ETA Origem', width: 132, type: 'eta' },
  { key: 'destino', label: 'Destino', width: 'minmax(150px, 1.2fr)', type: 'text' },
  { key: 'eta_destino', label: 'ETA Destino', width: 132, type: 'eta' },
  { key: 'status', label: 'Status', width: 136, type: 'status' },
];

export const historyColumns = [
  { key: 'id_3zx', label: 'ID 3ZX', type: 'id' },
  { key: 'lt', label: 'LT', type: 'code' },
  { key: 'motorista', label: 'Motorista', type: 'strong' },
  { key: 'origem', label: 'Origem', type: 'text' },
  { key: 'eta_origem', label: 'ETA Origem', type: 'eta' },
  { key: 'destino', label: 'Destino', type: 'text' },
  { key: 'eta_destino', label: 'ETA Destino', type: 'eta' },
  { key: 'data_envio', label: 'Enviado em', type: 'datetime' },
  { key: 'status', label: 'Status', type: 'status' },
];

export function gridTemplate(columns) {
  return columns.map((c) => (typeof c.width === 'number' ? `${c.width}px` : c.width)).join(' ');
}

function CellContent({ col, value }) {
  switch (col.type) {
    case 'id':
      return value ? (
        <span className="truncate font-semibold tabular-nums text-slate-800" title={value}>
          {value}
        </span>
      ) : (
        DASH
      );
    case 'code':
      return value ? (
        <span className="truncate font-medium tabular-nums text-slate-700">{value}</span>
      ) : (
        DASH
      );
    case 'strong':
      return value ? (
        <span className="truncate font-medium text-slate-800" title={value}>
          {value}
        </span>
      ) : (
        DASH
      );
    case 'text':
      return value ? (
        <span className="truncate text-slate-600" title={value}>
          {value}
        </span>
      ) : (
        DASH
      );
    case 'phone':
      return value ? (
        <span className="whitespace-nowrap tabular-nums text-slate-600">
          {formatPhone(value) || value}
        </span>
      ) : (
        DASH
      );
    case 'eta':
      return value ? (
        <span className="whitespace-nowrap tabular-nums text-slate-600" title={String(value)}>
          {formatEta(value)}
        </span>
      ) : (
        DASH
      );
    case 'datetime':
      return value ? (
        <span className="whitespace-nowrap tabular-nums text-slate-500">
          {formatDateTime(value)}
        </span>
      ) : (
        DASH
      );
    case 'plate':
      return value ? (
        <span className="whitespace-nowrap font-medium uppercase tracking-wider text-slate-700">
          {value}
        </span>
      ) : (
        DASH
      );
    case 'status': {
      if (!value) return DASH;
      const raw = String(value);
      return <StatusBadge status={raw} tone={statusTone(raw)} />;
    }
    default:
      return value ? (
        <span className="truncate text-slate-600" title={String(value)}>
          {value}
        </span>
      ) : (
        DASH
      );
  }
}

export function Cell({ col, row }) {
  const raw = row[col.key];
  const display = col.type === 'phone' && raw ? formatPhone(raw) : raw;
  return (
    <div
      role={col.role || 'cell'}
      className={`flex h-full min-w-0 items-center overflow-hidden whitespace-nowrap px-3 ${col.cellClass || ''}`}
      title={raw != null && raw !== '' ? String(col.type === 'phone' ? display : raw) : undefined}
    >
      <CellContent col={col} value={raw} />
    </div>
  );
}
