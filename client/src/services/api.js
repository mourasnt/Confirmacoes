import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

export async function fetchInstances() {
  const { data } = await api.get('/instances');
  return data;
}

export async function createInstance(instanceName, number) {
  const { data } = await api.post('/instances', { instanceName, number });
  return data;
}

export async function fetchQRCode(instancia) {
  const { data } = await api.post('/instances/qrcode', { instancia });
  return data;
}

export async function fetchTemplates() {
  const { data } = await api.get('/templates');
  return data;
}

export async function fetchTemplate(id) {
  const { data } = await api.get(`/templates/${id}`);
  return data;
}

export async function createTemplate(template) {
  const { data } = await api.post('/templates', template);
  return data;
}

export async function updateTemplate(id, template) {
  const { data } = await api.put(`/templates/${id}`, template);
  return data;
}

export async function deleteTemplate(id) {
  const { data } = await api.delete(`/templates/${id}`);
  return data;
}

export async function sendBatch(registros, template_id, instancia) {
  const { data } = await api.post('/messages/send-batch', { registros, template_id, instancia });
  return data;
}

export async function fetchHistory() {
  const { data } = await api.get('/messages/history');
  return data;
}

export async function fetchData(start, end) {
  const params = {};
  if (start) params.start = start;
  if (end) params.end = end;
  const { data } = await api.get('/data', { params });
  return data;
}

export async function fetchSheets() {
  const { data } = await api.get('/data/sheets');
  return data;
}

export async function configLogin(senha) {
  const { data } = await api.post('/config/login', { senha });
  return data;
}

export async function configLogout() {
  const { data } = await api.post('/config/logout');
  return data;
}

export async function fetchConfig() {
  const { data } = await api.get('/config');
  return data;
}

export async function updateConfig(config) {
  const { data } = await api.put('/config', config);
  return data;
}

export default api;
