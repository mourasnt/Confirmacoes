import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchConfig, updateConfig, configLogout } from '../../services/api.js';
import { useToast } from '../../context/ToastContext.jsx';

export default function ConfigPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchConfig()
      .then(setConfig)
      .catch(() => navigate('/config-login'))
      .finally(() => setLoading(false));
  }, [navigate]);

  const handleChange = (key, value) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateConfig(config);
      toast('Configurações salvas!', 'success');
    } catch {
      toast('Erro ao salvar', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await configLogout();
    navigate('/config-login');
  };

  if (loading) return <p className="text-slate-400">Carregando...</p>;
  if (!config) return null;

  const fields = [
    { key: 'google_spreadsheet_id', label: 'ID da Planilha', placeholder: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms' },
    { key: 'google_sheet_name', label: 'Nome da Aba', placeholder: 'Página1' },
    { key: 'google_header_row', label: 'Linha do Cabeçalho', placeholder: '1' },
    { key: 'linha_inicio_dados', label: 'Linha Início Dados', placeholder: '2' },
    { key: 'evolution_api_url', label: 'Evolution API URL', placeholder: 'http://evolution_api:8080' },
    { key: 'evolution_send_api_url', label: 'Evolution Send API URL', placeholder: 'http://5.78.121.199:8080' },
    { key: 'evolution_api_key', label: 'Evolution API Key', placeholder: '********' },
  ];

  const columnFields = [
    { key: 'coluna_id', label: 'ID' },
    { key: 'coluna_lt', label: 'LT' },
    { key: 'coluna_cliente', label: 'Cliente' },
    { key: 'coluna_motorista', label: 'Motorista' },
    { key: 'coluna_telefone', label: 'Telefone' },
    { key: 'coluna_origem', label: 'Origem' },
    { key: 'coluna_destino', label: 'Destino' },
    { key: 'coluna_eta', label: 'ETA' },
    { key: 'coluna_placa', label: 'Placa' },
    { key: 'coluna_placa2', label: 'Placa 2' },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Configurações</h1>
        <button
          onClick={handleLogout}
          className="px-3 py-1.5 text-sm text-slate-500 hover:text-red-500 transition-colors"
        >
          Sair
        </button>
      </div>

      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-slate-700 mb-4">Google Sheets</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {fields.slice(0, 4).map((f) => (
              <div key={f.key}>
                <label className="block text-xs font-medium text-slate-500 mb-1">{f.label}</label>
                <input
                  type="text"
                  value={config[f.key] || ''}
                  onChange={(e) => handleChange(f.key, e.target.value)}
                  placeholder={f.placeholder}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-slate-700 mb-4">Evolution API</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {fields.slice(4).map((f) => (
              <div key={f.key}>
                <label className="block text-xs font-medium text-slate-500 mb-1">{f.label}</label>
                <input
                  type="text"
                  value={config[f.key] || ''}
                  onChange={(e) => handleChange(f.key, e.target.value)}
                  placeholder={f.placeholder}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-slate-700 mb-4">Mapeamento de Colunas</h2>
          <p className="text-xs text-slate-400 mb-4">
            Letras das colunas da planilha (A, B, C...)
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {columnFields.map((f) => (
              <div key={f.key}>
                <label className="block text-xs font-medium text-slate-500 mb-1">{f.label}</label>
                <input
                  type="text"
                  value={config[f.key] || ''}
                  onChange={(e) => handleChange(f.key, e.target.value.toUpperCase())}
                  placeholder="A"
                  maxLength={2}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 uppercase"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-slate-700 mb-4">Senha de Acesso</h2>
          <div className="max-w-xs">
            <label className="block text-xs font-medium text-slate-500 mb-1">Nova Senha</label>
            <input
              type="password"
              value={config.config_senha || ''}
              onChange={(e) => handleChange('config_senha', e.target.value)}
              placeholder="Nova senha"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors font-medium"
        >
          {saving ? 'Salvando...' : 'Salvar Configurações'}
        </button>
      </div>
    </div>
  );
}
