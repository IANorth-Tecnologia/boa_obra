import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Camera, Save, AlertTriangle, CheckCircle, Clock, FileText, ChevronDown, Plus, Trash2, Users, Truck } from 'lucide-react';

export default function RDO() {
    const [obras, setObras] = useState<any[]>([]);
    const [obraSelecionada, setObraSelecionada] = useState<string>('');
    const [etapas, setEtapas] = useState<any[]>([]);
    const [etapaSelecionada, setEtapaSelecionada] = useState<any>(null);

    // Formulário do RDO
    const [form, setForm] = useState({
        status: '',
        observacao: '',
        fotos: [] as File[],
        // Campos de Fechamento (Volta do Efetivo e Equipamentos)
        efetivo: [] as { FUNCAO: string, QUANTIDADE: number }[],
        equipamentos: [] as { DESCRICAO: string, QUANTIDADE: number }[]
    });

    // Estados temporários para adicionar itens nas listas
    const [tempEfetivo, setTempEfetivo] = useState({ funcao: '', qtd: 1 });
    const [tempEquip, setTempEquip] = useState({ desc: '', qtd: 1 });
    const [mostrarFechamento, setMostrarFechamento] = useState(false); // Controla se mostra os campos finais

    const [loading, setLoading] = useState(false);

    // 1. Carregar Obras ao abrir
    useEffect(() => {
        api.get('/atividades').then(res => setObras(res.data));
    }, []);

    // 2. Quando seleciona a Obra, busca as Etapas
    useEffect(() => {
        if (obraSelecionada) {
            setLoading(true);
            setEtapas([]);
            setEtapaSelecionada(null);
            
            api.get(`/etapas/obra/${obraSelecionada}`)
                .then(res => {
                    setEtapas(res.data);
                    setLoading(false);
                })
                .catch(err => {
                    console.error(err);
                    setLoading(false);
                });
        }
    }, [obraSelecionada]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setForm({ ...form, fotos: [...form.fotos, ...Array.from(e.target.files)] });
        }
    };

    // Funções auxiliares para Efetivo e Equipamento
    const addEfetivo = () => {
        if (!tempEfetivo.funcao) return;
        setForm({ ...form, efetivo: [...form.efetivo, { FUNCAO: tempEfetivo.funcao.toUpperCase(), QUANTIDADE: tempEfetivo.qtd }] });
        setTempEfetivo({ funcao: '', qtd: 1 });
    };
    
    const removeEfetivo = (idx: number) => {
        const nova = [...form.efetivo];
        nova.splice(idx, 1);
        setForm({...form, efetivo: nova});
    };

    const addEquip = () => {
        if (!tempEquip.desc) return;
        setForm({ ...form, equipamentos: [...form.equipamentos, { DESCRICAO: tempEquip.desc.toUpperCase(), QUANTIDADE: tempEquip.qtd }] });
        setTempEquip({ desc: '', qtd: 1 });
    };

    const removeEquip = (idx: number) => {
        const nova = [...form.equipamentos];
        nova.splice(idx, 1);
        setForm({...form, equipamentos: nova});
    };


    const salvarRDO = async () => {
        if (!etapaSelecionada) return alert("Selecione uma etapa!");
        if (!form.status) return alert("Defina o status do dia!");

        try {
            setLoading(true);

            // 1. Salva os dados do RDO
            const payload = {
                ID_ATIVIDADE: parseInt(obraSelecionada),
                ID_ETAPA: etapaSelecionada.ID,
                DATAINICIO: new Date().toISOString(),
                DATAFIM: new Date().toISOString(),
                DESCRICAO: `Apontamento na etapa: ${etapaSelecionada.NOME_ETAPA}`,
                NOTA: form.observacao,
                STATUS: form.status,
                PENDENCIA: form.status === 'IMPEDIMENTO' ? form.observacao : '',
                EFETIVO: form.efetivo,          // Envia a lista preenchida
                EQUIPAMENTOS: form.equipamentos // Envia a lista preenchida
            };

            const res = await api.post('/rdo', payload);
            const rdoId = res.data.id;

            // 2. Se tiver fotos, envia agora
            if (form.fotos.length > 0) {
                const formData = new FormData();
                form.fotos.forEach(file => formData.append('files', file));
                await api.post(`/rdo/${rdoId}/fotos`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            }

            alert("✅ RDO Salvo com Sucesso!");
            
            // Limpa formulário
            setForm({ status: '', observacao: '', fotos: [], efetivo: [], equipamentos: [] });
            setMostrarFechamento(false);
            setEtapaSelecionada(null);
            setLoading(false);

        } catch (error) {
            console.error(error);
            alert("Erro ao salvar RDO. Tente novamente.");
            setLoading(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto p-4 pb-32">
            <h1 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <FileText className="text-blue-600" /> Novo RDO
            </h1>

            {/* 1. SELEÇÃO DE OBRA */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-4">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">1. Selecione a Obra</label>
                <div className="relative">
                    <select 
                        className="w-full p-4 pr-10 border border-gray-300 rounded-xl bg-gray-50 text-gray-900 font-medium text-base appearance-none focus:ring-2 focus:ring-blue-500 outline-none"
                        value={obraSelecionada}
                        onChange={e => setObraSelecionada(e.target.value)}
                        style={{ fontSize: '16px' }} 
                    >
                        <option value="">Toque para selecionar...</option>
                        {obras.map((obra: any) => (
                            <option key={obra.ID} value={obra.ID}>
                                {obra.DESCRICAO}
                            </option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-4 text-gray-400 pointer-events-none" size={20} />
                </div>
            </div>

            {/* 2. LISTA DE ETAPAS */}
            {obraSelecionada && (
                <div className="mb-6 animate-in fade-in slide-in-from-bottom-2">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2 px-1">2. Qual etapa você trabalhou hoje?</label>
                    
                    {loading && etapas.length === 0 ? (
                        <div className="p-8 text-center text-gray-500 bg-gray-50 rounded-xl border border-dashed">
                            Carregando cronograma...
                        </div>
                    ) : etapas.length === 0 ? (
                        <div className="bg-yellow-50 text-yellow-800 p-4 rounded-xl border border-yellow-200 text-sm">
                            ⚠️ Esta obra ainda não tem cronograma definido.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto pb-2">
                            {etapas.map((etapa) => (
                                <button
                                    key={etapa.ID}
                                    onClick={() => setEtapaSelecionada(etapa)}
                                    className={`p-4 rounded-xl text-left transition-all border-2 relative ${
                                        etapaSelecionada?.ID === etapa.ID 
                                            ? 'bg-blue-600 border-blue-600 text-white shadow-md transform scale-[1.02]' 
                                            : 'bg-white border-transparent shadow-sm hover:bg-gray-50 text-gray-700'
                                    }`}
                                >
                                    <div className="text-[10px] opacity-80 font-bold tracking-wider mb-0.5">ETAPA {etapa.ORDEM}</div>
                                    <div className="font-bold text-base leading-tight">{etapa.NOME_ETAPA}</div>
                                    {etapaSelecionada?.ID === etapa.ID && (
                                        <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 text-white" size={20} />
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* 3. FORMULÁRIO PRINCIPAL */}
            {etapaSelecionada && (
                <div className="bg-white rounded-xl shadow-xl border border-blue-100 overflow-hidden animate-in zoom-in-95 duration-200">
                    <div className="bg-blue-50 p-3 border-b border-blue-100 text-center">
                        <span className="text-xs font-bold text-blue-600 uppercase">Preenchendo:</span>
                        <div className="font-bold text-gray-800 text-sm line-clamp-1">{etapaSelecionada.NOME_ETAPA}</div>
                    </div>
                    
                    <div className="p-5 space-y-6">
                        
                        {/* Status */}
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">3. Status do Serviço</label>
                            <div className="grid grid-cols-1 gap-2">
                                <button 
                                    onClick={() => setForm({...form, status: 'EM ANDAMENTO'})}
                                    className={`p-3 rounded-lg border-2 flex items-center justify-center gap-3 transition-colors ${
                                        form.status === 'EM ANDAMENTO' ? 'bg-blue-100 border-blue-500 text-blue-800 font-bold' : 'border-gray-100 bg-gray-50 text-gray-600'
                                    }`}
                                >
                                    <Clock size={20}/> EM ANDAMENTO
                                </button>
                                <div className="grid grid-cols-2 gap-2">
                                    <button 
                                        onClick={() => setForm({...form, status: 'CONCLUIDO'})}
                                        className={`p-3 rounded-lg border-2 flex flex-col items-center justify-center gap-1 transition-colors ${
                                            form.status === 'CONCLUIDO' ? 'bg-green-100 border-green-500 text-green-800 font-bold' : 'border-gray-100 bg-gray-50 text-gray-600'
                                        }`}
                                    >
                                        <CheckCircle size={20}/> CONCLUÍDO
                                    </button>
                                    <button 
                                        onClick={() => setForm({...form, status: 'IMPEDIMENTO'})}
                                        className={`p-3 rounded-lg border-2 flex flex-col items-center justify-center gap-1 transition-colors ${
                                            form.status === 'IMPEDIMENTO' ? 'bg-red-100 border-red-500 text-red-800 font-bold' : 'border-gray-100 bg-gray-50 text-gray-600'
                                        }`}
                                    >
                                        <AlertTriangle size={20}/> IMPEDIMENTO
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Fotos */}
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">4. Fotos do Dia</label>
                            <label className="border-2 border-dashed border-gray-300 rounded-xl p-6 flex flex-col items-center justify-center text-gray-400 bg-gray-50 active:bg-gray-100 cursor-pointer relative transition-colors hover:border-blue-400 hover:text-blue-500">
                                <input 
                                    type="file" 
                                    multiple 
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    className="hidden"
                                />
                                <Camera size={36} className="mb-2" />
                                <span className="text-sm font-medium">Toque para adicionar fotos</span>
                            </label>
                            {form.fotos.length > 0 && (
                                <div className="mt-3 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                                    {form.fotos.map((foto, idx) => (
                                        <div key={idx} className="h-20 w-20 bg-gray-200 rounded-lg flex-shrink-0 bg-cover bg-center border border-gray-300 shadow-sm" style={{backgroundImage: `url(${URL.createObjectURL(foto)})`}}></div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Observação */}
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">5. Diário de Obra</label>
                            <textarea 
                                className="w-full p-3 border border-gray-300 rounded-xl text-base focus:ring-2 focus:ring-blue-500 outline-none min-h-[100px]"
                                placeholder="Descreva o que foi feito hoje..."
                                value={form.observacao}
                                onChange={e => setForm({...form, observacao: e.target.value})}
                                style={{ fontSize: '16px' }}
                            ></textarea>
                        </div>

                        {/* SEÇÃO DE FECHAMENTO (EFETIVO E EQUIPAMENTOS) */}
                        <div className="border-t pt-4">
                            <button 
                                onClick={() => setMostrarFechamento(!mostrarFechamento)}
                                className="w-full py-2 text-blue-600 font-bold text-sm flex items-center justify-between"
                            >
                                <span>6. Informações de Fechamento (Opcional)</span>
                                <ChevronDown size={16} className={`transform transition-transform ${mostrarFechamento ? 'rotate-180' : ''}`}/>
                            </button>

                            {mostrarFechamento && (
                                <div className="mt-4 space-y-6 animate-in slide-in-from-top-2">
                                    {/* Efetivo */}
                                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                                        <label className="text-xs font-bold text-gray-500 flex gap-2 items-center mb-2"><Users size={14}/> Efetivo / Equipe</label>
                                        <div className="flex gap-2 mb-2">
                                            <input 
                                                className="flex-1 p-2 border rounded-lg text-base" 
                                                placeholder="Função (Ex: Pedreiro)"
                                                value={tempEfetivo.funcao}
                                                onChange={e => setTempEfetivo({...tempEfetivo, funcao: e.target.value})}
                                                style={{ fontSize: '16px' }}
                                            />
                                            <input 
                                                type="number" 
                                                className="w-16 p-2 border rounded-lg text-center text-base" 
                                                value={tempEfetivo.qtd}
                                                onChange={e => setTempEfetivo({...tempEfetivo, qtd: parseInt(e.target.value) || 0})}
                                                style={{ fontSize: '16px' }}
                                            />
                                            <button onClick={addEfetivo} className="bg-blue-600 text-white p-2 rounded-lg"><Plus size={20}/></button>
                                        </div>
                                        {form.efetivo.map((item, idx) => (
                                            <div key={idx} className="flex justify-between items-center bg-white p-2 rounded border mb-1 shadow-sm">
                                                <span className="font-bold text-gray-700">{item.QUANTIDADE}x {item.FUNCAO}</span>
                                                <button onClick={() => removeEfetivo(idx)} className="text-red-400"><Trash2 size={16}/></button>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Equipamentos */}
                                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                                        <label className="text-xs font-bold text-gray-500 flex gap-2 items-center mb-2"><Truck size={14}/> Equipamentos</label>
                                        <div className="flex gap-2 mb-2">
                                            <input 
                                                className="flex-1 p-2 border rounded-lg text-base" 
                                                placeholder="Ex: Furadeira"
                                                value={tempEquip.desc}
                                                onChange={e => setTempEquip({...tempEquip, desc: e.target.value})}
                                                style={{ fontSize: '16px' }}
                                            />
                                            <input 
                                                type="number" 
                                                className="w-16 p-2 border rounded-lg text-center text-base" 
                                                value={tempEquip.qtd}
                                                onChange={e => setTempEquip({...tempEquip, qtd: parseInt(e.target.value) || 0})}
                                                style={{ fontSize: '16px' }}
                                            />
                                            <button onClick={addEquip} className="bg-blue-600 text-white p-2 rounded-lg"><Plus size={20}/></button>
                                        </div>
                                        {form.equipamentos.map((item, idx) => (
                                            <div key={idx} className="flex justify-between items-center bg-white p-2 rounded border mb-1 shadow-sm">
                                                <span className="font-bold text-gray-700">{item.QUANTIDADE}x {item.DESCRICAO}</span>
                                                <button onClick={() => removeEquip(idx)} className="text-red-400"><Trash2 size={16}/></button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* BOTÃO FINAL */}
                        <button 
                            onClick={salvarRDO}
                            disabled={loading}
                            className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl shadow-lg active:scale-95 transition-transform flex justify-center items-center gap-2 disabled:opacity-50 disabled:scale-100 text-lg"
                        >
                            {loading ? "Enviando..." : <><Save size={24} /> SALVAR APONTAMENTO</>}
                        </button>

                    </div>
                </div>
            )}
        </div>
    );
}
