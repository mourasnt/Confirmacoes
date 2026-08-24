import { google } from 'googleapis';
import { join, dirname } from 'path';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function limparString(texto) {
  if (!texto) return '';
  return texto.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '').trim();
}

function parseDateTime(str) {
  if (!str) return null;
  const clean = String(str).trim();
  if (!clean) return null;

  const pad = (n) => String(n).padStart(2, '0');

  // ISO: YYYY-MM-DD ou YYYY-MM-DDTHH:MM[:SS] (também aceita espaço)
  let m = clean.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/);
  if (m) {
    const [, y, mo, d, h = 0, mi = 0, s = 0] = m;
    return new Date(+y, +mo - 1, +d, +h, +mi, +s);
  }

  // DMY: DD/MM[/YYYY] [HH:MM[:SS]] — ano opcional (assume ano atual)
  m = clean.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?(?:[\sT](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/);
  if (m) {
    const [, d, mo, yRaw, h = 0, mi = 0, s = 0] = m;
    let y = +yRaw;
    if (!yRaw) y = new Date().getFullYear();
    else if (y < 100) y += 2000;
    return new Date(y, +mo - 1, +d, +h, +mi, +s);
  }

  // fallback: parser nativo do navegador/Node
  const t = Date.parse(clean);
  return Number.isNaN(t) ? null : new Date(t);
}

function hasTimeComponent(str) {
  return str ? /:/.test(String(str)) : false;
}

function colToIndex(letter) {
  let idx = 0;
  for (const ch of String(letter).toUpperCase().replace(/[^A-Z]/g, '')) {
    idx = idx * 26 + (ch.charCodeAt(0) - 64);
  }
  return idx - 1;
}

