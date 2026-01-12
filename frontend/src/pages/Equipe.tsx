import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { 
  Users, UserPlus, Search, Briefcase, 
  CheckCircle, XCircle, Edit, Camera, Layers, Hash, Settings, Save, Trash2,
  Shield, Key, Lock, AlertTriangle, Eye, EyeOff 
} from 'lucide-react';

export default function Equipe() {
  const [lista, setLista] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [termoBusca, setTermoBusca] = useState('');
  const [grupoAtivo, setGrupoAtivo] = useState('TODOS');
  
  const [modalAberto, setModalAberto] = useState(false);
  const [modalGrupos, setModalGrupos] = useState(false);

  const [modalResetAberto, setModalResetAberto] = useState(false);
  const [usuarioParaReset, setUsuarioParaReset] = useState<{id: number, nome: string} | null>(null);
  const [novaSenhaReset, setNovaSenhaReset] = useState('');
  
  const [mostrarSenhaCriacao, setMostrarSenhaCriacao] = useState(false);
  const [mostrarSenhaReset, setMostrarSenhaReset] = useState(false);

  const [form, setForm] = useState({ 
      id: 0, nome: '', funcao: '', matricula: '', grupo: '', 
      cpf: '', perfil: 'COLABORADOR', senha: '' 
  });
  
  const [fotoSelecionada, setFotoSelecionada] = useState<File | null>(null);
  const [previewFoto, setPreviewFoto] = useState<string | null>(null);

  const [grupoEditando, setGrupoEditando] = useState<string | null>(null);
  const [novoNomeGrupo, setNovoNomeGrupo] = useState('');

  const carregarEquipe = async () => {
    setLoading(true);
    try {
        const res = await api.get('/admin/funcionarios');
        setLista(res.data);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { carregarEquipe(); }, []);

  const gruposUnicos = Array.from(new Set(lista.map(i => i.GRUPO || 'GERAL'))).filter(Boolean).sort();
  const grupos = ['TODOS', ...gruposUnicos];

  const salvar = async () => {
    if (!form.nome || !form.funcao) return alert("Preencha nome e função");
    if (!form.id && !form.senha) return alert("Para novos usuários, a senha é obrigatória.");

    try {
        const payload = { 
            NOME: form.nome.toUpperCase(), 
            FUNCAO: form.funcao.toUpperCase(),
            MATRICULA: form.matricula,
            GRUPO: form.grupo.toUpperCase() || 'GERAL',
            CPF: form.cpf,
            PERFIL: form.perfil,
            SENHA: form.senha 
        };
        
        let idFuncionario = form.id;

        if (form.id) {
            await api.put(`/admin/funcionarios/${form.id}`, payload);
        } else {
            const res = await api.post('/admin/funcionarios', payload);
            idFuncionario = res.data.id;
        }

        if (fotoSelecionada && idFuncionario) {
            const formData = new FormData();
            formData.append('file', fotoSelecionada);
            await api.post(`/admin/funcionarios/${idFuncionario}/foto`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
        }
        
        fecharModal();
        carregarEquipe();
        alert("Salvo com sucesso!");
    } catch (e: any) { 
        alert(e.response?.data?.detail || "Erro ao salvar."); 
    }
  };

  const abrirModalReset = (funcionario: any) => {
      setUsuarioParaReset({ id: funcionario.ID, nome: funcionario.NOME });
      setNovaSenhaReset('');
      setMostrarSenhaReset(false); 
      setModalResetAberto(true);
  };

  const confirmarResetSenha = async () => {
      if (!usuarioParaReset || !novaSenhaReset) return alert("Digite a nova senha.");

      try {
          await api.put(`/admin/funcionarios/${usuarioParaReset.id}/senha`, { NOVA_SENHA: novaSenhaReset });
          alert(`Senha de ${usuarioParaReset.nome} atualizada!`);
          setModalResetAberto(false);
          setUsuarioParaReset(null);
          setNovaSenhaReset('');
      } catch (e) { alert("Erro ao atualizar senha."); }
  };

  const alternarStatus = async (funcionario: any) => {
      try {
          await api.patch(`/admin/funcionarios/${funcionario.ID}/status`, { STATUS: funcionario.STATUS === 1 ? 0 : 1 });
          carregarEquipe();
      } catch (e) { alert("Erro ao atualizar status"); }
  };

  const editar = (f: any) => {
      setForm({ 
          id: f.ID, nome: f.NOME, funcao: f.FUNCAO, 
          matricula: f.MATRICULA || '', grupo: f.GRUPO || 'GERAL',
          cpf: f.CPF || '', perfil: f.PERFIL || 'COLABORADOR', senha: '' 
      });
      setPreviewFoto(`${api.defaults.baseURL}/admin/funcionarios/${f.ID}/foto?ts=${Date.now()}`);
      setMostrarSenhaCriacao(false);
      setModalAberto(true);
  };

  const salvarRenomeacaoGrupo = async (nomeAntigo: string) => {
      if (!novoNomeGrupo || novoNomeGrupo === nomeAntigo) { setGrupoEditando(null); return; }
      try { await api.put('/admin/grupos/renomear', { nome_antigo: nomeAntigo, nome_novo: novoNomeGrupo }); setGrupoEditando(null); setNovoNomeGrupo(''); carregarEquipe(); } catch (error) { alert("Erro ao renomear grupo."); }
  };
  const deletarGrupo = async (nomeGrupo: string) => {
      if (!confirm(`Deseja extinguir o grupo "${nomeGrupo}"? Todos os membros serão movidos para "GERAL".`)) return;
      try { await api.put('/admin/grupos/renomear', { nome_antigo: nomeGrupo, nome_novo: "GERAL" }); carregarEquipe(); } catch (error) { alert("Erro ao remover grupo."); }
  };

  const fecharModal = () => {
      setModalAberto(false);
      setForm({ id: 0, nome: '', funcao: '', matricula: '', grupo: '', cpf: '', perfil: 'COLABORADOR', senha: '' });
      setFotoSelecionada(null);
      setPreviewFoto(null);
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          setFotoSelecionada(file);
          setPreviewFoto(URL.createObjectURL(file));
      }
  };

  const listaFiltrada = lista.filter(item => {
      const matchTexto = item.NOME.toLowerCase().includes(termoBusca.toLowerCase()) ||
                         item.FUNCAO.toLowerCase().includes(termoBusca.toLowerCase());
      const matchGrupo = grupoAtivo === 'TODOS' || (item.GRUPO || 'GERAL') === grupoAtivo;
      return matchTexto && matchGrupo;
  });

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 pb-24">
      
      <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4 mb-6">
          <div>
              <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                  <Users className="text-blue-600"/> Gestão de Equipe
              </h1>
              <p className="text-gray-500 text-sm mt-1">Gerencie colaboradores, acessos e senhas.</p>
          </div>
          <button 
            onClick={() => { fecharModal(); setModalAberto(true); }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 flex items-center gap-2 shadow-sm"
          >
              <UserPlus size={20}/> Novo Colaborador
          </button>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
          
          <div className="w-full md:w-64 flex-shrink-0">
              <div className="bg-white rounded-xl shadow-sm border p-4 sticky top-4">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-bold text-gray-700 flex items-center gap-2"><Layers size={18}/> Grupos</h3>
                    <button onClick={() => setModalGrupos(true)} className="text-gray-400 hover:text-blue-600" title="Gerenciar Grupos"><Settings size={16} /></button>
                  </div>
                  <div className="flex flex-col gap-1">
                      {grupos.map(g => (
                          <button key={g} onClick={() => setGrupoAtivo(g)} className={`text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors flex justify-between ${grupoAtivo === g ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}>
                              {g}
                              {g !== 'TODOS' && <span className="bg-gray-200 text-gray-600 px-1.5 rounded-full text-xs">{lista.filter(i => (i.GRUPO || 'GERAL') === g).length}</span>}
                          </button>
                      ))}
                  </div>
              </div>
          </div>

          <div className="flex-1">
                <div className="bg-white p-3 rounded-xl shadow-sm border mb-6 relative">
                    <input 
                        type="text" placeholder="Buscar por nome, função ou matrícula..." 
                        className="w-full pl-10 pr-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                        value={termoBusca} onChange={e => setTermoBusca(e.target.value)}
                    />
                    <Search className="absolute left-6 top-5 text-gray-400" size={20}/>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                    {listaFiltrada.map(func => (
                        <div key={func.ID} className={`bg-white rounded-xl p-4 border shadow-sm flex flex-col gap-3 relative group ${func.STATUS === 0 ? 'opacity-60 bg-gray-50' : ''}`}>
                            <div className="flex items-start gap-3">
                                <div className="w-14 h-14 rounded-full bg-gray-100 flex-shrink-0 overflow-hidden border">
                                    <img 
                                        src={`${api.defaults.baseURL}/admin/funcionarios/${func.ID}/foto`} alt={func.NOME}
                                        className="w-full h-full object-cover"
                                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden'); }}
                                    />
                                    <div className="hidden w-full h-full flex items-center justify-center font-bold text-gray-400 text-lg">{func.NOME.charAt(0)}</div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-gray-800 truncate leading-tight" title={func.NOME}>{func.NOME}</h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className={`text-[10px] px-1.5 rounded font-bold uppercase border ${func.PERFIL === 'ADMIN' ? 'bg-purple-50 text-purple-700 border-purple-200' : func.PERFIL === 'GESTOR' ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>{func.PERFIL || 'COLABORADOR'}</span>
                                        <span className="text-[10px] text-gray-400 flex items-center gap-1"><Briefcase size={10}/> {func.FUNCAO}</span>
                                    </div>
                                    <div className="flex gap-2 mt-1">
                                        <span className="text-[10px] bg-gray-100 px-1.5 rounded text-gray-500 font-mono flex items-center gap-1"><Hash size={10}/> {func.MATRICULA || 'S/M'}</span>
                                        <span className="text-[10px] bg-gray-100 px-1.5 rounded text-gray-500 font-bold uppercase">{func.GRUPO || 'GERAL'}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-2 mt-2 pt-3 border-t">
                                <button onClick={() => editar(func)} className="flex-1 text-sm font-bold text-blue-600 hover:bg-blue-50 py-1.5 rounded flex items-center justify-center gap-1"><Edit size={14}/> Editar</button>
                                <button onClick={() => abrirModalReset(func)} className="w-8 h-8 flex items-center justify-center text-yellow-600 hover:bg-yellow-50 rounded" title="Redefinir Senha"><Key size={14}/></button>
                                <button onClick={() => alternarStatus(func)} className={`w-8 h-8 flex items-center justify-center rounded ${func.STATUS === 1 ? 'text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`} title={func.STATUS === 1 ? "Desativar" : "Ativar"}>{func.STATUS === 1 ? <XCircle size={16}/> : <CheckCircle size={16}/>}</button>
                            </div>
                        </div>
                    ))}
                </div>
          </div>
      </div>

      {modalAberto && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-auto">
                  <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">{form.id ? 'Editar Colaborador' : 'Novo Colaborador'}</h2>
                  
                  <div className="flex justify-center mb-6">
                      <div className="relative group cursor-pointer w-24 h-24">
                          <div className="w-24 h-24 rounded-full bg-gray-100 overflow-hidden border-2 border-dashed border-gray-300 flex items-center justify-center">
                              {previewFoto ? <img src={previewFoto} className="w-full h-full object-cover" /> : <Users className="text-gray-300" size={40}/>}
                          </div>
                          <label className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full cursor-pointer shadow-lg hover:bg-blue-700">
                              <Camera size={16}/><input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                          </label>
                      </div>
                  </div>
                  
                  <div className="space-y-3">
                      <div><label className="text-xs font-bold text-gray-500">Nome</label><input className="w-full p-2 border rounded-lg" value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} /></div>
                      <div className="grid grid-cols-2 gap-3">
                        <div><label className="text-xs font-bold text-gray-500">Função</label><input className="w-full p-2 border rounded-lg" value={form.funcao} onChange={e => setForm({...form, funcao: e.target.value})} /></div>
                        <div><label className="text-xs font-bold text-gray-500">Matrícula</label><input className="w-full p-2 border rounded-lg" value={form.matricula} onChange={e => setForm({...form, matricula: e.target.value})} /></div>
                      </div>
                      <div>
                          <label className="text-xs font-bold text-gray-500">Grupo</label>
                          <input className="w-full p-2 border rounded-lg" placeholder="Ex: TI" value={form.grupo} onChange={e => setForm({...form, grupo: e.target.value})} list="sugestoes-grupos"/>
                          <datalist id="sugestoes-grupos">{gruposUnicos.map(g => <option key={g} value={g} />)}</datalist>
                      </div>

                      <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 mt-4 space-y-3">
                          <h3 className="text-xs font-bold text-blue-600 uppercase flex gap-1 items-center"><Shield size={12}/> Acesso</h3>
                          <div className="grid grid-cols-2 gap-3">
                              <div><label className="text-[10px] font-bold text-gray-500">CPF</label><input className="w-full p-2 border rounded text-sm bg-white" value={form.cpf} onChange={e => setForm({...form, cpf: e.target.value})} placeholder="Apenas números"/></div>
                              <div>
                                  <label className="text-[10px] font-bold text-gray-500">Perfil</label>
                                  <select className="w-full p-2 border rounded text-sm bg-white" value={form.perfil} onChange={e => setForm({...form, perfil: e.target.value})}>
                                      <option value="COLABORADOR">Colaborador</option><option value="GESTOR">Gestor</option><option value="ADMIN">Admin</option>
                                  </select>
                              </div>
                          </div>
                          
                          {!form.id && (
                              <div>
                                  <label className="text-[10px] font-bold text-gray-500 uppercase flex gap-1 items-center"><Lock size={10}/> Senha Inicial</label>
                                  <div className="relative">
                                      <input 
                                        type={mostrarSenhaCriacao ? "text" : "password"}
                                        className="w-full p-2 border rounded text-sm bg-white pr-10" 
                                        value={form.senha} 
                                        onChange={e => setForm({...form, senha: e.target.value})}
                                        placeholder="Defina uma senha..."
                                      />
                                      <button 
                                        type="button"
                                        onClick={() => setMostrarSenhaCriacao(!mostrarSenhaCriacao)}
                                        className="absolute right-2 top-2 text-gray-400 hover:text-blue-600"
                                      >
                                          {mostrarSenhaCriacao ? <EyeOff size={16}/> : <Eye size={16}/>}
                                      </button>
                                  </div>
                              </div>
                          )}
                      </div>
                  </div>
                  <div className="flex gap-3 mt-6">
                      <button onClick={fecharModal} className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-lg">Cancelar</button>
                      <button onClick={salvar} className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-lg">Salvar</button>
                  </div>
              </div>
          </div>
      )}

      {modalResetAberto && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden">
                  <div className="bg-yellow-50 p-6 flex flex-col items-center justify-center border-b border-yellow-100">
                      <div className="bg-yellow-100 p-3 rounded-full mb-3 text-yellow-600"><Lock size={32} /></div>
                      <h2 className="text-xl font-bold text-gray-800">Redefinir Senha</h2>
                      <p className="text-sm text-gray-500 text-center mt-1">Para <strong>{usuarioParaReset?.nome}</strong></p>
                  </div>
                  <div className="p-6 space-y-4">
                      <div>
                          <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Nova Senha</label>
                          <div className="relative">
                              <Key className="absolute left-3 top-2.5 text-gray-400" size={16}/>
                              <input 
                                type={mostrarSenhaReset ? "text" : "password"} 
                                autoFocus
                                className="w-full pl-9 pr-10 py-2 border rounded-lg focus:ring-2 focus:ring-yellow-400 outline-none"
                                placeholder="Digite a nova senha..."
                                value={novaSenhaReset}
                                onChange={e => setNovaSenhaReset(e.target.value)}
                              />
                              <button 
                                type="button"
                                onClick={() => setMostrarSenhaReset(!mostrarSenhaReset)}
                                className="absolute right-3 top-2.5 text-gray-400 hover:text-yellow-600"
                              >
                                  {mostrarSenhaReset ? <EyeOff size={16}/> : <Eye size={16}/>}
                              </button>
                          </div>
                      </div>
                      <div className="flex gap-3 pt-2">
                          <button onClick={() => setModalResetAberto(false)} className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-lg">Cancelar</button>
                          <button onClick={confirmarResetSenha} className="flex-1 py-2.5 bg-yellow-500 text-white font-bold rounded-lg shadow-md">Confirmar</button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {modalGrupos && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
                  <div className="flex justify-between items-center mb-4 border-b pb-2">
                      <h2 className="text-xl font-bold text-gray-800">Gerenciar Grupos</h2>
                      <button onClick={() => setModalGrupos(false)}><XCircle className="text-gray-400 hover:text-red-500"/></button>
                  </div>
                  <div className="space-y-2 max-h-[60vh] overflow-auto">
                      {gruposUnicos.map(grupo => (
                          <div key={grupo} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                              {grupoEditando === grupo ? (
                                  <div className="flex flex-1 gap-2">
                                      <input className="flex-1 p-1 border rounded text-sm" autoFocus value={novoNomeGrupo} onChange={e => setNovoNomeGrupo(e.target.value)} placeholder="Novo nome..." />
                                      <button onClick={() => salvarRenomeacaoGrupo(grupo)} className="text-green-600"><Save size={18}/></button>
                                      <button onClick={() => setGrupoEditando(null)} className="text-red-400"><XCircle size={18}/></button>
                                  </div>
                              ) : (
                                  <>
                                    <span className="font-bold text-gray-700">{grupo}</span>
                                    <div className="flex gap-2">
                                        <button onClick={() => { setGrupoEditando(grupo); setNovoNomeGrupo(grupo); }} className="text-blue-400 hover:text-blue-600"><Edit size={16}/></button>
                                        <button onClick={() => deletarGrupo(grupo)} className="text-red-400 hover:text-red-600"><Trash2 size={16}/></button>
                                    </div>
                                  </>
                              )}
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      )}

    </div>
  );
}
