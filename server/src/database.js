import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let db;

function getDbPath() {
  if (process.env.DATABASE_PATH) return process.env.DATABASE_PATH;

  const candidates = [
    join('/app', 'data', 'confirmacoes.db'),
    join(dirname(__dirname), 'data', 'confirmacoes.db'),
    join(__dirname, '..', 'data', 'confirmacoes.db'),
    join('/tmp', 'confirmacoes.db'),
  ];
  for (const p of candidates) {
    const dir = dirname(p);
    if (existsSync(dir) || (mkdirSync(dir, { recursive: true }), true)) {
      return p;
    }
  }
}

export function getDB() {
  return db;
}

export function initDB() {
  const dbPath = getDbPath();
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 5000');
  console.log(`Database: ${dbPath}`);

  db.exec(`
    CREATE TABLE IF NOT EXISTS confirmacoes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hash_confirmacao TEXT UNIQUE NOT NULL,
      id_3zx TEXT NOT NULL,
      motorista TEXT NOT NULL,
      origem TEXT NOT NULL,
      destino TEXT NOT NULL,
      eta_origem TEXT NOT NULL,
      eta_destino TEXT NOT NULL,
      telefone TEXT NOT NULL,
      data_envio DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT UNIQUE NOT NULL,
      conteudo TEXT NOT NULL,
      descricao TEXT,
      data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP,
      data_modificacao DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS configuracoes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chave TEXT UNIQUE NOT NULL,
      valor TEXT NOT NULL,
      data_modificacao DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const tableInfo = db.prepare("PRAGMA table_info('confirmacoes')").all();
  if (!tableInfo.some(col => col.name === 'eta_destino')) {
    db.exec("ALTER TABLE confirmacoes ADD COLUMN eta_destino TEXT NOT NULL DEFAULT ''");
  }

  seedDefaults();
  syncEnvConfig();
}

function syncEnvConfig() {
  const envMappings = {
    evolution_api_url: process.env.EVOLUTION_API_URL,
    evolution_api_key: process.env.EVOLUTION_API_KEY,
    google_spreadsheet_id: process.env.GOOGLE_SPREADSHEET_ID,
    google_sheet_name: process.env.GOOGLE_SHEET_NAME,
    google_header_row: process.env.GOOGLE_HEADER_ROW,
    linha_inicio_dados: process.env.GOOGLE_DATA_START_ROW,
  };
  for (const [chave, valor] of Object.entries(envMappings)) {
    if (!valor) continue;
    db.prepare("INSERT INTO configuracoes (chave, valor) VALUES (?, ?) ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor").run(chave, valor);
  }
}

function seedDefaults() {
  const row = db.prepare("SELECT valor FROM configuracoes WHERE chave = 'templates_padrao_inseridos'").get();
  if (row) return;

  const defaultTemplates = [
    { nome: 'Básico', conteudo: 'Olá {primeiro_nome}! Tudo certo para carregar a carga {lt} em {origem}?', descricao: 'Template simples e direto' },
    { nome: 'Completo', conteudo: 'Olá {motorista}!\n\nConfirmação de agendamento:\n📦 Carga: {lt}\n🚚 Cliente: {cliente}\n📍 Origem: {origem}\n📍 Destino: {destino}\n⏰ Horário: {eta_origem}\n🚛 Veículo: {placa}\n\nTudo certo para o carregamento?', descricao: 'Template com informações completas' },
    { nome: 'Profissional', conteudo: 'Prezado(a) {motorista},\n\nSolicitamos confirmação do agendamento:\n\nID: {id_3zx}\nCarga: {lt}\nCliente: {cliente}\nOrigem: {origem}\nHorário: {eta_origem}\nDestino: {destino}\nVeículo: {placa}\n\nPor favor, confirme sua disponibilidade.\n\nAtenciosamente.', descricao: 'Template formal e profissional' },
  ];

  const defaultConfigs = [
    { chave: 'config_senha', valor: bcrypt.hashSync(process.env.CONFIG_SENHA || 'admin123', 10) },
    { chave: 'google_spreadsheet_id', valor: process.env.GOOGLE_SPREADSHEET_ID || '' },
    { chave: 'google_sheet_name', valor: process.env.GOOGLE_SHEET_NAME || 'Página1' },
    { chave: 'google_header_row', valor: process.env.GOOGLE_HEADER_ROW || '1' },
    { chave: 'linha_inicio_dados', valor: process.env.GOOGLE_DATA_START_ROW || '2' },
    { chave: 'evolution_api_url', valor: process.env.EVOLUTION_API_URL || '' },
    { chave: 'evolution_api_key', valor: process.env.EVOLUTION_API_KEY || '' },
    { chave: 'coluna_id', valor: process.env.COLUNA_ID || 'A' },
    { chave: 'coluna_lt', valor: process.env.COLUNA_LT || 'B' },
    { chave: 'coluna_cliente', valor: process.env.COLUNA_CLIENTE || 'C' },
    { chave: 'coluna_motorista', valor: process.env.COLUNA_MOTORISTA || 'D' },
    { chave: 'coluna_telefone', valor: process.env.COLUNA_TELEFONE || 'E' },
    { chave: 'coluna_origem', valor: process.env.COLUNA_ORIGEM || 'F' },
    { chave: 'coluna_destino', valor: process.env.COLUNA_DESTINO || 'G' },
    { chave: 'coluna_eta', valor: process.env.COLUNA_ETA || 'H' },
    { chave: 'coluna_placa', valor: process.env.COLUNA_PLACA || 'I' },
    { chave: 'coluna_placa2', valor: process.env.COLUNA_PLACA2 || 'J' },
    { chave: 'coluna_eta_destino', valor: process.env.COLUNA_ETA_DESTINO || 'AB' },
    { chave: 'templates_padrao_inseridos', valor: '1' },
  ];

  const insertTemplate = db.prepare("INSERT INTO templates (nome, conteudo, descricao) VALUES (?, ?, ?)");
  const insertConfig = db.prepare("INSERT OR IGNORE INTO configuracoes (chave, valor) VALUES (?, ?)");

  const seedTransaction = db.transaction(() => {
    for (const t of defaultTemplates) {
      insertTemplate.run(t.nome, t.conteudo, t.descricao);
    }
    for (const c of defaultConfigs) {
      insertConfig.run(c.chave, c.valor);
    }
  });

  seedTransaction();
}

export function gerarHash(id3zx, motorista, origem, destino, etaOrigem, etaDestino) {
  return crypto.createHash('sha256').update(`${id3zx}|${motorista}|${origem}|${destino}|${etaOrigem}|${etaDestino}`).digest('hex');
}

export function jaFoiEnviado(hash) {
  const row = db.prepare("SELECT id FROM confirmacoes WHERE hash_confirmacao = ?").get(hash);
  return !!row;
}

export function registrarEnvio(hash, id3zx, motorista, origem, destino, etaOrigem, etaDestino, telefone) {
  db.prepare(
    "INSERT INTO confirmacoes (hash_confirmacao, id_3zx, motorista, origem, destino, eta_origem, eta_destino, telefone) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(hash, id3zx, motorista, origem, destino, etaOrigem, etaDestino, telefone);
}

export function obterHistorico() {
  return db.prepare("SELECT * FROM confirmacoes ORDER BY data_envio DESC").all();
}

export function obterTemplates() {
  return db.prepare("SELECT * FROM templates ORDER BY data_modificacao DESC").all();
}

export function obterTemplate(id) {
  return db.prepare("SELECT * FROM templates WHERE id = ?").get(id);
}

export function salvarTemplate(nome, conteudo, descricao) {
  const result = db.prepare(
    "INSERT INTO templates (nome, conteudo, descricao) VALUES (?, ?, ?)"
  ).run(nome, conteudo, descricao || null);
  return result.lastInsertRowid;
}

export function atualizarTemplate(id, nome, conteudo, descricao) {
  db.prepare(
    "UPDATE templates SET nome = ?, conteudo = ?, descricao = ?, data_modificacao = CURRENT_TIMESTAMP WHERE id = ?"
  ).run(nome, conteudo, descricao || null, id);
}

export function excluirTemplate(id) {
  db.prepare("DELETE FROM templates WHERE id = ?").run(id);
}

export function salvarConfiguracao(chave, valor) {
  db.prepare(
    "INSERT INTO configuracoes (chave, valor) VALUES (?, ?) ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor, data_modificacao = CURRENT_TIMESTAMP"
  ).run(chave, String(valor));
}

export function obterConfiguracao(chave, padrao = null) {
  const row = db.prepare("SELECT valor FROM configuracoes WHERE chave = ?").get(chave);
  return row ? row.valor : padrao;
}

export function obterTodasConfiguracoes() {
  const rows = db.prepare("SELECT chave, valor FROM configuracoes").all();
  const config = {};
  for (const r of rows) config[r.chave] = r.valor;
  return config;
}
