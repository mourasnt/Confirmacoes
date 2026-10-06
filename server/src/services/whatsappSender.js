import axios from 'axios';
import { obterConfiguracao } from '../database.js';

// Funções de formatação de data (copiadas do cliente para o servidor)
const pad = (n) => String(n).padStart(2, '0');

function parseSheetDate(value) {
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

  m = clean.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?(?:[T\s](\d{1,2}):(\d{2}))?/);
  if (m) {
    const [, d, mo, y, h = '0', mi = '0'] = m;
    const year = y ? +y : new Date().getFullYear();
    const date = new Date(year, +mo - 1, +d, +h, +mi);
    return Number.isNaN(date.getTime()) || date.getMonth() !== +mo - 1 ? null : date;
  }

  const t = Date.parse(clean);
  return Number.isNaN(t) ? null : new Date(t);
}

function formatDateTime(value) {
  if (!value) return '';
  const d = parseSheetDate(value);
  if (!d) return String(value);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function limparTelefone(telefone) {
  let num = telefone.replace(/\D/g, '');
  if (num.length === 10 || num.length === 11) {
    num = `55${num}`;
  } else if (num.length === 12 && num.startsWith('55')) {
  } else if (num.length === 13 && num.startsWith('55')) {
  } else if (!num.startsWith('55')) {
    num = `55${num}`;
  }
  return num;
}

export function processarTemplate(template, dados) {
  const vars = {
    motorista: dados.motorista || '',
    primeiro_nome: (dados.motorista || '').split(' ')[0] || '',
    lt: dados.lt || '',
    origem: dados.origem || '',
    destino: dados.destino || '',
    eta_origem: formatDateTime(dados.eta_origem || dados.eta || ''),
    cliente: dados.cliente || '',
    placa: dados.placa || '',
    placa2: dados.placa2 || dados.placa || '',
    id_3zx: dados.id_3zx || '',
    telefone: dados.telefone || '',
    eta_destino: formatDateTime(dados.eta_destino || ''),
    data: formatDateTime(dados.eta || dados.eta_origem || ''),
    n_carga: dados.lt || '',
    operacao: dados.operacao || '',
  };

  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  }
  return result;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomDelay(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

let enviando = false;

export async function enviarConfirmacoes(registros, templateConteudo, instancia) {

  const resultados = { enviados: 0, pulados: 0, erros: [] };

  try {
    const apiUrl = (obterConfiguracao('evolution_api_url', process.env.EVOLUTION_API_URL || 'http://evolution_api:8080')).replace(/\/$/, '');
    const apiKey = obterConfiguracao('evolution_api_key', process.env.EVOLUTION_API_KEY || '');

    for (const row of registros) {
      try {
        const mensagem = processarTemplate(templateConteudo, row);
        const telefone = limparTelefone(row.telefone || '');

        if (!telefone || telefone.length < 12) {
          resultados.erros.push({ id: row.id_3zx || row.uid, erro: `Telefone inválido: ${row.telefone}` });
          continue;
        }

        await axios.post(
          `${apiUrl}/message/sendText/${encodeURIComponent(instancia)}`,
          {
            number: telefone,
            options: {"delay": 1200, "presence": "composing"},
            text: mensagem
          },
          { headers: { "Content-Type": "application/json", apikey: apiKey } }
        );

        resultados.enviados++;

        if (registros.length > 1) {
          await sleep(randomDelay(5000, 12000));
        }
      } catch (err) {
        let reqBody = err.config?.data || {};
        if (typeof reqBody === 'string') try { reqBody = JSON.parse(reqBody); } catch {}
        const requestInfo = {
          url: err.config?.url || '',
          method: err.config?.method || '',
          headers: err.config?.headers || {},
          requestBody: reqBody,
          responseStatus: err.response?.status || '',
          responseBody: err.response?.data || err.message,
        };
        console.error('ERRO ENVIO:', JSON.stringify(requestInfo, null, 2));
        resultados.erros.push({ id: row.id_3zx || row.uid || 'unknown', erro: `[${err.response?.status || ''}] ${JSON.stringify(err.response?.data) || err.message}`, requestBody: reqBody, requestUrl: err.config?.url || '' });
      }
    }
  } finally {
    enviando = false;
  }

  return resultados;
}