function indexToCol(idx) {
  let n = idx + 1;
  let s = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

export class GoogleSheetsReader {
  constructor(spreadsheetId, credentialsFile) {
    this.spreadsheetId = spreadsheetId;
    this.credentialsFile = credentialsFile || this._findCredentials();
    this.client = null;
  }

  _findCredentials() {
    if (process.env.GOOGLE_CREDENTIALS_JSON) return 'env';
    const candidates = [
      join(__dirname, '..', '..', '..', 'credentials.json'),
      join(__dirname, '..', '..', 'credentials.json'),
      join('/', 'app', 'credentials.json'),
    ];
    for (const p of candidates) {
      if (existsSync(p)) return p;
    }
    return join(__dirname, '..', '..', 'credentials.json');
  }

  async _authenticate() {
    let auth;
    if (process.env.GOOGLE_CREDENTIALS_JSON) {
      auth = new google.auth.GoogleAuth({
        credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON),
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
      });
    } else {
      auth = new google.auth.GoogleAuth({
        keyFile: this.credentialsFile,
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
      });
    }
    this.client = await google.sheets({ version: 'v4', auth });
  }

  async obterAbas() {
    if (!this.client) await this._authenticate();
    const res = await this.client.spreadsheets.get({
      spreadsheetId: this.spreadsheetId,
    });
    return res.data.sheets.map((s) => s.properties.title);
  }

  async lerPlanilha(abaNome, colRange, linhaCabecalho, linhaInicioDados) {
    if (!this.client) await this._authenticate();

    const [startCol, endCol] = colRange.includes(':') ? colRange.split(':') : [colRange, colRange];
    const range = `${abaNome}!${startCol}${linhaCabecalho}:${endCol}${linhaCabecalho}`;
    const headersRes = await this.client.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range,
    });
    const headers = (headersRes.data.values?.[0] || []).map((h) => h?.toString().trim() || '');

    const startRow = Math.max(linhaInicioDados, linhaCabecalho + 1);
    const dataRange = `${abaNome}!${startCol}${startRow}:${endCol}`;

    const dataRes = await this.client.spreadsheets.values.batchGet({
      spreadsheetId: this.spreadsheetId,
      ranges: [dataRange],
    });

    const rows = dataRes.data.valueRanges?.[0]?.values || [];

    const result = [];

    for (const row of rows) {
      const obj = {};
      for (let i = 0; i < headers.length; i++) {
        obj[headers[i]] = limparString(row[i] || '');
      }
      if (Object.values(obj).some((v) => v)) {
        result.push(obj);
      }
    }

    return { headers, data: result };
  }

  async obterDadosConfirmacao(abaNome, linhaCabecalho, linhaInicioDados, colMap, dataInicio, dataFim) {
    const colLetters = Object.values(colMap).filter(Boolean);
    if (colLetters.length === 0) return [];

    const minIdx = Math.min(...colLetters.map(colToIndex));
    const startCol = indexToCol(minIdx);
    const endCol = indexToCol(Math.max(...colLetters.map(colToIndex)));
    const colRange = `${startCol}:${endCol}`;

    const { headers, data } = await this.lerPlanilha(abaNome, colRange, linhaCabecalho, linhaInicioDados);

    const headerToKey = {};
    for (const [key, letter] of Object.entries(colMap)) {
      const idx = colToIndex(letter) - minIdx;
      if (headers[idx]) headerToKey[headers[idx]] = key;
    }
    console.log('[FILTRO] headers lidos da planilha:', JSON.stringify(headers));
    console.log('[FILTRO] headerToKey (cabecalhoPlanilha -> chaveInterna):', JSON.stringify(headerToKey));

    const statusIdx = headers.findIndex((h) => h && /status|situa[çc][ãa]o/i.test(h));
    const statusHeader = statusIdx >= 0 ? headers[statusIdx] : null;

    const mapped = data.map((row, i) => {
      const obj = {};
      for (const [header, value] of Object.entries(row)) {
        const key = headerToKey[header];
        if (key) obj[key] = value;
      }
      obj.status = statusHeader ? (data[i][statusHeader] || '') : '';
      return obj;
    });

    const comTelefone = mapped.filter((row) => {
      const tel = (row.telefone || '').trim();
      return tel !== '' && tel !== '-';
    });

    console.log('[FILTRO] amostra das 5 primeiras linhas (valores brutos + parse):');
    mapped.slice(0, 5).forEach((r, i) => {
      console.log(
        `  [${i}] id=${r.id_3zx} tel=${r.telefone} | eta=${JSON.stringify(r.eta)} eta_origem=${JSON.stringify(r.eta_origem)} eta_destino=${JSON.stringify(r.eta_destino)}`
      );
      console.log(
        `       parsed -> eta=${parseDateTime(r.eta)} eta_origem=${parseDateTime(r.eta_origem)} eta_destino=${parseDateTime(r.eta_destino)}`
      );
    });

    const start = dataInicio ? parseDateTime(dataInicio) : null;
    const end = dataFim ? parseDateTime(dataFim) : null;
    if (end && !hasTimeComponent(dataFim)) end.setHours(23, 59, 59, 999);
    console.log('[FILTRO] entrada dataInicio=', JSON.stringify(dataInicio), 'dataFim=', JSON.stringify(dataFim));
    console.log('[FILTRO] parsed  start=', start, 'end=', end);

    const dateCols = ['eta_origem'];
    let passCount = 0;
    let failCount = 0;
    const dateFiltered = comTelefone.filter((row) => {
      if (!start && !end) return true;
      const dates = dateCols.map((c) => parseDateTime(row[c])).filter(Boolean);
      if (dates.length === 0) {
        failCount++;
        if (failCount <= 5) {
          console.log('  [FILTRO] EXCLUIDO (nenhuma data parseavel):', row.id_3zx,
            { eta: row.eta, eta_origem: row.eta_origem, eta_destino: row.eta_destino });
        }
        return false;
      }
      const ok = dates.some((d) => {
        if (start && d < start) return false;
        if (end && d > end) return false;
        return true;
      });
      if (ok) {
        passCount++;
      } else {
        failCount++;
        if (failCount <= 5) {
          console.log('  [FILTRO] EXCLUIDO (fora do intervalo):', row.id_3zx, { dates, start, end });
        }
      }
      return ok;
    });
    console.log(`[FILTRO] comTelefone=${comTelefone.length} passaram=${passCount} excluidos=${failCount} total=${dateFiltered.length}`);

    dateFiltered.sort((a, b) => {
      const etaA = parseDateTime(a.eta);
      const etaB = parseDateTime(b.eta);
      if (!etaA && !etaB) return 0;
      if (!etaA) return 1;
      if (!etaB) return -1;
      return etaA - etaB;
    });

    return dateFiltered.map((row, idx) => ({
      ...row,
      uid: `${row.id_3zx || ''}_${idx}`,
      primeiro_nome: (row.motorista || '').split(' ')[0],
    }));
  }
}
