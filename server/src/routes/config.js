import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { requireAuth } from '../middleware/auth.js';
import {
  obterConfiguracao,
  salvarConfiguracao,
  obterTodasConfiguracoes,
} from '../database.js';

const router = Router();

router.post('/login', async (req, res, next) => {
  try {
    const { senha } = req.body;
    if (!senha) return res.status(400).json({ error: 'Senha é obrigatória' });

    const senhaSalva = obterConfiguracao('config_senha', process.env.CONFIG_SENHA || 'admin123');
    if (!senhaSalva || !senhaSalva.startsWith('$2')) return res.status(500).json({ error: 'Erro interno: hash inválido' });

    const valida = await bcrypt.compare(senha, senhaSalva);

    if (!valida) {
      return res.status(401).json({ error: 'Senha inválida' });
    }

    req.session.configAutenticado = true;
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

router.get('/', requireAuth, (req, res, next) => {
  try {
    const config = obterTodasConfiguracoes();
    delete config.templates_padrao_inseridos;
    delete config.config_senha;
    delete config.evolution_api_key;
    res.json(config);
  } catch (err) {
    next(err);
  }
});

const configSchema = z.object({
  google_spreadsheet_id: z.string().optional(),
  google_sheet_name: z.string().optional(),
  google_header_row: z.string().optional(),
  linha_inicio_dados: z.string().optional(),
  evolution_api_url: z.string().optional(),
  evolution_send_api_url: z.string().optional(),
  evolution_api_key: z.string().optional(),
  coluna_id: z.string().optional(),
  coluna_cliente: z.string().optional(),
  coluna_origem: z.string().optional(),
  coluna_destino: z.string().optional(),
  coluna_eta: z.string().optional(),
  coluna_motorista: z.string().optional(),
  coluna_telefone: z.string().optional(),
  coluna_placa: z.string().optional(),
  coluna_placa2: z.string().optional(),
  coluna_lt: z.string().optional(),
  config_senha: z.string().optional(),
});

router.put('/', requireAuth, async (req, res, next) => {
  try {
    const data = configSchema.parse(req.body);
    for (const [chave, valor] of Object.entries(data)) {
      if (valor === undefined) continue;
      if (chave === 'config_senha') {
        const hash = await bcrypt.hash(valor, 10);
        salvarConfiguracao(chave, hash);
      } else {
        salvarConfiguracao(chave, valor);
      }
    }
    res.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
    next(err);
  }
});

export default router;
