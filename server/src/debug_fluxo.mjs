// =====================================================================
// DIAGNOSTICO COMPLETO DO FLUXO: Planilha -> Dados -> Template -> Mensagem
// Usa: planilha real, banco real, configuracoes reais e codigo real
// =====================================================================
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import dotenv from 'dotenv';
import Database from 'better-sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const raizProjeto = resolve(__dirname, '..', '..');

// Carrega .env da raiz (mesmo arquivo usado pelo docker-compose)
dotenv.config({ path: join(raizProjeto, '.env') });

console.log('='.repeat(70));
console.log('DIAGNOSTICO DO FLUXO DE ENVIO - DADOS REAIS');
console.log('='.repeat(70));
console.log(`Raiz do projeto: ${raizProjeto}`);
console.log(`Spreadsheet ID (env): ${process.env.GOOGLE_SPREADSHEET_ID}`);
console.log(`Aba (env): ${process.env.GOOGLE_SHEET_NAME}`);
console.log(`COLUNA_ETA (env): ${process.env.COLUNA_ETA}`);
console.log(`COLUNA_ETA_ORIGEM (env): ${process.env.COLUNA_ETA_ORIGEM || '(nao definida)'}`);
console.log(`COLUNA_ETA_DESTINO (env): ${process.env.COLUNA_ETA_DESTINO}`);

// ---------------------------------------------------------------------
// ETAPA 1: Ler configuracoes reais do banco de dados
// ---------------------------------------------------------------------
console.log('\n' + '='.repeat(70));
console.log('ETAPA 1: CONFIGURACOES REAIS (banco de dados)');
console.log('='.repeat(70));

const dbPath = join(raizProjeto, 'data', 'confirmacoes.db');
console.log(`Banco: ${dbPath} (existe: ${existsSync(dbPath)})`);

if (!existsSync(dbPath)) {
  console.log('ERRO: banco de dados nao encontrado!');
  process.exit(1);
}

const db = new Database(dbPath, { readonly: true });
const configRows = db.prepare("SELECT chave, valor FROM configuracoes").all();
const config = {};
for (const r of configRows) config[r.chave] = r.valor;

console.log('\nConfiguracoes relevantes do banco:');
for (const chave of ['google_spreadsheet_id', 'google_sheet_name', 'google_header_row', 'linha_inicio_dados',
  'coluna_id', 'coluna_lt', 'coluna_cliente', 'coluna_motorista', 'coluna_telefone',
  'coluna_origem', 'coluna_destino', 'coluna_eta', 'coluna_eta_origem', 'coluna_eta_destino',
  'coluna_placa', 'coluna_placa2']) {
  console.log(`  ${chave} = ${JSON.stringify(config[chave])}`);
}

// ---------------------------------------------------------------------
// ETAPA 2: Templates reais do banco
// ---------------------------------------------------------------------
console.log('\n' + '='.repeat(70));
console.log('ETAPA 2: TEMPLATES REAIS (banco de dados)');
console.log('='.repeat(70));

const templates = db.prepare("SELECT id, nome, conteudo FROM templates").all();
console.log(`Total de templates: ${templates.length}`);
for (const t of templates) {
  console.log(`\n--- Template #${t.id}: ${t.nome} ---`);
  console.log(JSON.stringify(t.conteudo));
  const vars = [...t.conteudo.matchAll(/\{(\w+)\}/g)].map(m => m[1]);
  console.log(`Variaveis usadas: ${vars.join(', ')}`);
}

db.close();

// ---------------------------------------------------------------------
// ETAPA 3: Montar colMap EXATAMENTE como a rota /api/data faz
// ---------------------------------------------------------------------
console.log('\n' + '='.repeat(70));
console.log('ETAPA 3: COLMAP (igual a rota /api/data)');
console.log('='.repeat(70));

const colMap = {
  id_3zx: config.coluna_id || process.env.COLUNA_ID || 'A',
  lt: config.coluna_lt || process.env.COLUNA_LT || 'B',
  cliente: config.coluna_cliente || process.env.COLUNA_CLIENTE || 'C',
  motorista: config.coluna_motorista || process.env.COLUNA_MOTORISTA || 'D',
  telefone: config.coluna_telefone || process.env.COLUNA_TELEFONE || 'E',
  origem: config.coluna_origem || process.env.COLUNA_ORIGEM || 'F',
  destino: config.coluna_destino || process.env.COLUNA_DESTINO || 'G',
  eta: config.coluna_eta || process.env.COLUNA_ETA || 'T',
  eta_origem: config.coluna_eta_origem || process.env.COLUNA_ETA_ORIGEM || 'T',
  eta_destino: config.coluna_eta_destino || process.env.COLUNA_ETA_DESTINO || 'AB',
  placa: config.coluna_placa || process.env.COLUNA_PLACA || 'I',
  placa2: config.coluna_placa2 || process.env.COLUNA_PLACA2 || 'J',
};

console.log('colMap final:', JSON.stringify(colMap, null, 2));

// ---------------------------------------------------------------------
// ETAPA 4: Ler a planilha REAL - valores brutos das colunas de data
// ---------------------------------------------------------------------
console.log('\n' + '='.repeat(70));
console.log('ETAPA 4: PLANILHA REAL - VALORES BRUTOS (colunas S a AD)');
console.log('='.repeat(70));

