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

  // DMY: DD/MM/YYYY [HH:MM[:SS]] — hora/minuto com 1 ou 2 dígitos
  m = clean.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[\sT](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/);
  if (m) {
    const [, d, mo, y, h = 0, mi = 0, s = 0] = m;
    return new Date(+y, +mo - 1, +d, +h, +mi, +s);
  }

  // fallback: parser nativo do navegador/Node
  const t = Date.parse(clean);
  return Number.isNaN(t) ? null : new Date(t);
}

function hasTimeComponent(str) {
  return str ? /:/.test(String(str)) : false;
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

    const dateFiltered = comTelefone.filter((row) => {
      if (!dataInicio && !dataFim) return true;
      const eta = parseDateTime(row.eta);
      if (!eta) return true;
      if (dataInicio) {
        const start = parseDateTime(dataInicio);
        if (start && eta < start) return false;
      }
      if (dataFim) {
        const end = parseDateTime(dataFim);
        if (end) {
          if (!hasTimeComponent(dataFim)) end.setHours(23, 59, 59, 999);
          if (eta > end) return false;
        }
      }
      return true;
    });

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
      uid: `${row.id || ''}_${idx}`,
      primeiro_nome: (row.motorista || '').split(' ')[0],
    }));
  }
}
