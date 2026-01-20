import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { db } from '../lib/db';
import { useNavigate } from 'react-router-dom';
import { 
  Cloud, CloudOff, Plus, Clock, RefreshCw, Trash2, Printer, Search, WifiOff,
  Trophy, AlertTriangle, Briefcase, Calendar, FileText, TrendingUp, Users, HardHat
} from 'lucide-react';

const StatCard = ({ icon: Icon, label, value, color }: any) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border flex items-center gap-4 transition-transform hover:scale-105">
        <div className={`p-4 rounded-full ${color} text-white`}>
            <Icon size={24} />
        </div>
        <div>
            <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">{label}</p>
            <h3 className="text-2xl font-bold text-gray-800">{value}</h3>
        </div>
    </div>
);

export default function Dashboard() {
  const navigate = useNavigate();
  const perfil = localStorage.getItem('perfil') || 'COLABORADOR';
  const nomeUsuario = localStorage.getItem('usuario_nome') || 'Colaborador';
  const isGestao = perfil === 'ADMIN' || perfil === 'GESTOR';

  const [stats, setStats] = useState<any>(null);
  const [rdosLocais, setRdosLocais] = useState<any[]>([]);
  const [rdosHistorico, setRdosHistorico] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [sincronizando, setSincronizando] = useState(false);
  const [busca, setBusca] = useState('');

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    setLoading(true);
    // 1. Locais
    const locais = await db.rdos.where('sincronizado').equals(0).toArray();
    setRdosLocais(locais);

    try {
        const [resStats, resHist] = await Promise.all([
            api.get('/dashboard/stats'),
            api.get('/rdos')
        ]);
        setStats(resStats.data);
        setRdosHistorico(resHist.data);
    } catch (e) { console.warn("Offline"); } 
    finally { setLoading(false); }
  };

