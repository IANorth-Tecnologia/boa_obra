import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Trash2, Plus, Users, HardHat, DollarSign, Edit, X, Search, Truck, List } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Equipe from './Equipe'; 

export default function Config() {
    const navigate = useNavigate();
    const [aba, setAba] = useState<'OBRAS' | 'EQUIPE' | 'SERVICOS' | 'EQUIPAMENTOS'>('OBRAS');
    const [lista, setLista] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [editandoId, setEditandoId] = useState<number | null>(null);
    const [termoBusca, setTermoBusca] = useState('');

    const [formObra, setFormObra] = useState({ cod: '', desc: '', contratada: 'IANORTH', contratante: '', objetivo: '', local: '', fiscal: '', tipo: '' });
    
    const [novaEtapa, setNovaEtapa] = useState('');
    const [etapasObra, setEtapasObra] = useState<string[]>([]);

    const [formPreco, setFormPreco] = useState({ cod: '', desc: '', und: 'UN', valor: 0, tipo: 'MATERIAL' });
    const [formEquip, setFormEquip] = useState({ descricao: '', valor: 0 });

    const carregar = async (busca = '') => {
        if (aba === 'EQUIPE') return; 

        setLoading(true);
        let url = '';

        if (aba === 'OBRAS') url = '/atividades';
        if (aba === 'SERVICOS') url = busca ? `/precos?q=${busca}` : '/precos';
        if (aba === 'EQUIPAMENTOS') url = '/admin/equipamentos';

        try {
            const res = await api.get(url);
            setLista(res.data);
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    useEffect(() => { 
        cancelarEdicao(); 
        setTermoBusca('');
        carregar(''); 
    }, [aba]);

    useEffect(() => {
        if (aba === 'SERVICOS') {
            const delayDebounceFn = setTimeout(() => { carregar(termoBusca); }, 500); 
            return () => clearTimeout(delayDebounceFn);
        }
    }, [termoBusca, aba]);

    const cancelarEdicao = () => {
        setEditandoId(null);
        setFormObra({ cod: '', desc: '', contratada: 'IANORTH', contratante: '', objetivo: '', local: '', fiscal: '', tipo: '' });
        setEtapasObra([]); 
        setNovaEtapa('');
        setFormPreco({ cod: '', desc: '', und: 'UN', valor: 0, tipo: 'MATERIAL' });
        setFormEquip({ descricao: '', valor: 0 });
    };

    const iniciarEdicao = async (item: any) => {
        setEditandoId(item.ID);
        if (aba === 'OBRAS') {
            setFormObra({ 
                cod: item.CODATIVIDADE, desc: item.DESCRICAO,
                contratada: item.CONTRATADA || 'IANORTH', contratante: item.CONTRATANTE || '',
                objetivo: item.OBJETIVO || '', local: item.LOCAL || '',
                fiscal: item.FISCAL || '', tipo: item.TIPO_SERVICO || ''
            });
            
            try {
                const res = await api.get(`/etapas/obra/${item.ID}`);
                if (res.data) {
                    setEtapasObra(res.data.map((e: any) => e.NOME_ETAPA));
                }
            } catch (error) {
                console.error("Erro ao carregar etapas:", error);
                setEtapasObra([]);
            }
        }
        if (aba === 'SERVICOS') setFormPreco({ 
            cod: item.CODIGO_ITEM, desc: item.DESCRICAO, 
            und: item.UNIDADE || 'UN', valor: item.PRECO_UNITARIO,
            tipo: item.TIPO || 'MATERIAL'
        });
    };

    const addEtapaLista = () => {
        if (novaEtapa.trim()) {
            setEtapasObra([...etapasObra, novaEtapa.toUpperCase()]);
            setNovaEtapa('');
        }
    };

    const removeEtapaLista = (index: number) => {
        const novaLista = [...etapasObra];
        novaLista.splice(index, 1);
        setEtapasObra(novaLista);
    };

    const listaExibida = lista.filter(item => {
        if (aba === 'SERVICOS') return true; 
        const busca = termoBusca.toLowerCase();
        if (!busca) return true;
        
        if (aba === 'OBRAS') return (item.CODATIVIDADE?.toLowerCase().includes(busca) || item.DESCRICAO?.toLowerCase().includes(busca));
        if (aba === 'EQUIPAMENTOS') return (item.DESCRICAO?.toLowerCase().includes(busca));
        return false;
    });

    const salvarObra = async () => {
        if (!formObra.cod || !formObra.desc) return alert("Obrigatórios: Código e Descrição");
        
        const payload = { 
            CODATIVIDADE: formObra.cod, 
            DESCRICAO: formObra.desc,
            CONTRATADA: formObra.contratada, 
            CONTRATANTE: formObra.contratante,
            OBJETIVO: formObra.objetivo, 
            LOCAL: formObra.local,
            FISCAL: formObra.fiscal, 
            TIPO_SERVICO: formObra.tipo,
            ETAPAS: etapasObra 
        };

        try {
            if (editandoId) {
                await api.put(`/admin/atividades/${editandoId}`, payload);
                alert("Obra e Cronograma atualizados com sucesso!");
            } else {
                await api.post('/admin/atividades', payload);
                alert("Obra criada com sucesso! Cronograma gerado.");
            }
            cancelarEdicao(); 
            carregar(termoBusca);
        } catch (e) { 
            console.error(e);
            alert("Erro ao salvar Obra"); 
        }
    };

    const salvarPreco = async () => {
        if (!formPreco.cod) return;
        const payload = { 
            CODIGO_ITEM: formPreco.cod, DESCRICAO: formPreco.desc, 
            UNIDADE: formPreco.und, PRECO_UNITARIO: formPreco.valor,
            TIPO: formPreco.tipo
        };
        try {
            if (editandoId) await api.put(`/admin/precos/${editandoId}`, payload);
            else await api.post('/admin/precos', payload);
            cancelarEdicao(); setTermoBusca(''); carregar('');      
        } catch (e) { alert("Erro ao salvar Preço"); }
    };

    const salvarEquipamento = async () => {
        if (!formEquip.descricao) return;
        try {
            await api.post('/admin/equipamentos', { 
                DESCRICAO: formEquip.descricao.toUpperCase(),
                VALOR: parseFloat(formEquip.valor.toString()) || 0
            });
            setFormEquip({ descricao: '', valor: 0 });
            carregar();
        } catch (e) { alert("Erro ao salvar Equipamento"); }
    };

    const deletar = async (id: number) => {
        if (!confirm("Tem certeza?")) return;
        let url = '';
        if (aba === 'OBRAS') url = `/admin/atividades/${id}`;
        if (aba === 'SERVICOS') url = `/admin/precos/${id}`;
        if (aba === 'EQUIPAMENTOS') url = `/admin/equipamentos/${id}`;
        await api.delete(url);
        carregar(termoBusca);
    };

    return (
        <div className="max-w-6xl mx-auto p-4 md:p-6">
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <h1 className="text-2xl font-bold text-gray-800">Cadastros e Configurações</h1>
            </div>

            <div className="overflow-x-auto pb-2 mb-4">
                <div className="flex gap-2 border-b border-gray-200 min-w-max">
                    <button onClick={() => setAba('OBRAS')} className={`px-4 py-2 font-bold text-sm flex gap-2 items-center ${aba === 'OBRAS' ? 'bg-blue-100 text-blue-700 border-b-2 border-blue-600' : 'text-gray-500 hover:bg-gray-50'}`}><HardHat size={18}/> Obras</button>
                    <button onClick={() => setAba('EQUIPE')} className={`px-4 py-2 font-bold text-sm flex gap-2 items-center ${aba === 'EQUIPE' ? 'bg-blue-100 text-blue-700 border-b-2 border-blue-600' : 'text-gray-500 hover:bg-gray-50'}`}><Users size={18}/> Equipe</button>
                    <button onClick={() => setAba('SERVICOS')} className={`px-4 py-2 font-bold text-sm flex gap-2 items-center ${aba === 'SERVICOS' ? 'bg-blue-100 text-blue-700 border-b-2 border-blue-600' : 'text-gray-500 hover:bg-gray-50'}`}><DollarSign size={18}/> Serviços</button>
                    <button onClick={() => setAba('EQUIPAMENTOS')} className={`px-4 py-2 font-bold text-sm flex gap-2 items-center ${aba === 'EQUIPAMENTOS' ? 'bg-blue-100 text-blue-700 border-b-2 border-blue-600' : 'text-gray-500 hover:bg-gray-50'}`}><Truck size={18}/> Equipamentos</button>
                </div>
            </div>

            
            {aba === 'EQUIPE' ? (
                <div className="mt-4">
                    <Equipe />
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border p-4">
                    
                    <div className="mb-4 relative">
                        <input type="text" placeholder="Filtrar lista..." className="pl-9 pr-4 py-2 border rounded-lg w-full" value={termoBusca} onChange={e => setTermoBusca(e.target.value)}/>
                        <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                    </div>

                    <div className={`p-4 rounded-lg mb-6 border bg-gray-50`}>
                        
                        {aba === 'EQUIPAMENTOS' && (
                            <div className="flex gap-2 items-end">
                                <div className="flex-1">
                                    <label className="text-xs font-bold text-gray-500">Descrição</label>
                                    <input className="w-full p-2 border rounded" value={formEquip.descricao} onChange={e => setFormEquip({...formEquip, descricao: e.target.value })} placeholder="Ex: BETONEIRA 400L" />
                                </div>
                                <div className="w-32">
                                    <label className="text-xs font-bold text-gray-500">Valor (Op)</label>
                                    <input type="number" className="w-full p-2 border rounded" value={formEquip.valor} onChange={e => setFormEquip({...formEquip, valor: parseFloat(e.target.value) || 0 })} />
                                </div>
                                <button onClick={salvarEquipamento} className="h-10 bg-blue-600 text-white px-4 rounded font-bold flex items-center gap-2"><Plus size={20}/> Adicionar</button>
                            </div>
                        )}

                        {aba === 'OBRAS' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                                <div><label className="text-xs font-bold text-gray-500">Cód / Contrato</label><input className="w-full p-2 border rounded" value={formObra.cod} onChange={e => setFormObra({...formObra, cod: e.target.value})} placeholder="CT-001" /></div>
                                <div className="md:col-span-2 lg:col-span-3"><label className="text-xs font-bold text-gray-500">Descrição da Obra</label><input className="w-full p-2 border rounded" value={formObra.desc} onChange={e => setFormObra({...formObra, desc: e.target.value})} /></div>
                                <div><label className="text-xs font-bold text-gray-500">Contratada</label><input className="w-full p-2 border rounded" value={formObra.contratada} onChange={e => setFormObra({...formObra, contratada: e.target.value})} /></div>
                                <div><label className="text-xs font-bold text-gray-500">Contratante</label><input className="w-full p-2 border rounded" value={formObra.contratante} onChange={e => setFormObra({...formObra, contratante: e.target.value})} placeholder="Ex: SINOBRAS" /></div>
                                <div><label className="text-xs font-bold text-gray-500">Fiscal / Responsável</label><input className="w-full p-2 border rounded" value={formObra.fiscal} onChange={e => setFormObra({...formObra, fiscal: e.target.value})} /></div>
                                <div><label className="text-xs font-bold text-gray-500">Local</label><input className="w-full p-2 border rounded" value={formObra.local} onChange={e => setFormObra({...formObra, local: e.target.value})} /></div>
                                <div className="md:col-span-2 lg:col-span-4"><label className="text-xs font-bold text-gray-500">Objetivo</label><input className="w-full p-2 border rounded" value={formObra.objetivo} onChange={e => setFormObra({...formObra, objetivo: e.target.value})} /></div>

                                <div className="md:col-span-2 lg:col-span-4 bg-white p-3 rounded border border-blue-100">
                                    <label className="text-xs font-bold text-blue-600 flex gap-1 items-center mb-2"><List size={14}/> Cronograma de Etapas</label>
                                    <div className="flex gap-2 mb-2">
                                        <input 
                                            className="flex-1 p-2 border rounded text-sm uppercase" 
                                            placeholder="Ex: FUNDAÇÃO, PINTURA, ENTREGA..." 
                                            value={novaEtapa}
                                            onChange={e => setNovaEtapa(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && addEtapaLista()}
                                        />
                                        <button onClick={addEtapaLista} className="bg-blue-100 text-blue-700 p-2 rounded hover:bg-blue-200"><Plus size={18}/></button>
                                    </div>
                                    {etapasObra.length > 0 ? (
                                        <div className="flex flex-wrap gap-2">
                                            {etapasObra.map((etapa, idx) => (
                                                <span key={idx} className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-bold flex items-center gap-1 border">
                                                    {idx + 1}. {etapa}
                                                    <button onClick={() => removeEtapaLista(idx)} className="text-red-400 hover:text-red-600"><X size={12}/></button>
                                                </span>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-gray-400 italic">Nenhuma etapa definida.</p>
                                    )}
                                </div>

                                <div className="md:col-span-2 lg:col-span-4 flex gap-2 mt-2">
                                    <button onClick={salvarObra} className={`flex-1 h-12 text-white px-4 rounded font-bold flex gap-2 items-center justify-center shadow ${editandoId ? 'bg-yellow-600' : 'bg-blue-600 hover:bg-blue-700'}`}>
                                        {editandoId ? <><Edit size={20}/> Salvar Alterações</> : <><Plus size={20}/> Criar Obra</>}
                                    </button>
                                    {editandoId && <button onClick={cancelarEdicao} className="h-12 px-6 bg-gray-300 text-gray-700 rounded font-bold"><X size={20}/></button>}
                                </div>
                            </div>
                        )}

                        {aba === 'SERVICOS' && (
                            <div className="grid grid-cols-2 md:grid-cols-12 gap-3 items-end">
                                <div className="col-span-1 md:col-span-1"><label className="text-xs font-bold text-gray-500">Cód</label><input className="w-full p-2 border rounded" value={formPreco.cod} onChange={e => setFormPreco({...formPreco, cod: e.target.value})} /></div>
                                <div className="col-span-2 md:col-span-5"><label className="text-xs font-bold text-gray-500">Descrição</label><input className="w-full p-2 border rounded" value={formPreco.desc} onChange={e => setFormPreco({...formPreco, desc: e.target.value})} /></div>
                                <div className="col-span-1 md:col-span-1"><label className="text-xs font-bold text-gray-500">Unid.</label><input className="w-full p-2 border rounded" value={formPreco.und} onChange={e => setFormPreco({...formPreco, und: e.target.value})} /></div>
                                <div className="col-span-1 md:col-span-2"><label className="text-xs font-bold text-gray-500">Valor</label><input type="number" className="w-full p-2 border rounded" value={formPreco.valor} onChange={e => setFormPreco({...formPreco, valor: parseFloat(e.target.value)})} /></div>
                                <div className="col-span-2 md:col-span-2">
                                    <label className="text-xs font-bold text-gray-500">Tipo</label>
                                    <select className="w-full p-2 border rounded bg-white" value={formPreco.tipo} onChange={e => setFormPreco({...formPreco, tipo: e.target.value})}>
                                        <option value="MATERIAL">Material</option>
                                        <option value="SERVICO">Serviço</option>
                                    </select>
                                </div>
                                <div className="col-span-2 md:col-span-1 flex gap-2">
                                    <button onClick={salvarPreco} className={`flex-1 h-10 text-white rounded flex items-center justify-center ${editandoId ? 'bg-yellow-600' : 'bg-blue-600'}`}>{editandoId ? <Edit size={20}/> : <Plus size={20}/>}</button>
                                    {editandoId && <button onClick={cancelarEdicao} className="h-10 px-2 bg-gray-300 rounded"><X size={20}/></button>}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="overflow-auto max-h-[500px]">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-100 text-gray-600 sticky top-0">
                                <tr>
                                    <th className="p-3 w-20">Cód.</th>
                                    <th className="p-3">Detalhes</th>
                                    <th className="p-3 text-right w-24">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {listaExibida.length > 0 ? listaExibida.map(item => (
                                    <tr key={item.ID} className={`hover:bg-gray-50 ${editandoId === item.ID ? 'bg-yellow-50' : ''}`}>
                                        <td className="p-3 font-mono text-xs text-gray-500 align-top">
                                            {item.CODATIVIDADE || item.CODIGO_ITEM || item.ID}
                                        </td>
                                        <td className="p-3 font-medium text-gray-800 align-top">
                                            <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-2">
                                                <span>{item.DESCRICAO || item.NOME}</span>
                                                {aba === 'SERVICOS' && item.TIPO === 'SERVICO' && <span className="w-max bg-purple-100 text-purple-700 text-[10px] px-2 py-0.5 rounded-full font-bold">SERVIÇO</span>}
                                                {aba === 'SERVICOS' && (!item.TIPO || item.TIPO === 'MATERIAL') && <span className="w-max bg-orange-100 text-orange-700 text-[10px] px-2 py-0.5 rounded-full font-bold">MATERIAL</span>}
                                                
                                                {aba === 'EQUIPAMENTOS' && item.VALOR > 0 && <span className="text-green-600 font-bold ml-2">R$ {item.VALOR}</span>}
                                            </div>
                                            {item.FUNCAO && <div className="text-xs text-blue-600 font-bold mt-1">{item.FUNCAO}</div>}
                                            {item.PRECO_UNITARIO && <div className="text-xs text-green-600 font-bold mt-1">R$ {item.PRECO_UNITARIO} / {item.UNIDADE}</div>}
                                        </td>
                                        <td className="p-3 text-right flex justify-end gap-2 align-top">
                                            {aba === 'OBRAS' && (
                                                <button 
                                                    onClick={() => navigate(`/orcamentos/${item.ID}`)}
                                                    title="Gerir Orçamento"
                                                    className="text-green-600 hover:text-green-800 bg-green-50 p-1.5 rounded"
                                                >
                                                    <DollarSign size={16}/>
                                                </button>
                                            )}
                                            {aba !== 'EQUIPAMENTOS' && (
                                                <button onClick={() => iniciarEdicao(item)} className="text-blue-500 hover:text-blue-700 bg-blue-50 p-1.5 rounded"><Edit size={16}/></button>
                                            )}
                                            <button onClick={() => deletar(item.ID)} className="text-red-500 hover:text-red-700 bg-red-50 p-1.5 rounded"><Trash2 size={16}/></button>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={3} className="p-8 text-center text-gray-400">
                                            {loading ? "Carregando..." : "Nenhum item cadastrado."}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
