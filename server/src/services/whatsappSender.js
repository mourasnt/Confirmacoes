import axios from 'axios';
import { obterConfiguracao, jaFoiEnviado, gerarHash, registrarEnvio } from '../database.js';

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
    id_3zx: dados.id || '',
    telefone: dados.telefone || '',
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
  if (enviando) {
    throw new Error('Já existe um envio em andamento');
  }

  enviando = true;
  const resultados = { enviados: 0, pulados: 0, erros: [] };

  try {
    const apiUrl = (obterConfiguracao('evolution_api_url', process.env.EVOLUTION_API_URL || 'http://evolution_api:8080')).replace(/\/$/, '');
    const apiKey = obterConfiguracao('evolution_api_key', process.env.EVOLUTION_API_KEY || '');

    for (const row of registros) {
      try {
        const hash = gerarHash(row.id || '', row.motorista || '', row.origem || '', row.destino || '', row.eta || '');
        const jaEnviado = jaFoiEnviado(hash);

        if (jaEnviado) {
          resultados.pulados++;
          continue;
        }

        const mensagem = processarTemplate(templateConteudo, row);
        const telefone = limparTelefone(row.telefone || '');

        if (!telefone || telefone.length < 12) {
          resultados.erros.push({ id: row.id, erro: `Telefone inválido: ${row.telefone}` });
          continue;
        }

        await axios.post(
          `${apiUrl}/message/sendText/${instancia}`,
          {
            number: telefone,
            textMessage: { text: mensagem },
            delay: 1200,
            linkPreview: false,
          },
          { headers: { apikey: apiKey } }
        );

        registrarEnvio(hash, row.id || '', row.motorista || '', row.origem || '', row.destino || '', row.eta || '', telefone);
        resultados.enviados++;

        if (registros.length > 1) {
          await sleep(randomDelay(5000, 12000));
        }
      } catch (err) {
        resultados.erros.push({ id: row.id || 'unknown', erro: err.message });
      }
    }
  } finally {
    enviando = false;
  }

  return resultados;
}