const sincronizarTudo = async () => {
    if (rdosLocais.length === 0) return;
    setSincronizando(true);

    let sucessoTotal = true;

    try {
        for (const rdo of rdosLocais) {
            let idServidor = rdo.idServer;

            if (!idServidor) {
                try {
                    const payload = {
                        ID_ATIVIDADE: rdo.atividadeId,
                        DATAINICIO: `${rdo.data}T${rdo.horaInicio}:00`,
                        DATAFIM: `${rdo.data}T${rdo.horaFim}:00`,
                        DESCRICAO: rdo.descricao,
                        NOTA: rdo.nota,
                        PENDENCIA: "",
                        STATUS: rdo.status,
                        EFETIVO: rdo.efetivo.map((e:any) => ({ FUNCAO: e.FUNCAO, QUANTIDADE: e.QUANTIDADE })),
                        EQUIPAMENTOS: rdo.equipamentos.map((e:any) => ({ DESCRICAO: e.DESCRICAO, QUANTIDADE: e.QUANTIDADE }))
                    };

                    const res = await api.post('/rdos', payload);
                    idServidor = res.data.id;
                    
                    await db.rdos.update(rdo.id, { idServer: idServidor });
                } catch (err) {
                    console.error("Erro ao criar RDO texto", err);
                    sucessoTotal = false;
                    continue; 
                }
            }

            if (rdo.fotos && rdo.fotos.length > 0) {
                try {
                    const formData = new FormData();
                    let temArquivoValido = false;

                    rdo.fotos.forEach((f: any, index: number) => {
                        const blobOriginal = f.arquivo;
                        
                        if (blobOriginal) {
                            // @ts-ignore
                            const nomeArquivo = blobOriginal.name || `foto_${idServidor}_${index}.jpg`;
                            const tipoArquivo = blobOriginal.type || 'image/jpeg';

                            const arquivoNovo = new File([blobOriginal], nomeArquivo, { type: tipoArquivo });

                            formData.append('files', arquivoNovo);
                            temArquivoValido = true;
                        }
                    });

                    if (temArquivoValido) {
                        await api.post(`/rdo/${idServidor}/fotos`, formData, {
                            headers: {
                                "Content-Type": undefined
                            }
                        });
                        console.log(`Fotos do RDO ${idServidor} enviadas com sucesso!`);
                    }
                } catch (err) {
                    console.error("Erro ao enviar fotos", err);
                    alert(`RDO #${idServidor}: Texto salvo, mas erro ao subir fotos (Erro 422/500).`);
                    sucessoTotal = false;
                    continue; 
                }
            }

            await db.rdos.update(rdo.id, { sincronizado: 1 });
        }

        if (sucessoTotal) {
            alert("Sincronização concluída com sucesso!");
            carregarDados();
        }

    } catch (error) {
        console.error("Erro geral na sincronização", error);
        alert("Falha de conexão.");
    } finally {
        setSincronizando(false);
    }
  };


  const baixarPDF = (id: number) => window.open(`${api.defaults.baseURL}/rdo/${id}/pdf`, '_blank');
  
  const deletarDoHistorico = async (id: number) => {
      if(confirm("Tem certeza que deseja excluir este RDO permanentemente?")) {
          try {
              await api.delete(`/rdo/${id}`);
              carregarDados();
          } catch (e) {
              alert("Erro ao excluir RDO.");
          }
      }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 pb-24">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
                <h1 className="text-2xl font-bold text-gray-800">Olá, {nomeUsuario.split(' ')[0]}!</h1>
                <p className="text-gray-500 text-sm">
                    {isGestao ? "Visão Geral da Operação (Gestão)" : "Acompanhe seu progresso diário."}
                </p>
            </div>
            <div className="flex gap-2 w-full md:w-auto">
                {rdosLocais.length > 0 && (
                    <button onClick={sincronizarTudo} disabled={sincronizando} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 shadow-md animate-pulse">
                        {sincronizando ? <RefreshCw className="animate-spin"/> : <CloudOff/>} Sincronizar ({rdosLocais.length})
                    </button>
                )}
                <button onClick={() => navigate('/novo-rdo')} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg">
                    <Plus/> Novo RDO
                </button>
            </div>
        </div>

        {isGestao && stats?.kpis_globais && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <StatCard icon={FileText} label="RDOs Hoje" value={stats.kpis_globais.rdos_hoje} color="bg-blue-500" />
                <StatCard icon={TrendingUp} label="Total Mês" value={stats.kpis_globais.rdos_mes} color="bg-indigo-500" />
                <StatCard icon={Users} label="Equipe Ativa" value={stats.kpis_globais.equipe} color="bg-green-500" />
                <StatCard icon={HardHat} label="Obras Ativas" value={stats.kpis_globais.obras} color="bg-orange-500" />
            </div>
        )}

        {isGestao && stats?.ranking?.length > 0 && (
             <div className="bg-white p-6 rounded-xl shadow-sm border mb-8">
                <h3 className="text-gray-800 font-bold mb-4 flex items-center gap-2"><Trophy className="text-yellow-500"/> Produtividade da Equipe (Mês Atual)</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {stats.ranking.map((r: any, idx: number) => (
                        <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${idx === 0 ? 'bg-yellow-400' : idx === 1 ? 'bg-gray-400' : idx === 2 ? 'bg-orange-400' : 'bg-blue-200'}`}>
                                {idx + 1}
                            </div>
                            <div className="flex-1">
                                <p className="font-bold text-gray-700 text-sm truncate">{r.nome}</p>
                                <p className="text-xs text-gray-500">{r.total} RDOs</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {!isGestao && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-xl shadow-sm border">
                    <h3 className="text-gray-500 text-xs font-bold uppercase mb-4 flex items-center gap-2">
                        <Briefcase size={16}/> Minha Produtividade (Mês)
                    </h3>
                    <div className="flex items-end gap-2">
                        <span className="text-4xl font-bold text-blue-600">{stats?.meus_stats?.total_mes || 0}</span>
                        <span className="text-sm text-gray-400 mb-1">RDOs realizados</span>
                    </div>
                </div>

                <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border">
                    <h3 className="text-gray-500 text-xs font-bold uppercase mb-4 flex items-center gap-2">
                        <AlertTriangle size={16} className="text-yellow-500"/> Atenção: Diários em Aberto
                    </h3>
                    {stats?.meus_stats?.alertas?.length > 0 ? (
                        <div className="space-y-2">
                            {stats.meus_stats.alertas.map((a: any) => (
                                <div key={a.id} className="flex justify-between items-center bg-yellow-50 p-2 rounded border border-yellow-100 text-sm">
                                    <span className="font-bold text-gray-700">{a.obra}</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-gray-500">{new Date(a.data).toLocaleDateString()}</span>
                                        <span className="bg-yellow-200 text-yellow-800 text-[10px] px-2 rounded font-bold">{a.status}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-gray-400">Nenhuma pendência recente encontrada. Bom trabalho!</p>
                    )}
                </div>
            </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                <h3 className="font-bold text-gray-700 flex items-center gap-2"><Clock size={18}/> {isGestao ? "Histórico Geral de Relatórios" : "Meus Relatórios Recentes"}</h3>
                <div className="relative w-48 md:w-64">
                    <input className="pl-8 pr-4 py-1.5 border rounded-lg w-full text-sm outline-none" placeholder="Buscar..." value={busca} onChange={e => setBusca(e.target.value)}/>
                    <Search className="absolute left-2.5 top-2 text-gray-400" size={14} />
                </div>
            </div>
            
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-100 text-gray-600 font-bold uppercase text-xs">
                        <tr>
                            <th className="p-4">Data</th>
                            <th className="p-4">Obra</th>
                            <th className="p-4">Status</th>
                            <th className="p-4 text-center">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {rdosHistorico.length === 0 ? (
                             <tr><td colSpan={4} className="p-6 text-center text-gray-400">Nenhum registro encontrado.</td></tr>
                        ) : (
                            rdosHistorico.filter(r => r.OBRA.toLowerCase().includes(busca.toLowerCase())).map(rdo => (
                                <tr key={rdo.ID} className="hover:bg-blue-50">
                                    <td className="p-4 text-gray-600 font-mono">{new Date(rdo.DATA).toLocaleDateString()}</td>
                                    <td className="p-4 font-medium text-gray-800">{rdo.OBRA}</td>
                                    <td className="p-4"><span className={`px-2 py-1 rounded text-[10px] font-bold border ${rdo.STATUS === 'CONCLUIDO' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-blue-100 text-blue-700 border-blue-200'}`}>{rdo.STATUS}</span></td>
                                    <td className="p-4 text-center flex justify-center gap-2">
                                        <button onClick={() => baixarPDF(rdo.ID)} className="text-gray-400 hover:text-blue-600" title="Baixar PDF"><Printer size={18}/></button>
                                        {/* Botão de Excluir */}
                                        <button onClick={() => deletarDoHistorico(rdo.ID)} className="text-red-300 hover:text-red-600" title="Excluir RDO"><Trash2 size={18}/></button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
  );
}
