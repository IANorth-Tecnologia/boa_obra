import { useState, useEffect } from 'react';
import { db } from '../lib/db'; 
import { api } from '../lib/api'; 
import { Wifi, WifiOff, RefreshCw, UploadCloud } from 'lucide-react';

export default function Sincronizacao() {
  const [pendentes, setPendentes] = useState<number>(0);
  const [sincronizando, setSincronizando] = useState(false);
  const [msg, setMsg] = useState("");
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    checarPendencias();
    const handleStatus = () => setOnline(navigator.onLine);
    window.addEventListener('online', handleStatus);
    window.addEventListener('offline', handleStatus);
    return () => {
      window.removeEventListener('online', handleStatus);
      window.removeEventListener('offline', handleStatus);
    };
  }, []);

  const checarPendencias = async () => {
    const count = await db.rdos.where('sincronizado').equals(0).count();
    setPendentes(count);
  };

  const realizarSincronizacao = async () => {
    if (!online) return setMsg("Sem conexão com a internet.");
    setSincronizando(true);
    setMsg("Iniciando sincronização...");

    try {
      const rdos = await db.rdos.where('sincronizado').equals(0).toArray();

      for (const rdo of rdos) {
        try {
          const dataInicio = `${rdo.data}T${rdo.horaInicio}:00`;
          const dataFim = `${rdo.data}T${rdo.horaFim}:00`;

          const payload = {
            ID_ATIVIDADE: rdo.atividadeId,
            ID_ETAPA: rdo.etapaId || null, 
            DATAINICIO: dataInicio,
            DATAFIM: dataFim,
            DESCRICAO: rdo.descricao,
            NOTA: rdo.nota,
            PENDENCIA: '',
            STATUS: rdo.status,
            EFETIVO: rdo.efetivo,
            EQUIPAMENTOS: rdo.equipamentos
          };

          const res = await api.post('/rdo', payload);
          const idServidor = res.data.id;

          if (rdo.fotos && rdo.fotos.length > 0) {
             const formData = new FormData();
             rdo.fotos.forEach((fotoObj: any) => {
                 formData.append('files', fotoObj.arquivo);
             });
             await api.post(`/rdo/${idServidor}/fotos`, formData, {
                 headers: { 'Content-Type': 'multipart/form-data' }
             });
          }

          await db.rdos.update(rdo.id!, { sincronizado: 1, idServer: idServidor });

        } catch (error) {
          console.error(`Erro ao sincronizar RDO ${rdo.id}:`, error);
        }
      }

      setMsg("Sincronização concluída!");
      checarPendencias();

    } catch (error) {
      console.error("Erro geral de sincronização:", error);
      setMsg("Erro ao sincronizar. Tente novamente.");
    } finally {
      setSincronizando(false);
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center gap-2">
        <RefreshCw className={sincronizando ? "animate-spin" : ""} /> Sincronização
      </h2>

      <div className={`p-4 rounded-lg mb-6 flex items-center gap-3 ${online ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
        {online ? <Wifi size={24}/> : <WifiOff size={24}/>}
        <span className="font-bold">{online ? "Você está Online" : "Você está Offline"}</span>
      </div>

      <div className="bg-white p-6 rounded-xl shadow border text-center mb-6">
        <div className="text-4xl font-bold text-blue-600 mb-2">{pendentes}</div>
        <div className="text-gray-500 uppercase text-xs font-bold">Relatórios Pendentes</div>
      </div>

      <button
        onClick={realizarSincronizacao}
        disabled={sincronizando || pendentes === 0 || !online}
        className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 text-white shadow-lg transition-all
          ${sincronizando || pendentes === 0 || !online 
            ? 'bg-gray-400 cursor-not-allowed' 
            : 'bg-blue-600 hover:bg-blue-700 active:scale-95'}`}
      >
        {sincronizando ? "Enviando..." : "Sincronizar Agora"} <UploadCloud size={20}/>
      </button>

      {msg && (
        <div className="mt-4 p-3 bg-gray-100 rounded text-center text-sm font-medium text-gray-700 animate-fadeIn">
          {msg}
        </div>
      )}
    </div>
  );
}
