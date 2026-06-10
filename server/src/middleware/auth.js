export function requireAuth(req, res, next) {
  if (req.session?.configAutenticado) return next();
  res.status(401).json({ error: 'Não autenticado' });
}
