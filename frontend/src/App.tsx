import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import RDO from './pages/rdo';
import Config from './pages/Config';
import Orcamentos from './pages/Orcamentos';
import Layout from './components/Layout'; 
import Equipe from './pages/Equipe';

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
            <Route path="/rdo" element={<RDO />} />
        </Route>

        <Route element={<PrivateWrapper roles={['ADMIN', 'GESTOR']} />}>
            <Route path="/config" element={<Config />} />
            <Route path="/orcamentos" element={<Orcamentos />} />
            <Route path="/orcamentos/:id" element={<Orcamentos />} />
            <Route path="/equipe" element={<Equipe />} />
            <Route path="/dashboard-gerencia" element={<Dashboard />} />
        </Route>

        <Route path="*" element={<Navigate to="/" />} />

      </Routes>
    </BrowserRouter>
  );
}
