import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { db } from '../lib/db';
import { useNavigate } from 'react-router-dom';
import { 
  Save, Camera, Plus, Trash2, ArrowRight, ArrowLeft, 
  CheckCircle, Calendar, Users, Truck, FileText, Image as ImageIcon,
  Sun, Cloud, CloudRain, AlertTriangle, PlayCircle, PauseCircle, Wifi, WifiOff
} from 'lucide-react';

const CARGOS_GESTAO = ['ENCARREGADO', 'MESTRE', 'ENGENHEIRO', 'GERENTE', 'COORDENADOR', 'ADMINISTRATIVO', 'LIDER', 'SUPERVISOR'];

export default function RDO() {
  const navigate = useNavigate();
  
  const [obras, setObras] = useState<any[]>([]);
  const [etapas, setEtapas] = useState<any[]>([]); 
  const [catalogoEquip, setCatalogoEquip] = useState<any[]>([]);
  const [opcoesGestao, setOpcoesGestao] = useState<any[]>([]);
  const [opcoesOperacional, setOpcoesOperacional] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modoOffline, setModoOffline] = useState(!navigator.onLine);

  const [step, setStep] = useState(1);

  const [form, setForm] = useState({
    atividadeId: '',
    etapaId: '', 
    data: new Date().toISOString().split('T')[0], 
    horaInicio: '07:00', horaFim: '17:00',
    descricao: '', 
    ocorrencias: '',
    climaManha: 'BOM', climaTarde: 'BOM', 
    condicaoArea: 'OPERAVEL',
    status: 'EM ANDAMENTO'
  });

  const [listaIndireta, setListaIndireta] = useState<string[]>([]);
  const [listaDireta, setListaDireta] = useState<string[]>([]);
  const [listaEquipamentos, setListaEquipamentos] = useState<{desc: string, qtd: number}[]>([]);
  
  const [tempIndireta, setTempIndireta] = useState('');
  const [tempDireta, setTempDireta] = useState('');
  const [tempEquip, setTempEquip] = useState({ desc: '', qtd: 1 });

  const [arquivos, setArquivos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  useEffect(() => {
    if (form.atividadeId) {
        setEtapas([]); 
        api.get(`/etapas/obra/${form.atividadeId}`)
            .then(res => setEtapas(res.data))
            .catch(err => console.error("Erro ao buscar etapas (pode estar offline)", err));
    } else {
        setEtapas([]);
    }
  }, [form.atividadeId]);

  useEffect(() => {
    const handleStatus = () => setModoOffline(!navigator.onLine);
    window.addEventListener('online', handleStatus);
    window.addEventListener('offline', handleStatus);
    
    async function carregar() {
        try {
            const [resObras, resFunc, resEquip] = await Promise.all([
                api.get('/atividades'),
                api.get('/admin/funcionarios'),
                api.get('/admin/equipamentos')
            ]);
            await db.cache.bulkPut([
                { chave: 'OBRAS', dados: resObras.data },
                { chave: 'FUNCIONARIOS', dados: resFunc.data },
                { chave: 'EQUIPAMENTOS', dados: resEquip.data }
            ]).catch(console.error);
            processarDados(resObras.data, resFunc.data, resEquip.data);
            setModoOffline(false);
        } catch (e) {
            setModoOffline(true);
            const cObras = await db.cache.where({ chave: 'OBRAS' }).first();
            const cFunc = await db.cache.where({ chave: 'FUNCIONARIOS' }).first();
            const cEquip = await db.cache.where({ chave: 'EQUIPAMENTOS' }).first();
            if(cObras) processarDados(cObras.dados, cFunc?.dados || [], cEquip?.dados || []);
        }
    }
    carregar();
    return () => { window.removeEventListener('online', handleStatus); window.removeEventListener('offline', handleStatus); };
  }, []);

  const processarDados = (dadosObras: any[], dadosFunc: any[], dadosEquip: any[]) => {
      setObras(dadosObras || []);
      setCatalogoEquip(dadosEquip || []);
      const funcionarios = dadosFunc || [];
      setOpcoesGestao(funcionarios.filter((f: any) => CARGOS_GESTAO.some(c => f.FUNCAO?.toUpperCase().includes(c))));
      setOpcoesOperacional(funcionarios.filter((f: any) => !CARGOS_GESTAO.some(c => f.FUNCAO?.toUpperCase().includes(c))));
  };

  const addIndireta = () => { if(tempIndireta) { setListaIndireta([...listaIndireta, tempIndireta]); setTempIndireta(''); }};
  const addDireta = () => { if(tempDireta) { setListaDireta([...listaDireta, tempDireta]); setTempDireta(''); }};
  const addEquipamento = () => { if(tempEquip.desc) { setListaEquipamentos([...listaEquipamentos, { ...tempEquip }]); setTempEquip({ desc: '', qtd: 1 }); }};
  const removeIndireta = (idx: number) => setListaIndireta(listaIndireta.filter((_, i) => i !== idx));
  const removeDireta = (idx: number) => setListaDireta(listaDireta.filter((_, i) => i !== idx));
  const removeEquip = (idx: number) => setListaEquipamentos(listaEquipamentos.filter((_, i) => i !== idx));
  
  const handleFotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const novos = Array.from(e.target.files);
      if (arquivos.length + novos.length > 10) return alert("Limite de 10 fotos.");
      setArquivos([...arquivos, ...novos]);
      setPreviews([...previews, ...novos.map(f => URL.createObjectURL(f))]);
    }
  };
  const removeFoto = (idx: number) => { setArquivos(arquivos.filter((_, i) => i !== idx)); setPreviews(previews.filter((_, i) => i !== idx)); };

  const ClimaSelector = ({ periodo, value, onChange }: any) => (
    <div className="flex flex-col gap-1">
        <span className="text-[10px] font-bold text-gray-500 uppercase">{periodo}</span>
        <div className="flex bg-gray-100 rounded p-1 gap-1">
            {['BOM', 'CHUVA LEVE', 'CHUVA FORTE'].map(tipo => (
                <button type="button" key={tipo} onClick={() => onChange(tipo)} className={`p-2 rounded flex-1 flex justify-center transition-colors ${value === tipo ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:bg-gray-200'}`}>
                    {tipo === 'BOM' && <Sun size={16}/>}{tipo === 'CHUVA LEVE' && <Cloud size={16}/>}{tipo === 'CHUVA FORTE' && <CloudRain size={16}/>}
                </button>
            ))}
        </div>
    </div>
  );

  const proximo = () => {
      if (step === 1 && !form.atividadeId) return alert("Selecione a Obra!");
      setStep(step + 1);
  };
  const voltar = () => setStep(step - 1);

  const finalizar = async () => {
      setLoading(true);
      try {
        const rdoLocal = {
            atividadeId: parseInt(form.atividadeId),
            etapaId: form.etapaId ? parseInt(form.etapaId) : undefined, 
            data: form.data,
            horaInicio: form.horaInicio,
            horaFim: form.horaFim,
            descricao: form.descricao || "Sem descrição",
            nota: `CLIMA: M:${form.climaManha}/T:${form.climaTarde}. ÁREA: ${form.condicaoArea}. OBS: ${form.ocorrencias}`,
            status: form.status,
            efetivo: [
                ...listaIndireta.map(nome => ({ FUNCAO: `[IND] ${nome}`, QUANTIDADE: 1 })),
                ...listaDireta.map(nome => ({ FUNCAO: `[DIR] ${nome}`, QUANTIDADE: 1 }))
            ],
            equipamentos: listaEquipamentos.map(e => ({ DESCRICAO: e.desc.toUpperCase(), QUANTIDADE: Number(e.qtd) })),
            fotos: arquivos.map(file => ({ arquivo: file })), 
            sincronizado: 0,
            dataCriacao: new Date()
        };

        await db.rdos.add(rdoLocal);
        alert("RDO Salvo no Dispositivo!");
        navigate('/dashboard'); 
      } catch (error) { console.error(error); alert("Erro ao salvar."); } 
      finally { setLoading(false); }
  };

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6 pb-24 min-h-screen flex flex-col">
        
        <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                    <h1 className="text-xl font-bold text-gray-800">Novo RDO</h1>
                    {modoOffline ? <span className="text-[10px] bg-orange-200 text-orange-800 px-2 rounded font-bold animate-pulse">OFFLINE</span> : <span className="text-[10px] bg-green-100 text-green-700 px-2 rounded font-bold">ONLINE</span>}
                </div>
                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">Passo {step} de 4</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-blue-600 transition-all duration-500 ease-out" style={{ width: `${step * 25}%` }}/>
            </div>
        </div>

        <datalist id="dl-gestao">{opcoesGestao.map((f:any) => <option key={f.ID} value={`${f.NOME} (${f.FUNCAO})`} />)}</datalist>
        <datalist id="dl-operacional">{opcoesOperacional.map((f:any) => <option key={f.ID} value={`${f.NOME} (${f.FUNCAO})`} />)}</datalist>
        <datalist id="dl-equipamentos">{catalogoEquip.map((eq:any) => <option key={eq.ID} value={eq.DESCRICAO} />)}</datalist>

        <div className="flex-1 bg-white p-6 rounded-xl shadow-sm border mb-6">
            
            {step === 1 && (
                <div className="space-y-4 animate-fadeIn">
                    <div className="flex items-center gap-2 text-blue-600 font-bold border-b pb-2 mb-4"><Calendar size={20}/> Dados Gerais</div>
                    
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Obra / Contrato</label>
                        <select className="w-full p-3 border rounded-lg bg-white mt-1 outline-none focus:ring-2 focus:ring-blue-500" value={form.atividadeId} onChange={e => setForm({...form, atividadeId: e.target.value})}>
                            <option value="">{obras.length === 0 ? "Carregando..." : "Selecione..."}</option>
                            {obras.map(o => <option key={o.ID} value={o.ID}>{o.CODATIVIDADE} - {o.DESCRICAO}</option>)}
                        </select>
                    </div>

                    {etapas.length > 0 && (
                        <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                            <label className="text-xs font-bold text-blue-600 uppercase">Etapa / Fase da Obra</label>
                            <select className="w-full p-3 border border-blue-200 rounded-lg bg-white mt-1 outline-none focus:ring-2 focus:ring-blue-500" value={form.etapaId} onChange={e => setForm({...form, etapaId: e.target.value})}>
                                <option value="">-- Selecione a Etapa (Opcional) --</option>
                                {etapas.map((et:any) => (
                                    <option key={et.ID} value={et.ID}>
                                        {et.ORDEM}. {et.NOME_ETAPA} ({et.STATUS})
                                    </option>
                                ))}
                            </select>
                            <p className="text-[10px] text-blue-500 mt-1 ml-1">Selecione a fase principal do serviço de hoje.</p>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="text-xs font-bold text-gray-500 uppercase">Início</label><input type="time" className="w-full p-3 border rounded-lg mt-1" value={form.horaInicio} onChange={e => setForm({...form, horaInicio: e.target.value})}/></div>
                        <div><label className="text-xs font-bold text-gray-500 uppercase">Fim</label><input type="time" className="w-full p-3 border rounded-lg mt-1" value={form.horaFim} onChange={e => setForm({...form, horaFim: e.target.value})}/></div>
                    </div>

                    <div><label className="text-xs font-bold text-gray-500 uppercase">Data</label><input type="date" className="w-full p-3 border rounded-lg mt-1" value={form.data} onChange={e => setForm({...form, data: e.target.value})}/></div>
                </div>
            )}

            {step === 2 && (
                <div className="space-y-6 animate-fadeIn">
                    <div>
                        <div className="flex justify-between items-center border-b pb-2 mb-3">
                            <span className="flex items-center gap-2 text-blue-600 font-bold"><Users size={20}/> Equipe Indireta (Gestão)</span>
                        </div>
                        <div className="flex gap-2 mb-3"><input list="dl-gestao" className="flex-1 p-2 border rounded text-sm uppercase" placeholder="Buscar..." value={tempIndireta} onChange={e => setTempIndireta(e.target.value)} /><button type="button" onClick={addIndireta} className="bg-blue-600 text-white p-2 rounded"><Plus size={18}/></button></div>
                        {listaIndireta.length > 0 && (<div className="space-y-1">{listaIndireta.map((nome, idx) => (<div key={idx} className="flex justify-between items-center bg-blue-50 p-2 rounded border border-blue-100 text-sm"><span className="text-blue-800 font-medium">{nome}</span><button type="button" onClick={() => removeIndireta(idx)} className="text-red-400"><Trash2 size={14}/></button></div>))}</div>)}
                    </div>

                    <div>
                        <div className="flex justify-between items-center border-b pb-2 mb-3">
                            <span className="flex items-center gap-2 text-green-600 font-bold"><Users size={20}/> Equipe Direta (Execução)</span>
                        </div>
                        <div className="flex gap-2 mb-3"><input list="dl-operacional" className="flex-1 p-2 border rounded text-sm uppercase" placeholder="Buscar..." value={tempDireta} onChange={e => setTempDireta(e.target.value)} /><button type="button" onClick={addDireta} className="bg-green-600 text-white p-2 rounded"><Plus size={18}/></button></div>
                        {listaDireta.length > 0 && (<div className="space-y-1">{listaDireta.map((nome, idx) => (<div key={idx} className="flex justify-between items-center bg-green-50 p-2 rounded border border-green-100 text-sm"><span className="text-green-800 font-medium">{nome}</span><button type="button" onClick={() => removeDireta(idx)} className="text-red-400"><Trash2 size={14}/></button></div>))}</div>)}
                    </div>

                    <div>
                        <div className="flex justify-between items-center border-b pb-2 mb-3">
                            <span className="flex items-center gap-2 text-orange-600 font-bold"><Truck size={20}/> Equipamentos</span>
                        </div>
                        <div className="flex gap-2 mb-3">
                            <input list="dl-equipamentos" className="flex-1 p-2 border rounded text-sm uppercase" placeholder="Equipamento..." value={tempEquip.desc} onChange={e => setTempEquip({...tempEquip, desc: e.target.value})} />
                            <input type="number" className="w-16 p-2 border rounded text-center" value={tempEquip.qtd} onChange={e => setTempEquip({...tempEquip, qtd: parseInt(e.target.value) || 1})}/>
                            <button type="button" onClick={addEquipamento} className="bg-orange-500 text-white p-2 rounded"><Plus size={18}/></button>
                        </div>
                        {listaEquipamentos.length > 0 && (<div className="space-y-1">{listaEquipamentos.map((item, idx) => (<div key={idx} className="flex justify-between items-center bg-orange-50 p-2 rounded border border-orange-100 text-sm"><span className="text-orange-800 font-medium">{item.qtd}x {item.desc}</span><button type="button" onClick={() => removeEquip(idx)} className="text-red-400"><Trash2 size={14}/></button></div>))}</div>)}
                    </div>
                </div>
            )}

            {step === 3 && (
                <div className="space-y-6 animate-fadeIn">
                    <div className="flex items-center gap-2 text-blue-600 font-bold border-b pb-2 mb-4"><ImageIcon size={20}/> Atividades e Fotos</div>

                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase flex gap-1 mb-1"><FileText size={14}/> Atividades Executadas</label>
                        <textarea className="w-full p-3 border rounded-xl bg-gray-50 text-sm h-24" value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})} placeholder="Descreva o que foi feito..."></textarea>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase block mb-2">Evidências ({arquivos.length}/10)</label>
                        <div className="grid grid-cols-3 gap-2">
                            {previews.map((src, idx) => (
                                <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border">
                                    <img src={src} className="w-full h-full object-cover" />
                                    <button type="button" onClick={() => removeFoto(idx)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"><Trash2 size={12}/></button>
                                </div>
                            ))}
                            <label className="aspect-square flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 text-gray-400 hover:text-blue-500 transition-colors">
                                <Camera size={24}/><span className="text-xs font-bold mt-1">Adicionar</span>
                                <input type="file" multiple accept="image/*" className="hidden" onChange={handleFotos} />
                            </label>
                        </div>
                    </div>
                </div>
            )}

            {step === 4 && (
                <div className="space-y-4 animate-fadeIn">
                    <div className="flex items-center gap-2 text-green-600 font-bold border-b pb-2 mb-4"><CheckCircle size={20}/> Condições e Fechamento</div>

                    <div className="grid grid-cols-2 gap-2 mb-4">
                        <ClimaSelector periodo="Manhã" value={form.climaManha} onChange={(v:string) => setForm({...form, climaManha: v})} />
                        <ClimaSelector periodo="Tarde" value={form.climaTarde} onChange={(v:string) => setForm({...form, climaTarde: v})} />
                    </div>
                    
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Condição da Área</label>
                        <select className="w-full p-2 border rounded text-sm bg-gray-50" value={form.condicaoArea} onChange={e => setForm({...form, condicaoArea: e.target.value})}><option value="OPERAVEL">Área Operável</option><option value="PARCIAL">Operação Parcial</option><option value="INOPERAVEL">Área Inoperável</option></select>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase flex gap-1 mb-1"><AlertTriangle size={14}/> Ocorrências / Obs</label>
                        <textarea className="w-full p-3 border rounded-xl bg-gray-50 text-sm h-16" value={form.ocorrencias} onChange={e => setForm({...form, ocorrencias: e.target.value})} placeholder="Alguma observação importante?"></textarea>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Status Final do Dia</label>
                        <div className="flex gap-2">
                            <button type="button" onClick={() => setForm({...form, status: 'EM ANDAMENTO'})} className={`flex-1 py-2 rounded text-[10px] font-bold border ${form.status === 'EM ANDAMENTO' ? 'bg-blue-600 text-white' : 'bg-white text-gray-500'}`}><PlayCircle size={14}/> ANDAMENTO</button>
                            <button type="button" onClick={() => setForm({...form, status: 'CONCLUIDO'})} className={`flex-1 py-2 rounded text-[10px] font-bold border ${form.status === 'CONCLUIDO' ? 'bg-green-600 text-white' : 'bg-white text-gray-500'}`}><CheckCircle size={14}/> CONCLUÍDO</button>
                            <button type="button" onClick={() => setForm({...form, status: 'PARALISADO'})} className={`flex-1 py-2 rounded text-[10px] font-bold border ${form.status === 'PARALISADO' ? 'bg-red-500 text-white' : 'bg-white text-gray-500'}`}><PauseCircle size={14}/> PARADO</button>
                        </div>
                    </div>
                </div>
            )}

        </div>

        <div className="flex gap-4">
            {step > 1 && (<button onClick={voltar} className="flex-1 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 flex items-center justify-center gap-2"><ArrowLeft size={20}/> Voltar</button>)}
            {step < 4 ? (
                <button onClick={proximo} className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 flex items-center justify-center gap-2 shadow-lg">Próximo <ArrowRight size={20}/></button>
            ) : (
                <button onClick={finalizar} disabled={loading} className="flex-1 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 flex items-center justify-center gap-2 shadow-lg">{loading ? "Salvando..." : "FINALIZAR RDO"} <Save size={20}/></button>
            )}
        </div>

    </div>
  );
}
