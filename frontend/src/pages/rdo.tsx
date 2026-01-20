import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { 
    Play, Pause, CheckSquare, Camera, Clock, 
    ChevronDown, History, Truck, Save, 
    HardHat, Briefcase, ChevronRight, ChevronLeft, X,
    Sun, Cloud, CloudRain, AlertCircle, PlayCircle, CheckCircle, PauseCircle, Upload, FileText, AlertTriangle, Trash2, Plus
} from 'lucide-react';

const CARGOS_GESTAO = [
    'ENGENHEIRO', 'MESTRE', 'ENCARREGADO', 'SUPERVISOR',
    'ADMINISTRATIVO', 'GERENTE', 'COORDENADOR', 'DIRETOR', 'FISCAL'
];

const ClimaSelector = ({ periodo, value, onChange }: any) => {
    const opcoes = [
        { id: 'SOL', icon: <Sun size={16}/>, label: 'Sol' },
        { id: 'NUBLADO', icon: <Cloud size={16}/>, label: 'Nublado' },
        { id: 'CHUVA', icon: <CloudRain size={16}/>, label: 'Chuva' },
        { id: 'IMPRATICAVEL', icon: <AlertCircle size={16}/>, label: 'Ruim' },
    ];
    return (
        <div className="bg-gray-50 p-2 rounded border">
            <span className="text-xs font-bold text-gray-500 uppercase block mb-1">{periodo}</span>
            <div className="flex gap-1">
                {opcoes.map(op => (
                    <button 
                        key={op.id} 
                        onClick={() => onChange(op.id)}
                        className={`p-1.5 rounded flex-1 flex justify-center transition-colors ${value === op.id ? 'bg-blue-600 text-white shadow-sm' : 'bg-white border text-gray-400 hover:bg-gray-100'}`}
                        title={op.label}
                    >
                        {op.icon}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default function RDO() {
    const [obras, setObras] = useState<any[]>([]);
    const [obraSelecionada, setObraSelecionada] = useState<string>('');
    const [etapas, setEtapas] = useState<any[]>([]);
    const [etapaSelecionada, setEtapaSelecionada] = useState<any>(null);
    
    const [opcoesGestao, setOpcoesGestao] = useState<any[]>([]);
    const [opcoesOperacional, setOpcoesOperacional] = useState<any[]>([]);
    const [catalogoEquip, setCatalogoEquip] = useState<any[]>([]);

    const [statusAtual, setStatusAtual] = useState('NAO_INICIADO'); 
    const [timeline, setTimeline] = useState<any[]>([]);
    const [rdoId, setRdoId] = useState<number | null>(null);
    
    const [loading, setLoading] = useState(false);
    const [modalEventoAberto, setModalEventoAberto] = useState(false);
    const [modalWizardAberto, setModalWizardAberto] = useState(false);
    const [passoWizard, setPassoWizard] = useState(1);

    const [form, setForm] = useState({
        status: 'EM ANDAMENTO',
        climaManha: 'SOL',
        climaTarde: 'SOL',
        condicaoArea: 'OPERAVEL',
        descricao: '',
        ocorrencias: ''
    });

    const [listaIndireta, setListaIndireta] = useState<string[]>([]);
    const [listaDireta, setListaDireta] = useState<string[]>([]);
    const [listaEquipamentos, setListaEquipamentos] = useState<{desc: string, qtd: number}[]>([]);
    
    const [tempIndireta, setTempIndireta] = useState('');
    const [tempDireta, setTempDireta] = useState('');
    const [tempEquip, setTempEquip] = useState({ desc: '', qtd: 1 });
    
    const [fotos, setFotos] = useState<File[]>([]);
    const [previews, setPreviews] = useState<string[]>([]);

    const [tipoAcao, setTipoAcao] = useState('');
    const [obs, setObs] = useState('');
    const [fotoEvento, setFotoEvento] = useState<File | null>(null);

    useEffect(() => {
        api.get('/atividades').then(res => setObras(res.data));
        api.get('/admin/equipamentos').then(res => setCatalogoEquip(res.data));
        api.get('/admin/funcionarios?apenas_ativos=true').then(res => {
            const todos = res.data;
            const gestao = todos.filter((f: any) => CARGOS_GESTAO.some(cargo => f.FUNCAO.toUpperCase().includes(cargo)));
            const operacional = todos.filter((f: any) => !CARGOS_GESTAO.some(cargo => f.FUNCAO.toUpperCase().includes(cargo)));
            setOpcoesGestao(gestao);
            setOpcoesOperacional(operacional);
        });
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
            if (etapaSelecionada.ID === 0) iniciarRdoGeral();
            else carregarTimeline();
        }
    }, [etapaSelecionada]);

    const iniciarRdoGeral = async () => {
        try {
            const formData = new FormData();
            formData.append('ID_ATIVIDADE', obraSelecionada);
            formData.append('ID_ETAPA', '0'); 
            formData.append('TIPO_EVENTO', 'INICIO');
            const res = await api.post('/rdo/evento', formData);
            setRdoId(res.data.rdo_id);
            setModalWizardAberto(true);
        } catch (error) { console.error(error); }
    }

    const carregarTimeline = async () => {
        try {
            const res = await api.get(`/rdo/timeline/${obraSelecionada}/${etapaSelecionada.ID}`);
            setStatusAtual(res.data.status);
            setTimeline(res.data.timeline);
            setRdoId(res.data.rdo_id);
        } catch (error) { console.error(error); }
    };

    const handleIniciar = async () => {
        try {
            const formData = new FormData();
            formData.append('ID_ATIVIDADE', obraSelecionada);
            formData.append('ID_ETAPA', String(etapaSelecionada.ID));
            const evento = statusAtual === 'PAUSADO' ? 'RETOMADA' : 'INICIO';
            formData.append('TIPO_EVENTO', evento);
            formData.append('OBSERVACAO', evento === 'INICIO' ? 'Início dos trabalhos' : 'Retorno da pausa');
            await api.post('/rdo/evento', formData);
            carregarTimeline();
        } catch (error) { alert('Erro ao iniciar'); }
    };

    const abrirModalAcao = (tipo: 'PAUSA' | 'CONCLUSAO') => {
        if (tipo === 'CONCLUSAO') {
            setPassoWizard(1);
            setModalWizardAberto(true);
        } else {
            setTipoAcao(tipo);
            setObs('');
            setFotoEvento(null);
            setModalEventoAberto(true);
        }
    };

    const confirmarEventoPausa = async () => {
        if (!obs) return alert('Preencha a observação.');
        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('ID_ATIVIDADE', String(obraSelecionada));
            if (etapaSelecionada && etapaSelecionada.ID) {
                formData.append('ID_ETAPA', String(etapaSelecionada.ID));
            } else {
                formData.append('ID_ETAPA', '0');
            }
            formData.append('TIPO_EVENTO', tipoAcao);
            formData.append('OBSERVACAO', obs);
            if (fotoEvento instanceof File) {
                formData.append('file', fotoEvento);
            }
            await api.post('/rdo/evento', formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });
            setModalEventoAberto(false);
            carregarTimeline();
        } catch (error) { 
            console.error(error);
            alert('Erro ao salvar evento. Verifique a conexão.'); 
        } finally { 
            setLoading(false); 
        }
    };

    const addIndireta = () => { if(tempIndireta) { setListaIndireta([...listaIndireta, tempIndireta.toUpperCase()]); setTempIndireta(''); }};
    const removeIndireta = (idx: number) => { const l = [...listaIndireta]; l.splice(idx,1); setListaIndireta(l); };
    const addDireta = () => { if(tempDireta) { setListaDireta([...listaDireta, tempDireta.toUpperCase()]); setTempDireta(''); }};
    const removeDireta = (idx: number) => { const l = [...listaDireta]; l.splice(idx,1); setListaDireta(l); };
    const addEquipamento = () => { if(tempEquip.desc) { setListaEquipamentos([...listaEquipamentos, {...tempEquip, desc: tempEquip.desc.toUpperCase()}]); setTempEquip({desc:'', qtd:1}); }};
    const removeEquip = (idx: number) => { const l = [...listaEquipamentos]; l.splice(idx,1); setListaEquipamentos(l); };

    const handleFotos = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files);
            setFotos([...fotos, ...newFiles]);
            const newPreviews = newFiles.map(f => URL.createObjectURL(f));
            setPreviews([...previews, ...newPreviews]);
        }
    };
    const removeFoto = (idx: number) => {
        const nf = [...fotos]; nf.splice(idx, 1); setFotos(nf);
        const np = [...previews]; np.splice(idx, 1); setPreviews(np);
    };

    const salvarRdoCompleto = async () => {
        if (!rdoId) return alert("RDO não inicializado.");
        setLoading(true);
        try {
            const payload = {
                STATUS: form.status,
                CLIMA_MANHA: form.climaManha,
                CLIMA_TARDE: form.climaTarde,
                CONDICAO_AREA: form.condicaoArea,
                DESCRICAO: form.descricao,
                OBSERVACOES: form.ocorrencias,
                EFETIVO: [
                    ...listaIndireta.map(nome => ({ FUNCAO: `[IND] ${nome}`, QUANTIDADE: 1 })),
                    ...listaDireta.map(nome => ({ FUNCAO: `[DIR] ${nome}`, QUANTIDADE: 1 }))
                ],
                EQUIPAMENTOS: listaEquipamentos.map(e => ({ DESCRICAO: e.desc, QUANTIDADE: e.qtd }))
            };

            await api.put(`/rdo/${rdoId}/finalizar`, payload);

            if (fotos.length > 0) {
                const formData = new FormData();
                fotos.forEach(f => formData.append('files', f));
                await api.post(`/rdo/${rdoId}/fotos`, formData, {headers: {'Content-Type': 'multipart/form-data'}});
            }

            if (etapaSelecionada.ID !== 0) {
                const fd = new FormData();
                fd.append('ID_ATIVIDADE', obraSelecionada);
                fd.append('ID_ETAPA', String(etapaSelecionada.ID));
                fd.append('TIPO_EVENTO', 'CONCLUSAO');
                await api.post('/rdo/evento', fd);
            }

            alert("RDO Finalizado com Sucesso!");
            setModalWizardAberto(false);
            setObraSelecionada('');
            setListaIndireta([]); setListaDireta([]); setListaEquipamentos([]); setFotos([]); setPreviews([]);

        } catch (error) {
            console.error(error);
            alert("Erro ao finalizar.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-md mx-auto p-4 pb-32 bg-gray-50 min-h-screen">
            <h1 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Clock className="text-blue-600" /> Acompanhamento Diário
            </h1>

            {/* SELETORES */}
            <div className="bg-white p-4 rounded-xl shadow-sm border mb-4 space-y-3">
                <div className="relative">
                    <select className="w-full p-3 border rounded-lg bg-gray-50 font-bold appearance-none" value={obraSelecionada} onChange={e => setObraSelecionada(e.target.value)}>
                        <option value="">Selecione a Obra...</option>
                        {obras.map(o => <option key={o.ID} value={o.ID}>{o.DESCRICAO}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-3 text-gray-400 pointer-events-none" size={18}/>
                </div>
                {obraSelecionada && (
                    <div className="relative animate-in fade-in">
                        <select className="w-full p-3 border rounded-lg bg-gray-50 font-bold appearance-none" value={etapaSelecionada?.ID||''} onChange={e => {
                            const val = e.target.value;
                            setEtapaSelecionada(val==='0' ? {ID:0, NOME_ETAPA:'GERAL / ADMINISTRATIVO'} : etapas.find(et=>et.ID.toString()===val));
                        }}>
                            <option value="">Selecione a Etapa...</option>
                            <option value="0">-- RDO GERAL / ADMINISTRATIVO --</option>
                            {etapas.map(et => <option key={et.ID} value={et.ID}>{et.ORDEM} - {et.NOME_ETAPA}</option>)}
                        </select>
                        <ChevronDown className="absolute right-3 top-3 text-gray-400 pointer-events-none" size={18}/>
                    </div>
                )}
            </div>

            {/* BOTÕES DE AÇÃO */}
            {etapaSelecionada && !modalWizardAberto && (
                <div className="animate-in zoom-in-95 duration-200">
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

                    <div className="bg-white rounded-xl shadow-sm p-4 mb-6 space-y-4 border">
                        <h3 className="text-xs font-bold text-gray-500 uppercase flex gap-2"><History size={14}/> Histórico</h3>
                        {timeline.length === 0 ? <p className="text-center text-gray-400 text-sm">Nenhum evento.</p> : timeline.map((ev, i) => (
                            <div key={i} className="flex gap-3 text-sm">
                                <div className="font-bold text-gray-700 w-12">{ev.hora}</div>
                                <div><div className="font-bold">{ev.tipo}</div>{ev.obs && <div className="text-gray-500 text-xs bg-gray-100 p-1 rounded mt-1">{ev.obs}</div>}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {modalWizardAberto && (
                <div className="fixed inset-0 bg-gray-50 z-50 flex flex-col h-[100dvh] w-full animate-in slide-in-from-bottom-full duration-300">
                    <div className="bg-white p-4 shadow-sm flex items-center justify-between border-b shrink-0">
                        <h2 className="font-bold text-gray-800 text-lg">Finalizando o Dia</h2>
                        <button onClick={() => setModalWizardAberto(false)}><X className="text-gray-500"/></button>
                    </div>

                    <div className="flex gap-1 h-1 bg-gray-200 shrink-0">
                        <div className={`h-full bg-blue-600 transition-all w-1/3 ${passoWizard >= 1 ? 'opacity-100' : 'opacity-0'}`}></div>
                        <div className={`h-full bg-blue-600 transition-all w-1/3 ${passoWizard >= 2 ? 'opacity-100' : 'opacity-0'}`}></div>
                        <div className={`h-full bg-blue-600 transition-all w-1/3 ${passoWizard >= 3 ? 'opacity-100' : 'opacity-0'}`}></div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4">
                        <datalist id="dl-gestao">{opcoesGestao.map((f:any) => <option key={f.ID} value={`${f.NOME} (${f.FUNCAO})`} />)}</datalist>
                        <datalist id="dl-operacional">{opcoesOperacional.map((f:any) => <option key={f.ID} value={`${f.NOME} (${f.FUNCAO})`} />)}</datalist>
                        <datalist id="dl-equipamentos">{catalogoEquip.map((eq:any) => <option key={eq.ID} value={eq.DESCRICAO} />)}</datalist>

                        {passoWizard === 1 && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-right-8">
                                <h3 className="font-bold text-lg text-gray-700">1. Status e Condições</h3>
                                <section className="bg-white p-4 rounded-xl border shadow-sm space-y-4">
                                    <div className="flex gap-2">
                                        <button onClick={() => setForm({...form, status: 'EM ANDAMENTO'})} className={`flex-1 py-3 rounded-lg text-xs font-bold border flex flex-col items-center gap-1 ${form.status === 'EM ANDAMENTO' ? 'bg-blue-600 text-white' : 'bg-white text-gray-500'}`}><PlayCircle size={18}/> ANDAMENTO</button>
                                        <button onClick={() => setForm({...form, status: 'CONCLUIDO'})} className={`flex-1 py-3 rounded-lg text-xs font-bold border flex flex-col items-center gap-1 ${form.status === 'CONCLUIDO' ? 'bg-green-600 text-white' : 'bg-white text-gray-500'}`}><CheckCircle size={18}/> CONCLUÍDO</button>
                                        <button onClick={() => setForm({...form, status: 'PARALISADO'})} className={`flex-1 py-3 rounded-lg text-xs font-bold border flex flex-col items-center gap-1 ${form.status === 'PARALISADO' ? 'bg-red-500 text-white' : 'bg-white text-gray-500'}`}><PauseCircle size={18}/> PARADO</button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <ClimaSelector periodo="Manhã" value={form.climaManha} onChange={(v:string) => setForm({...form, climaManha: v})} />
                                        <ClimaSelector periodo="Tarde" value={form.climaTarde} onChange={(v:string) => setForm({...form, climaTarde: v})} />
                                    </div>
                                    <div className="bg-gray-50 p-2 rounded border">
                                        <span className="text-xs font-bold text-gray-500 uppercase mb-1 block">Condição da Área</span>
                                        <select className="w-full p-2 border rounded text-sm bg-white" value={form.condicaoArea} onChange={e => setForm({...form, condicaoArea: e.target.value})}>
                                            <option value="OPERAVEL">Área Operável (Normal)</option>
                                            <option value="PARCIAL">Operação Parcial</option>
                                            <option value="INOPERAVEL">Área Inoperável</option>
                                        </select>
                                    </div>
                                </section>
                            </div>
                        )}

                        {passoWizard === 2 && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-right-8">
                                <h3 className="font-bold text-lg text-gray-700">2. Recursos Utilizados</h3>
                                <section className="bg-white p-4 rounded-xl border shadow-sm space-y-6">
                                    <div>
                                        <div className="flex justify-between mb-2"><span className="text-xs font-bold text-blue-600 uppercase flex gap-1"><Briefcase size={14}/> Indireta (Gestão)</span></div>
                                        <div className="flex gap-2 mb-3"><input list="dl-gestao" className="flex-1 p-2 border rounded text-sm uppercase" placeholder="Buscar..." value={tempIndireta} onChange={e => setTempIndireta(e.target.value)} /><button onClick={addIndireta} className="bg-blue-600 text-white p-2 rounded"><Plus size={18}/></button></div>
                                        {listaIndireta.length > 0 && <div className="space-y-1">{listaIndireta.map((nome, idx) => (<div key={idx} className="flex justify-between items-center bg-blue-50 p-2 rounded border border-blue-100 text-sm"><span className="text-blue-800 font-bold">{nome}</span><button onClick={() => removeIndireta(idx)} className="text-red-400"><Trash2 size={14}/></button></div>))}</div>}
                                    </div>
                                    <div className="border-t pt-4">
                                        <div className="flex justify-between mb-2"><span className="text-xs font-bold text-green-600 uppercase flex gap-1"><HardHat size={14}/> Direta (Execução)</span></div>
                                        <div className="flex gap-2 mb-3"><input list="dl-operacional" className="flex-1 p-2 border rounded text-sm uppercase" placeholder="Buscar..." value={tempDireta} onChange={e => setTempDireta(e.target.value)} /><button onClick={addDireta} className="bg-green-600 text-white p-2 rounded"><Plus size={18}/></button></div>
                                        {listaDireta.length > 0 && <div className="space-y-1">{listaDireta.map((nome, idx) => (<div key={idx} className="flex justify-between items-center bg-green-50 p-2 rounded border border-green-100 text-sm"><span className="text-green-800 font-bold">{nome}</span><button onClick={() => removeDireta(idx)} className="text-red-400"><Trash2 size={14}/></button></div>))}</div>}
                                    </div>
                                    <div className="border-t pt-4">
                                        <div className="flex justify-between mb-2"><span className="text-xs font-bold text-orange-600 uppercase flex gap-1"><Truck size={14}/> Equipamentos</span></div>
                                        <div className="flex gap-2 mb-3">
                                            <input list="dl-equipamentos" className="flex-1 p-2 border rounded text-sm uppercase" placeholder="Item..." value={tempEquip.desc} onChange={e => setTempEquip({...tempEquip, desc: e.target.value})} />
                                            <input type="number" className="w-16 p-2 border rounded text-center" value={tempEquip.qtd} onChange={e => setTempEquip({...tempEquip, qtd: parseInt(e.target.value) || 1})}/>
                                            <button onClick={addEquipamento} className="bg-orange-500 text-white p-2 rounded"><Plus size={18}/></button>
                                        </div>
                                        {listaEquipamentos.length > 0 && <div className="space-y-1">{listaEquipamentos.map((item, idx) => (<div key={idx} className="flex justify-between items-center bg-orange-50 p-2 rounded border border-orange-100 text-sm"><span className="text-orange-800 font-bold">{item.qtd}x {item.desc}</span><button onClick={() => removeEquip(idx)} className="text-red-400"><Trash2 size={14}/></button></div>))}</div>}
                                    </div>
                                </section>
                            </div>
                        )}

                        {passoWizard === 3 && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-right-8">
                                <h3 className="font-bold text-lg text-gray-700">3. Evidências e Detalhes</h3>
                                <section className="bg-white p-4 rounded-xl border shadow-sm">
                                    <div className="flex justify-between items-center mb-3 border-b pb-2"><h2 className="text-sm font-bold text-gray-800 flex gap-2"><Camera size={18}/> Fotos ({fotos.length})</h2>{fotos.length > 0 && <button onClick={() => { setFotos([]); setPreviews([]); }} className="text-xs text-red-500">Limpar</button>}</div>
                                    <label className="border-2 border-dashed border-gray-300 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors">
                                        <Upload size={24} className="text-gray-400 mb-1"/>
                                        <span className="text-sm text-gray-500 font-medium">Adicionar Fotos</span>
                                        {/* Câmera e Galeria Habilitadas */}
                                        <input type="file" multiple accept="image/*" className="hidden" onChange={handleFotos} />
                                    </label>
                                    {previews.length > 0 && (<div className="flex gap-2 mt-4 overflow-x-auto pb-2">{previews.map((src, idx) => (<div key={idx} className="relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden border border-gray-200"><img src={src} alt="Preview" className="w-full h-full object-cover" /><button onClick={() => removeFoto(idx)} className="absolute top-1 right-1 bg-red-600 text-white p-0.5 rounded shadow"><X size={10}/></button></div>))}</div>)}
                                </section>
                                <section className="bg-white p-4 rounded-xl border shadow-sm space-y-4">
                                    <div><label className="text-xs font-bold text-gray-500 uppercase flex gap-1 mb-1"><FileText size={14}/> Atividades Executadas</label><textarea className="w-full p-3 border rounded-xl bg-gray-50 text-sm h-32" value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})} placeholder="Descreva o que foi feito..."></textarea></div>
                                    <div><label className="text-xs font-bold text-gray-500 uppercase flex gap-1 mb-1"><AlertTriangle size={14}/> Ocorrências / Obs</label><textarea className="w-full p-3 border rounded-xl bg-gray-50 text-sm h-20" value={form.ocorrencias} onChange={e => setForm({...form, ocorrencias: e.target.value})} placeholder="Algo fora do comum?"></textarea></div>
                                </section>
                            </div>
                        )}
                    </div>

                    <div className="bg-white p-4 border-t flex justify-between items-center shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] shrink-0">
                        {passoWizard > 1 ? (
                            <button onClick={()=>setPassoWizard(passoWizard-1)} className="px-4 py-3 rounded-lg border font-bold text-gray-600 flex items-center gap-2"><ChevronLeft/> Voltar</button>
                        ) : <div/>}

                        {passoWizard < 3 ? (
                            <button onClick={()=>setPassoWizard(passoWizard+1)} className="px-6 py-3 rounded-lg bg-blue-600 text-white font-bold flex items-center gap-2 shadow-lg">Próximo <ChevronRight/></button>
                        ) : (
                            <button onClick={salvarRdoCompleto} disabled={loading} className="px-6 py-3 rounded-lg bg-green-600 text-white font-bold flex items-center gap-2 shadow-lg">
                                {loading ? "Enviando..." : "FINALIZAR RDO"} <Save size={18}/>
                            </button>
                        )}
                    </div>
                </div>
            )}

            {modalEventoAberto && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl w-full max-w-sm p-4 space-y-4">
                        <h3 className="font-bold border-b pb-2">Registrar Pausa</h3>
                        <textarea className="w-full p-2 border rounded" placeholder="Motivo (Almoço, Chuva...)" value={obs} onChange={e=>setObs(e.target.value)}></textarea>
                        <input type="file" accept="image/*" onChange={e=>setFotoEvento(e.target.files?.[0]||null)}/>
                        <div className="flex gap-2"><button onClick={()=>setModalEventoAberto(false)} className="flex-1 bg-gray-200 p-2 rounded">Cancelar</button><button onClick={confirmarEventoPausa} className="flex-1 bg-blue-600 text-white p-2 rounded">Confirmar</button></div>
                    </div>
                </div>
            )}
        </div>
    );
}
