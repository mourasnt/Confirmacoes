import axios from 'axios';
import { obterConfiguracao } from '../database.js';

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

function processarTemplate(template, dados) {
  const vars = {
    motorista: dados.motorista || '',
    primeiro_nome: (dados.motorista || '').split(' ')[0] || '',
    lt: dados.lt || '',
    origem: dados.origem || '',
    destino: dados.destino || '',
    eta_origem: dados.eta || '',
    cliente: dados.cliente || '',
    placa: dados.placa || '',
    placa2: dados.placa2 || dados.placa || '',
    id_3zx: dados.id_3zx || '',
    telefone: dados.telefone || '',
    eta_destino: dados.eta_destino || '',
    data: dados.eta || '',
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
          { headers: { apikey: apiKey } }
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
