const pad = (n) => String(n).padStart(2, '0');

export function parseSheetDate(value) {
  if (value == null || value === '') return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const clean = String(value).trim();
  if (!clean) return null;

  let m = clean.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s](\d{1,2}):(\d{2}))?/);
  if (m) {
    const [, y, mo, d, h = '0', mi = '0'] = m;
    const date = new Date(+y, +mo - 1, +d, +h, +mi);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  m = clean.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?(?:[\sT](\d{1,2}):(\d{2}))?/);
  if (m) {
    const [, d, mo, y, h = '0', mi = '0'] = m;
    const year = y ? +y : new Date().getFullYear();
    const date = new Date(year, +mo - 1, +d, +h, +mi);
    return Number.isNaN(date.getTime()) || date.getMonth() !== +mo - 1 ? null : date;
  }

  const t = Date.parse(clean);
  return Number.isNaN(t) ? null : new Date(t);
}

export function formatEta(value) {
  if (value == null || String(value).trim() === '') return '';
  const raw = String(value).trim();

  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(raw)) {
    const [h, mi] = raw.split(':');
    return `${pad(h)}:${mi}`;
  }
  if (!/\d/.test(raw)) return raw;

  const d = parseSheetDate(raw);
  if (!d) return raw;

  const hasTime = /\d{1,2}:\d{2}/.test(raw);
  const nowYear = new Date().getFullYear();
  const dayMonth = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
  const year = d.getFullYear() !== nowYear ? `/${String(d.getFullYear()).slice(2)}` : '';
  const time = hasTime ? ` ${pad(d.getHours())}:${pad(d.getMinutes())}` : '';
  return `${dayMonth}${year}${time}`;
}

export function formatDateTime(value) {
  if (!value) return '';
  const d = parseSheetDate(value);
  if (!d) return String(value);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatPhone(value) {
  if (!value) return '';
  let digits = String(value).replace(/\D/g, '');
  if (!digits) return String(value).trim();
  if (digits.startsWith('55') && digits.length > 11) digits = digits.slice(2);
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  if (digits.length === 9) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  if (digits.length === 8) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return String(value).trim();
}

export function statusTone(status) {
  const s = String(status || '').toLowerCase().trim();
  if (!s || s === '-' || s === '--') return 'none';
  if (/n[ãa]o\s+enviad|nao\s+enviad/.test(s)) return 'neutral';
  if (/cancel|recusad|errod|erro|inat|bloque|reprov/.test(s)) return 'danger';
  if (/confirmad|enviad|conclu|entregue|finalizad|^ok$/.test(s)) return 'success';
  if (/agendad|programad|previst/.test(s)) return 'info';
  if (/pend|aguard/.test(s)) return 'warning';
  return 'neutral';
}
