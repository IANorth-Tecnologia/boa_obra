import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { 
  Plus, Search, Package, Hammer, Briefcase, Trash2, Edit, X, Save, 
  ArrowLeft, HardHat, DollarSign, Printer
} from 'lucide-react';

export default function Orcamentos() {
  const [obraSelecionada, setObraSelecionada] = useState<string>('');
  const [listaObras, setListaObras] = useState<any[]>([]);
  
  const [itensCusto, setItensCusto] = useState<any[]>([]);
  const [totais, setTotais] = useState({ geral: 0, material: 0, servico: 0 });
  const [loading, setLoading] = useState(false);

  const [catalogo, setCatalogo] = useState<any[]>([]);
  const [termoBusca, setTermoBusca] = useState('');
  const [itemParaAdicionar, setItemParaAdicionar] = useState<any>(null);
  const [qtd, setQtd] = useState(1);
  const [editandoId, setEditandoId] = useState<number | null>(null);

  useEffect(() => {
      api.get('/atividades').then(res => setListaObras(res.data));
      api.get('/precos').then(res => setCatalogo(res.data)); 
  }, []);

  useEffect(() => {
      if (obraSelecionada) carregarCustosObra(parseInt(obraSelecionada));
  }, [obraSelecionada]);

  const carregarCustosObra = async (id: number) => {
      setLoading(true);
      try {
          const res = await api.get(`/orcamentos/${id}`);
          setItensCusto(res.data.itens); 
          
          const mat = res.data.itens.filter((i:any) => i.TIPO === 'MATERIAL').reduce((acc:number, cur:any) => acc + cur.TOTAL, 0);
          const serv = res.data.itens.filter((i:any) => i.TIPO === 'SERVICO').reduce((acc:number, cur:any) => acc + cur.TOTAL, 0);
          setTotais({ geral: res.data.total_geral, material: mat, servico: serv });
      } catch (e) { console.error(e); } 
      finally { setLoading(false); }
  };

  const salvarItem = async () => {
      if (!obraSelecionada) return alert("Selecione uma obra primeiro!");
      if (!itemParaAdicionar && !editandoId) return alert("Selecione um item da lista.");

      try {
          if (editandoId) {
              await api.put(`/orcamentos/item/${editandoId}`, { QUANTIDADE: parseFloat(qtd.toString()) });
          } else {
              await api.post('/orcamentos', {
                  ID_ATIVIDADE: parseInt(obraSelecionada),
                  ID_ITEM_PRECO: itemParaAdicionar.ID,
                  QUANTIDADE: parseFloat(qtd.toString())
              });
          }
          limparForm();
          carregarCustosObra(parseInt(obraSelecionada));
      } catch (e) { alert("Erro ao salvar item."); }
  };

  const removerItem = async (idItem: number) => {
      if(!confirm("Remover este custo?")) return;
      await api.delete(`/orcamentos/item/${idItem}`);
      carregarCustosObra(parseInt(obraSelecionada));
  };

  const iniciarEdicao = (item: any) => {
      setEditandoId(item.ID); 
      setTermoBusca(`${item.DESCRICAO} (Editando)`);
      setQtd(item.QTD);
      setItemParaAdicionar(null); 
  };

  const limparForm = () => {
      setEditandoId(null);
      setItemParaAdicionar(null);
      setTermoBusca('');
      setQtd(1);
  };

  const baixarPDF = () => {
      if (!obraSelecionada) return;
      window.open(`${api.defaults.baseURL}/orcamentos/${obraSelecionada}/pdf`, '_blank');
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 pb-24">
        
        <div className="bg-white p-6 rounded-xl shadow-sm border mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <DollarSign className="text-blue-600"/> Gestão de Custos
                </h1>
                <p className="text-gray-500 text-sm">Vincule materiais e serviços às obras.</p>
            </div>
            <div className="w-full md:w-1/2">
                <label className="text-xs font-bold text-gray-500 uppercase ml-1">Selecione a Obra</label>
                <select 
                    className="w-full p-3 border-2 border-blue-100 rounded-xl bg-gray-50 font-bold text-gray-700 outline-none focus:border-blue-500 transition-all"
                    value={obraSelecionada}
                    onChange={(e) => setObraSelecionada(e.target.value)}
                >
                    <option value="">-- Selecione para ver os custos --</option>
                    {listaObras.map(o => (
                        <option key={o.ID} value={o.ID}>{o.CODATIVIDADE} - {o.DESCRICAO}</option>
                    ))}
                </select>
            </div>

                {obraSelecionada && (
                    <button 
                        onClick={baixarPDF}
                        className="h-[52px] w-[52px] bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl flex items-center justify-center shadow-sm border border-gray-200 transition-colors"
                        title="Imprimir Planilha de Custos"
                    >
                        <Printer size={22}/>
                    </button>
                )}
            </div>

        {!obraSelecionada ? (
            <div className="text-center py-20 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                <HardHat size={48} className="mx-auto text-gray-300 mb-4"/>
                <h3 className="text-lg font-medium text-gray-500">Nenhuma obra selecionada</h3>
                <p className="text-sm text-gray-400">Selecione uma obra acima para gerenciar o orçamento.</p>
            </div>
        ) : (
            <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-orange-50 border border-orange-100 p-4 rounded-xl">
                        <p className="text-xs font-bold text-orange-400 uppercase flex items-center gap-1"><Package size={14}/> Materiais</p>
                        <p className="text-xl font-bold text-gray-800">R$ {totais.material.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                    </div>
                    <div className="bg-purple-50 border border-purple-100 p-4 rounded-xl">
                        <p className="text-xs font-bold text-purple-400 uppercase flex items-center gap-1"><Hammer size={14}/> Serviços</p>
                        <p className="text-xl font-bold text-gray-800">R$ {totais.servico.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                    </div>
                    <div className="bg-blue-600 text-white p-4 rounded-xl shadow-lg border border-blue-500">
                        <p className="text-xs font-bold text-blue-200 uppercase">Custo Total Previsto</p>
                        <p className="text-2xl font-bold">R$ {totais.geral.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                    </div>
                </div>

                <div className={`p-4 rounded-xl border shadow-sm mb-8 transition-colors ${editandoId ? 'bg-yellow-50 border-yellow-200' : 'bg-white'}`}>
                    <h3 className="font-bold text-gray-700 mb-3 flex gap-2 items-center">
                        {editandoId ? <><Edit size={18} className="text-yellow-600"/> Editando Quantidade</> : <><Plus size={18} className="text-blue-600"/> Adicionar Custo</>}
                    </h3>
                    
                    <div className="flex flex-col md:flex-row gap-2 items-end">
                        <div className="flex-1 w-full relative">
                            <label className="text-xs font-bold text-gray-500 uppercase">Buscar Item (Material/Serviço)</label>
                            <div className="relative mt-1">
                                <input 
                                    type="text" 
                                    placeholder="Digite para buscar no catálogo..." 
                                    className={`w-full pl-9 p-3 border rounded-lg outline-none ${editandoId ? 'bg-gray-100 text-gray-400' : 'focus:ring-2 focus:ring-blue-500'}`}
                                    value={termoBusca}
                                    disabled={!!editandoId}
                                    onChange={e => {
                                        setTermoBusca(e.target.value);
                                        setItemParaAdicionar(null);
                                    }}
                                />
                                <Search className="absolute left-3 top-3.5 text-gray-400" size={18}/>
                                
                                {!editandoId && termoBusca.length > 1 && !itemParaAdicionar && (
                                    <div className="absolute top-full left-0 right-0 bg-white border rounded-lg shadow-xl mt-1 max-h-60 overflow-auto z-50">
                                        {catalogo.filter(i => i.DESCRICAO.toUpperCase().includes(termoBusca.toUpperCase())).map((item) => (
                                            <div key={item.ID} className="p-3 hover:bg-blue-50 cursor-pointer border-b flex justify-between items-center group"
                                                onClick={() => {
                                                    setItemParaAdicionar(item);
                                                    setTermoBusca(item.DESCRICAO);
                                                }}
                                            >
                                                <div>
                                                    <div className="font-bold text-sm text-gray-800">{item.DESCRICAO}</div>
                                                    <div className="text-[10px] text-gray-400">{item.CODIGO_ITEM}</div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-xs font-bold text-green-600">R$ {item.PRECO_UNITARIO.toFixed(2)}</div>
                                                    <div className="text-[10px] text-gray-400">{item.UNIDADE}</div>
                                                </div>
                                            </div>
                                        ))}
                                        {catalogo.filter(i => i.DESCRICAO.toUpperCase().includes(termoBusca.toUpperCase())).length === 0 && (
                                            <div className="p-3 text-sm text-gray-400 text-center">Nenhum item encontrado no cadastro.</div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="w-24">
                            <label className="text-xs font-bold text-gray-500 uppercase">Qtd</label>
                            <input 
                                type="number" 
                                className="w-full p-3 border rounded-lg text-center font-bold mt-1"
                                value={qtd} 
                                onChange={e => setQtd(parseFloat(e.target.value) || 0)}
                            />
                        </div>

                        <div className="flex gap-2">
                            <button 
                                onClick={salvarItem} 
                                disabled={loading || (!itemParaAdicionar && !editandoId)}
                                className={`h-[46px] px-6 rounded-lg font-bold flex items-center gap-2 text-white shadow-md transition-transform active:scale-95 ${editandoId ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:shadow-none'}`}
                            >
                                {editandoId ? <Save size={18}/> : <Plus size={18}/>}
                                {editandoId ? 'Salvar' : 'Adicionar'}
                            </button>
                            {editandoId && (
                                <button onClick={limparForm} className="h-[46px] px-4 bg-gray-200 hover:bg-gray-300 rounded-lg text-gray-600">
                                    <X size={20}/>
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="border border-orange-200 rounded-xl overflow-hidden shadow-sm">
                        <div className="bg-orange-50 p-3 border-b border-orange-100 flex items-center gap-2">
                            <Package size={18} className="text-orange-600"/> 
                            <h3 className="font-bold text-orange-800 text-sm uppercase">Materiais</h3>
                        </div>
                        <TabelaItens itens={itensCusto.filter((i:any) => i.TIPO === 'MATERIAL')} onEdit={iniciarEdicao} onDelete={removerItem} />
                    </div>

                    <div className="border border-purple-200 rounded-xl overflow-hidden shadow-sm">
                        <div className="bg-purple-50 p-3 border-b border-purple-100 flex items-center gap-2">
                            <Hammer size={18} className="text-purple-600"/> 
                            <h3 className="font-bold text-purple-800 text-sm uppercase">Serviços / Mão de Obra</h3>
                        </div>
                        <TabelaItens itens={itensCusto.filter((i:any) => i.TIPO === 'SERVICO')} onEdit={iniciarEdicao} onDelete={removerItem} />
                    </div>
                </div>
            </>
        )}
    </div>
  );
}

const TabelaItens = ({ itens, onEdit, onDelete }: any) => {
    if (itens.length === 0) return <div className="p-4 text-center text-gray-400 text-sm">Nenhum item lançado.</div>;

    return (
        <table className="w-full text-sm text-left bg-white">
            <thead className="text-gray-500 border-b bg-gray-50 text-xs uppercase">
                <tr>
                    <th className="p-3">Descrição</th>
                    <th className="p-3 text-center">Qtd</th>
                    <th className="p-3 text-right">Unit.</th>
                    <th className="p-3 text-right">Total</th>
                    <th className="p-3 text-center w-20">Ações</th>
                </tr>
            </thead>
            <tbody className="divide-y">
                {itens.map((item: any) => (
                    <tr key={item.ID} className="hover:bg-gray-50">
                        <td className="p-3">
                            <div className="font-medium text-gray-800">{item.DESCRICAO}</div>
                            <div className="text-[10px] text-gray-400 font-mono">{item.CODIGO}</div>
                        </td>
                        <td className="p-3 text-center font-bold">{item.QTD}</td>
                        <td className="p-3 text-right text-gray-500">R$ {item.UNITARIO.toFixed(2)}</td>
                        <td className="p-3 text-right font-bold text-gray-800">R$ {item.TOTAL.toFixed(2)}</td>
                        <td className="p-3 flex justify-center gap-1">
                            <button onClick={() => onEdit(item)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Edit size={16}/></button>
                            <button onClick={() => onDelete(item.ID)} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><Trash2 size={16}/></button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
};
