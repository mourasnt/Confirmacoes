import { useState } from 'react';
import { fetchInstances, createInstance, fetchQRCode } from '../../services/api.js';
import { useToast } from '../../context/ToastContext.jsx';

export default function ConnectionPage() {
  const toast = useToast();
  const [phone, setPhone] = useState('');
  const [instanceName, setInstanceName] = useState('');
  const [qrCode, setQrCode] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleConnect = async () => {
    if (!phone) return toast('Informe o número de telefone', 'error');

    setLoading(true);
    try {
      const instances = await fetchInstances();
      const name = instanceName || `instancia_${Date.now()}`;
      const existing = instances.find((i) => i.name === name);

      if (!existing) {
        await createInstance(name, phone.replace(/\D/g, ''));
      }

      const qr = await fetchQRCode(name);
      const qrData = qr.qrcode || qr;
      setQrCode(qrData);
      setInstanceName(name);
      toast('QR Code gerado! Escaneie com o WhatsApp', 'success');
    } catch (err) {
      toast(err.response?.data?.error || 'Erro ao conectar', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Conectar WhatsApp</h1>

      <div className="max-w-lg">
        <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Nome da Instância</label>
            <input
              type="text"
              value={instanceName}
              onChange={(e) => setInstanceName(e.target.value)}
              placeholder="Deixe em branco para auto-gerar"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Número de Telefone</label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-slate-400 text-sm">+55</span>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                placeholder="11999999999"
                maxLength={11}
                className="w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          <button
            onClick={handleConnect}
            disabled={loading}
            className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors font-medium"
          >
            {loading ? 'Gerando QR Code...' : 'Conectar'}
          </button>

          {qrCode && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="text-sm text-slate-500 text-center mb-3">
                Escaneie o QR Code com o WhatsApp
              </p>
              <div className="flex justify-center">
                {qrCode.base64 ? (
                  <img
                    src={qrCode.base64.startsWith('data:image') ? qrCode.base64 : `data:image/png;base64,${qrCode.base64}`}
                    alt="QR Code"
                    className="w-64 h-64"
                  />
                ) : (
                  <pre className="text-xs">{JSON.stringify(qrCode, null, 2)}</pre>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
