import { Router } from 'express';
import { obterConfiguracao, obterTodasConfiguracoes } from '../database.js';
import { GoogleSheetsReader } from '../services/googleSheets.js';

const router = Router();

router.get('/sheets', async (req, res, next) => {
  try {
    const spreadsheetId = obterConfiguracao('google_spreadsheet_id') || process.env.GOOGLE_SPREADSHEET_ID;
    if (!spreadsheetId) return res.json([]);
    const reader = new GoogleSheetsReader(spreadsheetId);
    const abas = await reader.obterAbas();
    res.json(abas);
  } catch (err) {
    next(err);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const config = obterTodasConfiguracoes();
    const spreadsheetId = config.google_spreadsheet_id || process.env.GOOGLE_SPREADSHEET_ID;
    const sheetName = config.google_sheet_name || process.env.GOOGLE_SHEET_NAME || 'Página1';
    const headerRow = parseInt(config.google_header_row || process.env.GOOGLE_HEADER_ROW || '1', 10);
    const dataStartRow = parseInt(config.linha_inicio_dados || process.env.GOOGLE_DATA_START_ROW || '2', 10);
    const { start, end } = req.query;

    if (!spreadsheetId) {
      return res.status(400).json({ error: 'Google Spreadsheet ID não configurado' });
    }

    const reader = new GoogleSheetsReader(spreadsheetId);

    const colMap = {
      id: config.coluna_id || process.env.COLUNA_ID || 'A',
      lt: config.coluna_lt || process.env.COLUNA_LT || 'B',
      cliente: config.coluna_cliente || process.env.COLUNA_CLIENTE || 'C',
      motorista: config.coluna_motorista || process.env.COLUNA_MOTORISTA || 'D',
      telefone: config.coluna_telefone || process.env.COLUNA_TELEFONE || 'E',
      origem: config.coluna_origem || process.env.COLUNA_ORIGEM || 'F',
      destino: config.coluna_destino || process.env.COLUNA_DESTINO || 'G',
      eta: config.coluna_eta || process.env.COLUNA_ETA || 'H',
      placa: config.coluna_placa || process.env.COLUNA_PLACA || 'I',
      placa2: config.coluna_placa2 || process.env.COLUNA_PLACA2 || 'J',
    };

    const dados = await reader.obterDadosConfirmacao(
      sheetName, headerRow, dataStartRow, colMap, start, end
    );

    res.json(dados);
  } catch (err) {
    next(err);
  }
});

export default router;
