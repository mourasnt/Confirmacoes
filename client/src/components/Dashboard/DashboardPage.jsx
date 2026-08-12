import { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchData, fetchInstances, fetchTemplates, sendBatch } from '../../services/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import StatsCards from './StatsCards.jsx';
import DataTable from './DataTable.jsx';
import SendOverlay from './SendOverlay.jsx';

export default function DashboardPage() {
  const toast = useToast();
  const [data, setData] = useState([]);
  const [selected, setSelected] = useState([]);
  const [instances, setInstances] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedInstance, setSelectedInstance] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState(null);

  useEffect(() => {
    fetchInstances().then(setInstances).catch(() => {});
    fetchTemplates().then(setTemplates).catch(() => {});
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchData(startDate, endDate);
      setData(result);
      setSelected([]);
    } catch (err) {
      toast(err.response?.data?.error || 'Erro ao carregar dados', 'error');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, toast]);

  const statusOptions = useMemo(() => {
    const set = new Set();
    for (const d of data) {
      const s = (d.status || '').trim();
      if (s) set.add(s);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [data]);

  const filteredData = useMemo(() => {
    if (!selectedStatus) return data;
    return data.filter((d) => (d.status || '') === selectedStatus);
  }, [data, selectedStatus]);

  const stats = {
    total: filteredData.length,
    enviados: 0,
    pendentes: filteredData.length,
    selecionados: selected.length,
  };

  const handleToggle = (uid) => {
    setSelected((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  const handleStatusChange = (e) => {
    setSelectedStatus(e.target.value);
    setSelected([]);
  };

  const handleSelectAll = () => {
    const filteredUids = filteredData.map((d) => d.uid);
    const allSelected = filteredUids.length > 0 && filteredUids.every((u) => selected.includes(u));
    if (allSelected) {
      setSelected((prev) => prev.filter((u) => !filteredUids.includes(u)));
    } else {
      setSelected((prev) => Array.from(new Set([...prev, ...filteredUids])));
    }
  };

  const handleSend = async () => {
    if (!selectedInstance) return toast('Selecione uma instância', 'error');
    if (!selectedTemplate) return toast('Selecione um template', 'error');
    if (selected.length === 0) return toast('Selecione ao menos um registro', 'error');

    const registros = data.filter((d) => selected.includes(d.uid));
    setSending(true);
    setSendResult(null);

    try {
      const result = await sendBatch(registros, selectedTemplate, selectedInstance);
      setSendResult(result);
      if (result.enviados > 0) {
        toast(`${result.enviados} mensagens enviadas com sucesso!`, 'success');
      }
    } catch (err) {
      setSendResult({ enviados: 0, pulados: 0, erros: [{ id: 'api', erro: err.response?.data?.error || err.message }] });
      toast('Erro ao enviar mensagens', 'error');
    } finally {
      setSending(false);
    }
  };

  const handleCloseOverlay = () => {
    setSending(false);
    setSendResult(null);
  };

  const handleApplyFilter = () => {
    loadData();
  };

  const handleClearFilter = () => {
    setStartDate('');
    setEndDate('');
    setSelectedStatus('');
    loadData();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
        <button
          onClick={loadData}
          disabled={loading}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors text-sm font-medium"
        >
          {loading ? 'Carregando...' : 'Recarregar Dados'}
        </button>
      </div>

      <StatsCards stats={stats} />

      <div className="bg-white rounded-xl shadow-sm p-4 mb-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1" htmlFor="startDate">Data/Hora Início</label>
            <input
              id="startDate"
              type="datetime-local"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 h-11 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1" htmlFor="endDate">Data/Hora Fim</label>
            <input
              id="endDate"
              type="datetime-local"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 h-11 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1" htmlFor="status">Status</label>
            <select
              id="status"
              value={selectedStatus}
              onChange={handleStatusChange}
              className="w-full px-3 py-2 h-11 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
            >
              <option value="">Todos</option>
              {statusOptions.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Instância</label>
            <select
              value={selectedInstance}
              onChange={(e) => setSelectedInstance(e.target.value)}
              className="w-full px-3 py-2 h-11 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
            >
              <option value="">Selecione...</option>
              {instances.map((inst) => (
                <option key={inst.name} value={inst.name}>
                  {inst.connectionStatus === 'open' ? '🟢 ' : '🔴 '}{inst.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Template</label>
            <select
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
              className="w-full px-3 py-2 h-11 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
            >
              <option value="">Selecione...</option>
              {templates.map((tpl) => (
                <option key={tpl.id} value={tpl.id}>
                  {tpl.nome}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            onClick={handleApplyFilter}
            disabled={loading}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors text-sm font-medium"
          >
            {loading ? 'Aplicando...' : 'Aplicar Filtro'}
          </button>
          <button
            onClick={handleClearFilter}
            disabled={loading}
            className="px-4 py-2 bg-white text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors text-sm font-medium"
          >
            Limpar Filtro
          </button>
          <p
            aria-live="polite"
            className="text-sm text-slate-500"
            role="status"
          >
            {loading
              ? 'Carregando registros...'
              : `${filteredData.length} registro${filteredData.length !== 1 ? 's' : ''} exibido${filteredData.length !== 1 ? 's' : ''}${selectedStatus ? ` · status: ${selectedStatus}` : ''}`}
          </p>
        </div>

        {selected.length > 0 && (
          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <p className="text-sm text-slate-500">
              {selected.length} registro{selected.length !== 1 ? 's' : ''} selecionado{selected.length !== 1 ? 's' : ''}
            </p>
            <button
              onClick={handleSend}
              disabled={sending}
              className="px-6 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-50 transition-colors text-sm font-medium"
            >
              {sending ? 'Enviando...' : `Enviar (${selected.length})`}
            </button>
          </div>
        )}
      </div>

      <DataTable
        data={filteredData}
        selected={selected}
        onToggle={handleToggle}
        onSelectAll={handleSelectAll}
      />

      <SendOverlay open={sending || !!sendResult} result={sendResult} onClose={handleCloseOverlay} />
    </div>
  );
}
