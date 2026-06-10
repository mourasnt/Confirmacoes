import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { configLogin } from '../../services/api.js';
import { useToast } from '../../context/ToastContext.jsx';

export default function ConfigLogin() {
  const navigate = useNavigate();
  const toast = useToast();
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      await configLogin(senha);
      navigate('/config');
    } catch {
      toast('Senha inválida', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-sm mx-auto mt-12">
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h1 className="text-xl font-bold text-slate-800 mb-4">Configurações</h1>
        <p className="text-sm text-slate-400 mb-4">Digite a senha para acessar</p>
        <input
          type="password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          placeholder="Senha"
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 mb-3"
        />
        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors font-medium"
        >
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </div>
    </div>
  );
}
