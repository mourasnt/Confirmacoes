import { Router } from 'express';
import axios from 'axios';
import { obterConfiguracao } from '../database.js';

const router = Router();

function getEvolutionConfig() {
  const url = (obterConfiguracao('evolution_api_url', process.env.EVOLUTION_API_URL || 'http://evolution_api:8080')).replace(/\/$/, '');
  const key = obterConfiguracao('evolution_api_key', process.env.EVOLUTION_API_KEY || '');
  return { url, key };
}

router.get('/', async (req, res, next) => {
  try {
    const { url, key } = getEvolutionConfig();
    const { data } = await axios.get(`${url}/instance/fetchInstances`, {
      headers: { apikey: key },
    });
    const instances = (Array.isArray(data) ? data : []).map((i) => {
      const inst = i.instance || i;
      return {
        name: inst.instanceName || inst.name,
        connectionStatus: inst.connectionStatus?.state || inst.connectionStatus || inst.status,
      };
    }).filter((i) => i.name !== 'Spots');
    res.json(instances);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { instanceName, number } = req.body;
    const { url, key } = getEvolutionConfig();

    const { data } = await axios.post(
      `${url}/instance/create`,
      { instanceName, number, qrcode: true, integration: 'WHATSAPP-BAILEYS' },
      { headers: { apikey: key } }
    );
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.post('/qrcode', async (req, res, next) => {
  try {
    const { instancia } = req.body;
    const { url, key } = getEvolutionConfig();

    const { data } = await axios.get(`${url}/instance/connect/${encodeURIComponent(instancia)}`, {
      headers: { apikey: key },
    });
    res.json(data);
  } catch (err) {
    next(err);
  }
});

export default router;
