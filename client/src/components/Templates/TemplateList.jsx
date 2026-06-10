import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchTemplates, deleteTemplate } from '../../services/api.js';
import { useToast } from '../../context/ToastContext.jsx';

export default function TemplateList() {
  const toast = useToast();
  const [templates, setTemplates] = useState([]);

  const load = async () => {
    try {
      setTemplates(await fetchTemplates());
    } catch {
      toast('Erro ao carregar templates', 'error');
    }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id) => {
    if (!confirm('Excluir template?')) return;
    try {
      await deleteTemplate(id);
      toast('Template excluído', 'success');
      load();
    } catch {
      toast('Erro ao excluir', 'error');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Templates</h1>
        <Link
          to="/templates/novo"
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
        >
          Novo Template
        </Link>
      </div>

      <div className="grid gap-4">
        {templates.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <p className="text-slate-400">Nenhum template cadastrado</p>
          </div>
        )}
        {templates.map((tpl) => (
          <div key={tpl.id} className="bg-white rounded-xl shadow-sm p-5">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-slate-800">{tpl.nome}</h3>
                {tpl.descricao && (
                  <p className="text-sm text-slate-400 mt-0.5">{tpl.descricao}</p>
                )}
              </div>
              <div className="flex gap-2">
                <Link
                  to={`/templates/${tpl.id}/editar`}
                  className="px-3 py-1.5 text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                >
                  Editar
                </Link>
                <button
                  onClick={() => handleDelete(tpl.id)}
                  className="px-3 py-1.5 text-sm text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  Excluir
                </button>
              </div>
            </div>
            <pre className="mt-3 text-sm text-slate-600 bg-slate-50 rounded-lg p-3 whitespace-pre-wrap font-sans">
              {tpl.conteudo}
            </pre>
          </div>
        ))}
      </div>
    </div>
  );
}
