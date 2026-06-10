import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchTemplate, createTemplate, updateTemplate } from '../../services/api.js';
import { useToast } from '../../context/ToastContext.jsx';

const variaveis = [
  'motorista', 'primeiro_nome', 'lt', 'origem', 'destino',
  'eta_origem', 'cliente', 'placa', 'placa2', 'id_3zx',
  'telefone', 'data', 'n_carga', 'operacao',
];

const varColors = {
  motorista: 'text-blue-600 bg-blue-50',
  primeiro_nome: 'text-sky-600 bg-sky-50',
  lt: 'text-emerald-600 bg-emerald-50',
  origem: 'text-violet-600 bg-violet-50',
  destino: 'text-fuchsia-600 bg-fuchsia-50',
  eta_origem: 'text-amber-600 bg-amber-50',
  cliente: 'text-rose-600 bg-rose-50',
  placa: 'text-cyan-600 bg-cyan-50',
  placa2: 'text-cyan-600 bg-cyan-50',
  id_3zx: 'text-slate-600 bg-slate-100',
  telefone: 'text-teal-600 bg-teal-50',
  data: 'text-amber-600 bg-amber-50',
  n_carga: 'text-emerald-600 bg-emerald-50',
  operacao: 'text-orange-600 bg-orange-50',
};

function renderPreviewSafe(text) {
  const parts = [];
  let lastIndex = 0;
  const regex = /\{(\w+)\}/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', value: text.slice(lastIndex, match.index) });
    }
    const varName = match[1];
    const color = varColors[varName] || 'text-gray-600 bg-gray-100';
    parts.push({ type: 'var', value: varName, color });
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push({ type: 'text', value: text.slice(lastIndex) });
  }

  return parts;
}

export default function TemplateForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const isEditing = !!id;

  const [nome, setNome] = useState('');
  const [conteudo, setConteudo] = useState('');
  const [descricao, setDescricao] = useState('');

  useEffect(() => {
    if (id) {
      fetchTemplate(id).then((tpl) => {
        setNome(tpl.nome);
        setConteudo(tpl.conteudo);
        setDescricao(tpl.descricao || '');
      }).catch(() => toast('Erro ao carregar template', 'error'));
    }
  }, [id]);

  const handleSave = async () => {
    if (!nome || !conteudo) return toast('Preencha nome e conteúdo', 'error');
    try {
      if (isEditing) {
        await updateTemplate(id, { nome, conteudo, descricao });
        toast('Template atualizado', 'success');
      } else {
        await createTemplate({ nome, conteudo, descricao });
        toast('Template criado', 'success');
      }
      navigate('/templates');
    } catch (err) {
      toast(err.response?.data?.error?.[0]?.message || 'Erro ao salvar', 'error');
    }
  };

  const insertVar = (v) => {
    setConteudo((prev) => prev + `{${v}}`);
  };

  const previewParts = renderPreviewSafe(conteudo);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-6">
        {isEditing ? 'Editar Template' : 'Novo Template'}
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Nome</label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">Variáveis</label>
            <div className="flex flex-wrap gap-1.5">
              {variaveis.map((v) => (
                <button
                  key={v}
                  onClick={() => insertVar(v)}
                  className="px-2 py-1 text-xs font-medium bg-slate-100 text-slate-600 rounded-md hover:bg-indigo-100 hover:text-indigo-700 transition-colors"
                >
                  {'{'}{v}{'}'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Conteúdo</label>
            <textarea
              value={conteudo}
              onChange={(e) => setConteudo(e.target.value)}
              rows={10}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Descrição</label>
            <input
              type="text"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <button
            onClick={handleSave}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
          >
            Salvar
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-600 mb-2">Preview</label>
          <div className="bg-white rounded-xl shadow-sm p-4 min-h-[200px] text-sm leading-relaxed whitespace-pre-wrap">
            {previewParts.map((part, i) =>
              part.type === 'var' ? (
                <span key={i} className={`${part.color} px-1 rounded text-xs font-medium`}>
                  {part.value}
                </span>
              ) : (
                <span key={i}>{part.value}</span>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