const { GoogleSheetsReader } = await import('./services/googleSheets.js');
const spreadsheetId = config.google_spreadsheet_id || process.env.GOOGLE_SPREADSHEET_ID;
const sheetName = config.google_sheet_name || process.env.GOOGLE_SHEET_NAME || 'Página1';
const headerRow = parseInt(config.google_header_row || process.env.GOOGLE_HEADER_ROW || '1', 10);
const dataStartRow = parseInt(config.linha_inicio_dados || process.env.GOOGLE_DATA_START_ROW || '2', 10);

console.log(`Planilha: ${spreadsheetId} | Aba: ${sheetName} | Header: linha ${headerRow} | Dados: linha ${dataStartRow}`);

const reader = new GoogleSheetsReader(spreadsheetId);
await reader._authenticate();

// Leitura BRUTA das colunas S:AD (inclui T e AB) para ver o que existe realmente
try {
  const brutoRes = await reader.client.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!S${headerRow}:AD${dataStartRow + 8}`,
  });
  const bruto = brutoRes.data.values || [];
  console.log('\nValores BRUTOS da API Google (S=19, T=20, ..., AB=28):');
  bruto.forEach((linha, i) => {
    const cols = ['S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'AA', 'AB', 'AC', 'AD'];
    const display = cols.map((c, j) => `${c}=${JSON.stringify(linha[j] ?? null)}`).join(' | ');
    console.log(`  Linha ${headerRow + i}: ${display}`);
  });
} catch (e) {
  console.log('Erro na leitura bruta:', e.message);
}

// ---------------------------------------------------------------------
// ETAPA 5: Rodar o fluxo REAL completo (obterDadosConfirmacao)
// ---------------------------------------------------------------------
console.log('\n' + '='.repeat(70));
console.log('ETAPA 5: FLUXO REAL COMPLETO (obterDadosConfirmacao)');
console.log('='.repeat(70));

const dadosReais = await reader.obterDadosConfirmacao(sheetName, headerRow, dataStartRow, colMap, null, null);
console.log(`\nTotal de registros retornados pelo fluxo real: ${dadosReais.length}`);

if (dadosReais.length === 0) {
  console.log('ERRO: nenhum registro retornado! Verifique telefone/colunas.');
  process.exit(1);
}

console.log('\nPrimeiros 5 registros (campos de data):');
dadosReais.slice(0, 5).forEach((r, i) => {
  console.log(`  [${i}] id=${JSON.stringify(r.id_3zx)} | eta=${JSON.stringify(r.eta)} | eta_origem=${JSON.stringify(r.eta_origem)} | eta_destino=${JSON.stringify(r.eta_destino)}`);
});

// ---------------------------------------------------------------------
// ETAPA 6: Processar o template REAL com os dados REAIS
// ---------------------------------------------------------------------
console.log('\n' + '='.repeat(70));
console.log('ETAPA 6: PROCESSARTEMPLATE REAL (codigo corrigido)');
console.log('='.repeat(70));

const { processarTemplate } = await import('./services/whatsappSender.js');

// Usa o template que contem {eta_origem} (o que o usuario usa)
const templateAlvo = templates.find(t => t.conteudo.includes('{eta_origem}')) || templates[0];
console.log(`Template usado no teste: #${templateAlvo.id} "${templateAlvo.nome}"`);
console.log(`Conteudo:\n${templateAlvo.conteudo}\n`);

let falhas = 0;
console.log('MENSAGENS FINAIS GERADAS (primeiras 5):');
dadosReais.slice(0, 5).forEach((r, i) => {
  const mensagem = processarTemplate(templateAlvo.conteudo, r);
  console.log(`\n--- Mensagem [${i}] (id=${r.id_3zx}) ---`);
  console.log(mensagem);
  const temHorarioVazio = /Hor[áa]rio:\s*$/m.test(mensagem);
  if (temHorarioVazio) {
    falhas++;
    console.log('>>> PROBLEMA: linha "Horario:" vazia nesta mensagem!');
  }
});

// ---------------------------------------------------------------------
// ETAPA 7: VEREDICTO
// ---------------------------------------------------------------------
console.log('\n' + '='.repeat(70));
console.log('ETAPA 7: VEREDICTO');
console.log('='.repeat(70));

const comEta = dadosReais.filter(r => r.eta && String(r.eta).trim() !== '');
const comEtaOrigem = dadosReais.filter(r => r.eta_origem && String(r.eta_origem).trim() !== '');
console.log(`Registros com valor em 'eta': ${comEta.length}/${dadosReais.length}`);
console.log(`Registros com valor em 'eta_origem': ${comEtaOrigem.length}/${dadosReais.length}`);

if (falhas > 0) {
  console.log(`\n>>> ${falhas} mensagem(ns) com horario vazio - problema de DADOS (planilha/colunas)`);
} else {
  console.log('\n>>> Todas as mensagens geradas tem horario preenchido.');
  console.log('>>> Se no WhatsApp ainda sai vazio, o servidor rodando NAO e o codigo corrigido');
  console.log('>>> (reconstrua o container: docker compose up --build -d)');
}

