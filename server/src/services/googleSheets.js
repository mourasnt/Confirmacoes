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

function formatDateInput(dateStr) {
  if (!dateStr) return null;
  const [d, m, y] = dateStr.split('/');
  if (!d || !m || !y) return null;
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

function parseDateDMY(str) {
  if (!str) return null;
  const clean = str.trim();
  const patterns = [
    /^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})$/,
    /^(\d{2})\/(\d{2})\/(\d{4})$/,
    /^(\d{4})-(\d{2})-(\d{2})/,
  ];
  for (const p of patterns) {
    const m = clean.match(p);
    if (m) {
      if (p === patterns[2]) {
        return new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00`);
      }
      return new Date(`${m[3]}-${m[2]}-${m[1]}T${m[4] || '00:00'}:${m[5] || '00'}`);
    }
  }
  return null;
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

    const startCol = colLetters.reduce((a, b) => a < b ? a : b);
    const endCol = colLetters.reduce((a, b) => a > b ? a : b);
    const colRange = `${startCol}:${endCol}`;

    const { headers, data } = await this.lerPlanilha(abaNome, colRange, linhaCabecalho, linhaInicioDados);

    const headerToKey = {};
    for (const [key, letter] of Object.entries(colMap)) {
      const idx = letter.charCodeAt(0) - 65;
      if (headers[idx]) headerToKey[headers[idx]] = key;
    }

    const mapped = data.map((row) => {
      const obj = {};
      for (const [header, value] of Object.entries(row)) {
        const key = headerToKey[header];
        if (key) obj[key] = value;
      }
      return obj;
    });

    const filtered = mapped.filter((row) => {
      const status = (row.status || '').toLowerCase();
      return status.includes('pré agendado') || status.includes('pre agendado') || status === '';
    });

    const dateFiltered = filtered.filter((row) => {
      if (!dataInicio && !dataFim) return true;
      const eta = parseDateDMY(row.eta);
      if (!eta) return true;
      if (dataInicio) {
        const start = parseDateDMY(dataInicio);
        if (start && eta < start) return false;
      }
      if (dataFim) {
        const end = parseDateDMY(dataFim);
        if (end && eta > end) return false;
      }
      return true;
    });

    dateFiltered.sort((a, b) => {
      const etaA = parseDateDMY(a.eta);
      const etaB = parseDateDMY(b.eta);
      if (!etaA && !etaB) return 0;
      if (!etaA) return 1;
      if (!etaB) return -1;
      return etaA - etaB;
    });

    return dateFiltered.map((row, idx) => ({
      ...row,
      uid: `${row.id || ''}_${idx}`,
      primeiro_nome: (row.motorista || '').split(' ')[0],
    }));
  }
}
