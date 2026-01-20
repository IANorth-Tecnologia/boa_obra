import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Settings, PlusCircle, DollarSign, LogOut, HardHat } from 'lucide-react';

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();

  const usuarioNome = localStorage.getItem('usuario_nome') || 'Usuário';
  const perfil = localStorage.getItem('perfil') || 'COLABORADOR';

  const handleLogout = () => {
    if (confirm("Deseja realmente sair?")) {
      localStorage.clear();
      navigate('/');
    }
  };
  
  const menuItens = [
    { 
      icon: LayoutDashboard, 
      label: 'Dashboard', 
      path: '/dashboard', 
      roles: ['ADMIN', 'GESTOR', 'COLABORADOR'] 
    },
    { 
      icon: DollarSign, 
      label: 'Orçamentos', 
      path: '/orcamentos', 
      roles: ['ADMIN', 'GESTOR'] 
    },
    { 
      icon: HardHat, 
      label: 'Equipes', 
      path: '/equipe', 
      roles: ['ADMIN', 'GESTOR'] 
    },
    { 
      icon: PlusCircle, 
      label: 'Novo RDO', 
      path: '/novo-rdo', 
      highlight: true, 
      roles: ['ADMIN', 'GESTOR', 'COLABORADOR'] 
    },
    { 
      icon: Settings, 
      label: 'Config', 
      path: '/config', 
      roles: ['ADMIN', 'GESTOR'] 
    }, 
  ];

  const menuVisivel = menuItens.filter(item => item.roles.includes(perfil));

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-50 flex-col md:flex-row">
      
      <aside className="hidden md:flex w-64 h-full flex-col bg-white border-r border-gray-200 shadow-sm z-10">
        
        <div className="p-6 flex items-center gap-2 border-b border-gray-100">
           <div>
             <h1 className="font-bold text-gray-800 tracking-tight">Boa Obra</h1>
             <p className="text-[10px] text-gray-400 font-medium">ERP (Sistema IANorth)</p>
           </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {menuVisivel.map((i) => {
            const active = location.pathname === i.path;
            return (
              <Link 
                key={i.path} 
                to={i.path} 
                className={`
                  flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 font-medium text-sm
                  ${active 
                    ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-100' 
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }
                `}
              >
                <i.icon size={20} className={active ? "text-blue-600" : "text-gray-400"} /> 
                {i.label}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-gray-100 bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs uppercase">
              {usuarioNome.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-800 truncate capitalize">{usuarioNome.toLowerCase()}</p>
              <p className="text-xs text-gray-500 truncate">{perfil}</p>
            </div>
            <button onClick={handleLogout} className="text-gray-400 hover:text-red-500 transition-colors" title="Sair">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>
      
      <main className="flex-1 h-full overflow-y-auto bg-gray-50 p-4 md:p-6 relative">
        <Outlet />
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around p-2 z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        {menuVisivel.map((i) => {
          const active = location.pathname === i.path;
          return (
            <Link key={i.path} to={i.path} className="flex flex-col items-center justify-center w-16 py-1">
               {i.highlight ? (
                 <div className={`
                    -mt-8 p-3 rounded-full shadow-lg transition-transform active:scale-95
                    ${active ? 'bg-blue-700 ring-4 ring-white' : 'bg-blue-600 text-white'}
                 `}>
                   <i.icon size={24} color="white" />
                 </div>
               ) : (
                 <>
                   <i.icon size={22} className={active ? "text-blue-600" : "text-gray-400"} />
                   <span className={`text-[10px] mt-1 font-medium ${active ? "text-blue-600" : "text-gray-400"}`}>
                     {i.label}
                   </span>
                 </>
               )}
            </Link>
          )
        })}
        <button onClick={handleLogout} className="flex flex-col items-center justify-center w-16 py-1 text-red-400">
            <LogOut size={22} />
            <span className="text-[10px] mt-1 font-medium">Sair</span>
        </button>
      </nav>
    </div>
  );
}
