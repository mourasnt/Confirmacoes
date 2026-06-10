import { Router } from 'express';
import { z } from 'zod';
import { obterTemplates, obterTemplate, salvarTemplate, atualizarTemplate, excluirTemplate } from '../database.js';

const router = Router();

const templateSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  conteudo: z.string().min(1, 'Conteúdo é obrigatório'),
  descricao: z.string().optional(),
});

router.get('/', (req, res, next) => {
  try {
    const templates = obterTemplates();
    res.json(templates);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', (req, res, next) => {
  try {
    const template = obterTemplate(req.params.id);
    if (!template) return res.status(404).json({ error: 'Template não encontrado' });
    res.json(template);
  } catch (err) {
    next(err);
  }
});

router.post('/', (req, res, next) => {
  try {
    const { nome, conteudo, descricao } = templateSchema.parse(req.body);
    const id = salvarTemplate(nome, conteudo, descricao);
    res.status(201).json({ id });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
    next(err);
  }
});

router.put('/:id', (req, res, next) => {
  try {
    const { nome, conteudo, descricao } = templateSchema.parse(req.body);
    atualizarTemplate(req.params.id, nome, conteudo, descricao);
    res.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
    next(err);
  }
});

router.delete('/:id', (req, res, next) => {
  try {
    excluirTemplate(req.params.id);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
