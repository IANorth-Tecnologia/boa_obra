import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { 
    Play, Pause, CheckSquare, Camera, Clock, 
    ChevronDown, History, Users, Truck, Save, 
    HardHat, Briefcase, ChevronRight, ChevronLeft, X
} from 'lucide-react';

export default function RDO() {
    const [obras, setObras] = useState<any[]>([]);
    const [obraSelecionada, setObraSelecionada] = useState<string>('');
    const [etapas, setEtapas] = useState<any[]>([]);
    const [etapaSelecionada, setEtapaSelecionada] = useState<any>(null);
    const [statusAtual, setStatusAtual] = useState('NAO_INICIADO'); 
    const [timeline, setTimeline] = useState<any[]>([]);
    const [rdoId, setRdoId] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);

    const [modalEventoAberto, setModalEventoAberto] = useState(false);
    const [modalWizardAberto, setModalWizardAberto] = useState(false);
    
    const [tipoAcao, setTipoAcao] = useState('');
    const [obs, setObs] = useState('');
    const [foto, setFoto] = useState<File | null>(null);

    const [passo, setPasso] = useState(1);
    const [listaIND, setListaIND] = useState<any[]>([]); 
    const [listaDIR, setListaDIR] = useState<any[]>([]); 
    const [equipamentos, setEquipamentos] = useState<any[]>([]);
    
    const [tempInd, setTempInd] = useState({ funcao: '', qtd: 1 });
    const [tempDir, setTempDir] = useState({ funcao: '', qtd: 1 });
    const [tempEquip, setTempEquip] = useState({ desc: '', qtd: 1 });

    const sugestoesIND = ["MESTRE", "ENCARREGADO", "ENGENHEIRO", "TÉCNICO", "ALMOXARIFE"];
    const sugestoesDIR = ["PEDREIRO", "SERVENTE", "CARPINTEIRO", "ARMADOR", "ELETRICISTA", "PINTOR"];

    useEffect(() => {
        api.get('/atividades').then(res => setObras(res.data));
    }, []);

    useEffect(() => {
        if (obraSelecionada) {
            setEtapas([]);
            setEtapaSelecionada(null);
            setStatusAtual('NAO_INICIADO');
            setTimeline([]);
            api.get(`/etapas/obra/${obraSelecionada}`).then(res => setEtapas(res.data)).catch(console.error);
        }
    }, [obraSelecionada]);

    useEffect(() => {
        if (etapaSelecionada && obraSelecionada) {
            carregarTimeline();
        }
    }, [etapaSelecionada]);

    const carregarTimeline = async () => {
        try {
            const res = await api.get(`/rdo/timeline/${obraSelecionada}/${etapaSelecionada.ID}`);
            setStatusAtual(res.data.status);
            setTimeline(res.data.timeline);
            setRdoId(res.data.rdo_id);
            if (res.data.status === 'CONCLUIDO') {
            }
        } catch (error) { console.error(error); }
    };

    const handleIniciar = async () => {
        try {
            const formData = new FormData();
            formData.append('ID_ATIVIDADE', obraSelecionada);
            formData.append('ID_ETAPA', etapaSelecionada.ID);
            const evento = statusAtual === 'PAUSADO' ? 'RETOMADA' : 'INICIO';
            formData.append('TIPO_EVENTO', evento);
            formData.append('OBSERVACAO', evento === 'INICIO' ? 'Início dos trabalhos' : 'Retorno da pausa');
            await api.post('/rdo/evento', formData);
            carregarTimeline();
        } catch (error) { alert('Erro ao iniciar'); }
    };

    const abrirModalAcao = (tipo: 'PAUSA' | 'CONCLUSAO') => {
        if (tipo === 'CONCLUSAO') {
            setPasso(1);
            setModalWizardAberto(true);
        } else {
            setTipoAcao(tipo);
            setObs('');
            setFoto(null);
            setModalEventoAberto(true);
        }
    };

    const confirmarEventoPausa = async () => {
        if (!obs || !foto) return alert('Preencha observação e foto.');
        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('ID_ATIVIDADE', obraSelecionada);
            formData.append('ID_ETAPA', etapaSelecionada.ID);
            formData.append('TIPO_EVENTO', tipoAcao);
            formData.append('OBSERVACAO', obs);
            formData.append('file', foto);
            await api.post('/rdo/evento', formData);
            setModalEventoAberto(false);
            carregarTimeline();
        } catch (error) { alert('Erro ao salvar.'); } finally { setLoading(false); }
    };

    const finalizarWizard = async () => {
        if (!rdoId) return alert("Erro: RDO não iniciado hoje.");
        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('ID_ATIVIDADE', obraSelecionada);
            formData.append('ID_ETAPA', etapaSelecionada.ID);
            formData.append('TIPO_EVENTO', 'CONCLUSAO');
            formData.append('OBSERVACAO', 'Fechamento do dia via Wizard');
            await api.post('/rdo/evento', formData);

            // 2. Salva o efetivo e equipamentos
            const efetivoPayload = [
                ...listaIND.map(item => ({ FUNCAO: item.funcao, QUANTIDADE: item.qtd, TIPO: 'INDIRETO' })),
                ...listaDIR.map(item => ({ FUNCAO: item.funcao, QUANTIDADE: item.qtd, TIPO: 'DIRETO' }))
            ];

            await api.put(`/rdo/${rdoId}/finalizar`, {
                EFETIVO: efetivoPayload,
                EQUIPAMENTOS: equipamentos
            });
            
            alert("RDO Finalizado com Sucesso!");
            setModalWizardAberto(false);
            // Resetar tela
            setObraSelecionada('');
            setListaIND([]); setListaDIR([]); setEquipamentos([]);
            
        } catch (error) {
            console.error(error);
            alert("Erro ao finalizar RDO.");
        } finally {
            setLoading(false);
        }
    };

    // Funções de Adição Wizard
    const addIND = () => { if(tempInd.funcao) { setListaIND([...listaIND, {...tempInd, funcao: tempInd.funcao.toUpperCase()}]); setTempInd({funcao:'', qtd:1}); }};
    const addDIR = () => { if(tempDir.funcao) { setListaDIR([...listaDIR, {...tempDir, funcao: tempDir.funcao.toUpperCase()}]); setTempDir({funcao:'', qtd:1}); }};
    const addEquip = () => { if(tempEquip.desc) { setEquipamentos([...equipamentos, {...tempEquip, desc: tempEquip.desc.toUpperCase()}]); setTempEquip({desc:'', qtd:1}); }};

    return (
        <div className="max-w-md mx-auto p-4 pb-32 bg-gray-50 min-h-screen">
            <h1 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Clock className="text-blue-600" /> Acompanhamento Diário
            </h1>

            <div className="bg-white p-4 rounded-xl shadow-sm border mb-4 space-y-3">
                <select className="w-full p-3 border rounded-lg bg-gray-50 font-bold" value={obraSelecionada} onChange={e => setObraSelecionada(e.target.value)}>
                    <option value="">Selecione a Obra...</option>
                    {obras.map(o => <option key={o.ID} value={o.ID}>{o.DESCRICAO}</option>)}
                </select>
                {obraSelecionada && (
                    <select className="w-full p-3 border rounded-lg bg-gray-50 font-bold" value={etapaSelecionada?.ID||''} onChange={e => {
                        const val = e.target.value;
                        setEtapaSelecionada(val==='0' ? {ID:0, NOME_ETAPA:'GERAL'} : etapas.find(et=>et.ID.toString()===val));
                    }}>
                        <option value="">Selecione a Etapa...</option>
                        <option value="0">-- DIÁRIO GERAL --</option>
                        {etapas.map(et => <option key={et.ID} value={et.ID}>{et.ORDEM} - {et.NOME_ETAPA}</option>)}
                    </select>
                )}
            </div>

            {etapaSelecionada && (
                <div className="mb-6 grid grid-cols-2 gap-3 h-32">
                    {(statusAtual === 'NAO_INICIADO' || statusAtual === 'PAUSADO') ? (
                        <button onClick={handleIniciar} className="col-span-2 bg-green-600 text-white rounded-xl shadow-lg flex flex-col items-center justify-center gap-2 active:scale-95 transition-transform">
                            <Play size={40}/> <span className="font-bold text-lg">{statusAtual==='PAUSADO'?'RETOMAR':'INICIAR'}</span>
                        </button>
                    ) : (
                        <>
                            <button onClick={() => abrirModalAcao('PAUSA')} className="bg-yellow-500 text-white rounded-xl font-bold flex flex-col items-center justify-center active:scale-95 transition-transform">
                                <Pause size={32}/> PAUSA
                            </button>
                            <button onClick={() => abrirModalAcao('CONCLUSAO')} className="bg-red-600 text-white rounded-xl font-bold flex flex-col items-center justify-center active:scale-95 transition-transform">
                                <CheckSquare size={32}/> FINALIZAR
                            </button>
                        </>
                    )}
                </div>
            )}

            {etapaSelecionada && (
                <div className="bg-white rounded-xl shadow-sm p-4 mb-6 space-y-4 border">
                    <h3 className="text-xs font-bold text-gray-500 uppercase flex gap-2"><History size={14}/> Histórico do Dia</h3>
                    {timeline.length === 0 ? <p className="text-center text-gray-400 text-sm py-2">Nenhum evento hoje.</p> : timeline.map((ev, i) => (
                        <div key={i} className="flex gap-3 text-sm">
                            <div className="font-bold text-gray-700 w-12">{ev.hora}</div>
                            <div>
                                <div className="font-bold">{ev.tipo}</div>
                                {ev.obs && <div className="text-gray-500 text-xs bg-gray-100 p-1 rounded mt-1">{ev.obs}</div>}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {modalWizardAberto && (
                <div className="fixed inset-0 bg-gray-100 z-50 flex flex-col animate-in slide-in-from-bottom-full duration-300">
                    
                    {/* Header Wizard */}
                    <div className="bg-white p-4 shadow-sm flex items-center justify-between">
                        <h2 className="font-bold text-gray-800 text-lg">Finalizando o Dia</h2>
                        <button onClick={() => setModalWizardAberto(false)}><X className="text-gray-500"/></button>
                    </div>
                    
                    {/* Barra de Progresso */}
                    <div className="flex gap-1 h-1 bg-gray-200">
                        <div className={`h-full bg-blue-600 transition-all w-1/3 ${passo >= 2 ? 'bg-blue-600' : ''}`}></div>
                        <div className={`h-full bg-gray-200 transition-all w-1/3 ${passo >= 2 ? 'bg-blue-600' : ''}`}></div>
                        <div className={`h-full bg-gray-200 transition-all w-1/3 ${passo >= 3 ? 'bg-blue-600' : ''}`}></div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4">
                        
                        {passo === 1 && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                                <div className="text-center py-4">
                                    <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-2 text-blue-600"><Briefcase size={32}/></div>
                                    <h3 className="font-bold text-xl text-gray-800">Equipe de Gestão</h3>
                                    <p className="text-gray-500 text-sm"> Gestão da obra</p>
                                </div>

                                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                                    {sugestoesIND.map(s=><button key={s} onClick={()=>setTempInd({...tempInd, funcao:s})} className="px-3 py-2 bg-white border rounded-full text-xs font-bold text-blue-600 whitespace-nowrap shadow-sm">{s}</button>)}
                                </div>

                                <div className="bg-white p-4 rounded-xl shadow-sm border">
                                    <div className="flex gap-2 mb-2">
                                        <input className="flex-1 p-3 border rounded-lg" placeholder="Função (Ex: Mestre)" value={tempInd.funcao} onChange={e=>setTempInd({...tempInd, funcao:e.target.value})}/>
                                        <input type="number" className="w-16 p-3 border rounded-lg text-center" value={tempInd.qtd} onChange={e=>setTempInd({...tempInd, qtd:parseInt(e.target.value)})}/>
                                        <button onClick={addIND} className="bg-blue-600 text-white p-3 rounded-lg"><Save size={20}/></button>
                                    </div>
                                    {listaIND.map((it, i) => (
                                        <div key={i} className="flex justify-between items-center py-2 border-b last:border-0">
                                            <span className="font-bold">{it.qtd}x {it.funcao}</span>
                                            <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-1 rounded">IND</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {passo === 2 && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                                <div className="text-center py-4">
                                    <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-2 text-green-600"><HardHat size={32}/></div>
                                    <h3 className="font-bold text-xl text-gray-800">Equipe de Produção</h3>
                                    <p className="text-gray-500 text-sm">Colaboradores envolvidos</p>
                                </div>

                                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                                    {sugestoesDIR.map(s=><button key={s} onClick={()=>setTempDir({...tempDir, funcao:s})} className="px-3 py-2 bg-white border rounded-full text-xs font-bold text-green-600 whitespace-nowrap shadow-sm">{s}</button>)}
                                </div>

                                <div className="bg-white p-4 rounded-xl shadow-sm border">
                                    <div className="flex gap-2 mb-2">
                                        <input className="flex-1 p-3 border rounded-lg" placeholder="Função (Ex: Pedreiro)" value={tempDir.funcao} onChange={e=>setTempDir({...tempDir, funcao:e.target.value})}/>
                                        <input type="number" className="w-16 p-3 border rounded-lg text-center" value={tempDir.qtd} onChange={e=>setTempDir({...tempDir, qtd:parseInt(e.target.value)})}/>
                                        <button onClick={addDIR} className="bg-green-600 text-white p-3 rounded-lg"><Save size={20}/></button>
                                    </div>
                                    {listaDIR.map((it, i) => (
                                        <div key={i} className="flex justify-between items-center py-2 border-b last:border-0">
                                            <span className="font-bold">{it.qtd}x {it.funcao}</span>
                                            <span className="text-[10px] bg-green-100 text-green-700 px-2 py-1 rounded">DIR</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {passo === 3 && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                                <div className="text-center py-4">
                                    <div className="bg-orange-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-2 text-orange-600"><Truck size={32}/></div>
                                    <h3 className="font-bold text-xl text-gray-800">Equipamentos</h3>
                                    <p className="text-gray-500 text-sm">O que foi utilizado hoje?</p>
                                </div>

                                <div className="bg-white p-4 rounded-xl shadow-sm border">
                                    <div className="flex gap-2 mb-2">
                                        <input className="flex-1 p-3 border rounded-lg" placeholder="Item (Ex: Betoneira)" value={tempEquip.desc} onChange={e=>setTempEquip({...tempEquip, desc:e.target.value})}/>
                                        <input type="number" className="w-16 p-3 border rounded-lg text-center" value={tempEquip.qtd} onChange={e=>setTempEquip({...tempEquip, qtd:parseInt(e.target.value)})}/>
                                        <button onClick={addEquip} className="bg-orange-600 text-white p-3 rounded-lg"><Save size={20}/></button>
                                    </div>
                                    {equipamentos.map((it, i) => (
                                        <div key={i} className="flex justify-between items-center py-2 border-b last:border-0">
                                            <span className="font-bold">{it.qtd}x {it.desc}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="bg-gray-50 p-4 rounded-xl text-sm text-gray-600 mt-4">
                                    <p className="font-bold mb-1">Resumo do Dia:</p>
                                    <p>• {listaIND.length} Cargos de Gestão</p>
                                    <p>• {listaDIR.length} Cargos de Produção</p>
                                    <p>• {equipamentos.length} Equipamentos</p>
                                </div>
                            </div>
                        )}

                    </div>

                    {/* Footer Navegação */}
                    <div className="bg-white p-4 border-t flex justify-between">
                        {passo > 1 ? (
                            <button onClick={()=>setPasso(passo-1)} className="px-6 py-3 rounded-lg border font-bold text-gray-600 flex items-center gap-2"><ChevronLeft/> Voltar</button>
                        ) : (
                            <div/> 
                        )}

                        {passo < 3 ? (
                            <button onClick={()=>setPasso(passo+1)} className="px-6 py-3 rounded-lg bg-blue-600 text-white font-bold flex items-center gap-2">Próximo <ChevronRight/></button>
                        ) : (
                            <button onClick={finalizarWizard} disabled={loading} className="px-6 py-3 rounded-lg bg-green-600 text-white font-bold flex items-center gap-2 shadow-lg">
                                {loading ? "Salvando..." : "CONCLUIR RDO"} <CheckSquare/>
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* MODAL EVENTO (PAUSA) */}
            {modalEventoAberto && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl w-full max-w-sm p-4 space-y-4">
                        <h3 className="font-bold border-b pb-2">Registrar Pausa</h3>
                        <textarea className="w-full p-2 border rounded" placeholder="Motivo (Almoço, Chuva...)" value={obs} onChange={e=>setObs(e.target.value)}></textarea>
                        <input type="file" accept="image/*" onChange={e=>setFoto(e.target.files?.[0]||null)}/>
                        <div className="flex gap-2">
                            <button onClick={()=>setModalEventoAberto(false)} className="flex-1 bg-gray-200 p-2 rounded">Cancelar</button>
                            <button onClick={confirmarEventoPausa} className="flex-1 bg-blue-600 text-white p-2 rounded">Confirmar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
