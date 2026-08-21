import { Router } from 'express';
import { z } from 'zod';
import { obterHistorico, obterTemplate } from '../database.js';
import { enviarConfirmacoes } from '../services/whatsappSender.js';

const router = Router();

router.get('/history', (req, res, next) => {
  try {
    const historico = obterHistorico();
    res.json(historico);
  } catch (err) {
    next(err);
  }
});

const batchSchema = z.object({
  registros: z.array(z.record(z.any())).min(1, 'Selecione ao menos um registro'),
  template_id: z.union([z.string(), z.number()]),
  instancia: z.string().min(1, 'Instância é obrigatória'),
});

router.post('/send-batch', async (req, res, next) => {
  try {
    const { registros, template_id, instancia } = batchSchema.parse(req.body);

    const template = obterTemplate(template_id);
    if (!template) {
      return res.status(404).json({ error: 'Template não encontrado' });
    }

    const resultado = await enviarConfirmacoes(registros, template.conteudo, instancia);
    res.json(resultado);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.issues });
    next(err);
  }
});

export default router;
