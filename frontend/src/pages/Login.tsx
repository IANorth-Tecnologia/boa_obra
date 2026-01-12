import React, { useState } from 'react';
import { api } from '../lib/api';
import { useNavigate } from 'react-router-dom';
import { Lock, User, ShieldCheck, Eye, EyeOff } from 'lucide-react'; 

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ login: '', senha: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [mostrarSenha, setMostrarSenha] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
        const formData = new URLSearchParams();
        formData.append('username', form.login); 
        formData.append('password', form.senha);

        const res = await api.post('/token', formData, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        localStorage.setItem('token', res.data.access_token);
        localStorage.setItem('perfil', res.data.perfil);
        localStorage.setItem('usuario_nome', res.data.nome);

        if (res.data.perfil === 'GESTOR') navigate('/dashboard-gerencia');
        else if (res.data.perfil === 'ADMIN') navigate('/config');
        else navigate('/dashboard'); 

    } catch (err) {
        setError('Login ou senha incorretos.');
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-blue-700 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md">
            <div className="text-center mb-8">
                <div className="bg-blue-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ShieldCheck size={40} className="text-blue-700"/>
                </div>
                <h1 className="text-2xl font-bold text-gray-800">BOA OBRA</h1>
                <p className="text-gray-500">Acesse sua conta para continuar</p>
            </div>

            {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm text-center">{error}</div>}

            <form onSubmit={handleLogin} className="space-y-4">
                <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">CPF ou Matrícula</label>
                    <div className="relative">
                        <User className="absolute left-3 top-3 text-gray-400" size={18}/>
                        <input 
                            className="w-full pl-10 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                            placeholder="Digite seu acesso..."
                            value={form.login}
                            onChange={e => setForm({...form, login: e.target.value})}
                        />
                    </div>
                </div>
                
                <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Senha</label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-3 text-gray-400" size={18}/>
                        <input 
                            type={mostrarSenha ? "text" : "password"}
                            className="w-full pl-10 pr-10 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                            placeholder="********"
                            value={form.senha}
                            onChange={e => setForm({...form, senha: e.target.value})}
                        />
                        
                        <button 
                            type="button"
                            onClick={() => setMostrarSenha(!mostrarSenha)}
                            className="absolute right-3 top-3 text-gray-400 hover:text-blue-600 transition-colors"
                            tabIndex={-1} 
                        >
                            {mostrarSenha ? <EyeOff size={18}/> : <Eye size={18}/>}
                        </button>
                    </div>
                </div>

                <button disabled={loading} className="w-full bg-blue-700 hover:bg-blue-800 text-white font-bold py-3 rounded-lg shadow-lg transition-all">
                    {loading ? 'Entrando...' : 'ACESSAR SISTEMA'}
                </button>
            </form>
            <div className="mt-6 text-center text-xs text-gray-400">
                &copy; 2026 Ianorth Tecnologia
            </div>
        </div>
    </div>
  );
}
