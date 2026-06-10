export default function SendOverlay({ open, result, onClose }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
        {!result ? (
          <div className="text-center">
            <div className="animate-spin w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-slate-700 font-medium text-lg">Enviando mensagens...</p>
            <p className="text-slate-400 text-sm mt-1">Aguarde, não feche esta página</p>
          </div>
        ) : (
          <div className="text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-slate-700 font-medium text-lg">Envio concluído</p>
            <div className="mt-4 space-y-2 text-sm">
              <p className="text-emerald-600 font-medium">
                ✅ {result.enviados} mensagens enviadas
              </p>
              {result.pulados > 0 && (
                <p className="text-amber-600">
                  ⏭️ {result.pulados} já enviadas anteriormente
                </p>
              )}
              {result.erros?.length > 0 && (
                <div className="text-red-500">
                  <p>❌ {result.erros.length} erros</p>
                  <ul className="mt-1 text-xs max-h-20 overflow-y-auto">
                    {result.erros.slice(0, 5).map((e, i) => (
                      <li key={i}>{e.id}: {e.erro}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              className="mt-6 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
            >
              Fechar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
