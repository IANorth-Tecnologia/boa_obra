import { BrowserRouter, Routes, Route, Navigate, } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Config from './pages/Config';
import Layout from './components/Layout'; 
import Equipe from './pages/Equipe';
import CronogramaObra from './pages/CronogramaObra';
import NovoRDO from './pages/Novo-rdo';
import GestaoOrcamentos from './pages/GestaoOrcamentos';

const PrivateWrapper = ({ roles }: { roles?: string[] }) => {
    const token = localStorage.getItem('token');
    const perfil = localStorage.getItem('perfil');

    if (!token) return <Navigate to="/" replace />;
    
    if (roles && perfil && !roles.includes(perfil)) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-100 text-gray-500">
                <div className="text-center">
                    <h1 className="text-4xl font-bold text-red-500 mb-2">403</h1>
                    <p>Acesso Negado para o perfil <strong>{perfil}</strong>.</p>
                    <a href="/dashboard" className="text-blue-600 hover:underline mt-4 block">Voltar ao início</a>
                </div>
            </div>
        );
    }

    return <Layout />;
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        
        <Route path="/" element={<Login />} />
        
        <Route element={<PrivateWrapper />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/rdo" element={<NovoRDO />} />
        </Route>

        <Route element={<PrivateWrapper roles={['ADMIN', 'GESTOR']} />}>
            <Route path="/config" element={<Config />} />
            <Route path="/orcamentos" element={<GestaoOrcamentos />} />
            <Route path="/orcamentos/:id" element={<GestaoOrcamentos />} />
            <Route path="/equipe" element={<Equipe />} />
            <Route path="/cronograma" element={<CronogramaObra />} />
            <Route path="/dashboard-gerencia" element={<Dashboard />} />
        </Route>

        <Route path="*" element={<Navigate to="/" />} />

      </Routes>
    </BrowserRouter>
  );
}
