import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, CalendarDays, Pill, Package, LogOut, Plus, Settings, Wallet, Timer } from 'lucide-react';
import { useAuth, displayName } from '../lib/auth';
import { useSettings } from '../lib/db';
import CloudBar from './CloudBar';

const TITLES = {
  '/app/dashboard': ['Dashboard', 'Visão geral do consultório'],
  '/app/pacientes': ['Pacientes', 'Cadastro e prontuários'],
  '/app/agenda': ['Agenda', 'Consultas e horários'],
  '/app/prescricoes': ['Prescrições', 'Receitas e medicamentos'],
  '/app/insumos': ['Insumos', 'Estoque e controle de materiais'],
  '/app/financeiro': ['Financeiro', 'Lucro, gastos e lançamentos'],
  '/app/configuracoes': ['Configurações', 'Logo e dados do consultório'],
  '/app/perfil': ['Perfil', 'Foto, e-mail e senha'],
};

export default function Layout() {
  const nav = useNavigate();
  const { pathname } = useLocation();
  const { user, signOut } = useAuth();
  const { settings, cloud } = useSettings(user?.id);
  const [title, sub] = TITLES[pathname] || TITLES['/app/dashboard'];
  const logo = settings.logo || '/logo.svg'; // logo do projeto como padrão
  const name = displayName(user);
  const avatar = user?.user_metadata?.avatar;

  const out = async () => { await signOut(); nav('/app/login'); };

  // Aviso de sessão: 1 min antes do logout por inatividade mostra a faixa
  // com "Continuar conectado"; ao expirar, volta para o login.
  const [sessWarn, setSessWarn] = useState(false);
  useEffect(() => {
    const warn = () => setSessWarn(true);
    const expired = () => { setSessWarn(false); nav('/app/login'); };
    window.addEventListener('odonto:session-warning', warn);
    window.addEventListener('odonto:session-expired', expired);
    return () => {
      window.removeEventListener('odonto:session-warning', warn);
      window.removeEventListener('odonto:session-expired', expired);
    };
  }, [nav]);
  const stay = () => { setSessWarn(false); window.__odonto_poke?.(); };

  return (
    <div className="app-shell">
      {sessWarn && (
        <div className="sess-banner" role="alert">
          <Timer size={16} />
          <span><b>Sua sessão expira em 1 minuto</b> por inatividade. Atividade na tela já renova automaticamente.</span>
          <button className="btn-sm primary" onClick={stay}>Continuar conectado</button>
        </div>
      )}
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark" style={{ background: '#fff', overflow: 'hidden', padding: 2 }}>
            <img src={logo} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 10 }} />
          </span>
          OdontoControl
        </div>
        <nav className="nav">
          <span className="nav-label">Principal</span>
          <NavLink to="/app/dashboard" className="nav-link"><LayoutDashboard size={18} /> Dashboard</NavLink>
          <NavLink to="/app/agenda" className="nav-link"><CalendarDays size={18} /> Agenda</NavLink>
          <span className="nav-label">Gestão</span>
          <NavLink to="/app/pacientes" className="nav-link"><Users size={18} /> Pacientes</NavLink>
          <NavLink to="/app/prescricoes" className="nav-link"><Pill size={18} /> Prescrições</NavLink>
          <NavLink to="/app/insumos" className="nav-link"><Package size={18} /> Insumos</NavLink>
          <NavLink to="/app/financeiro" className="nav-link"><Wallet size={18} /> Financeiro</NavLink>
          <span className="nav-label">Sistema</span>
          <NavLink to="/app/configuracoes" className="nav-link"><Settings size={18} /> Configurações</NavLink>
        </nav>
        <div className="side-foot">
          <div className="user-chip clickable" onClick={() => nav('/app/perfil')} title="Abrir meu perfil" role="link" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') nav('/app/perfil'); }}><div className="avatar">{avatar ? <img src={avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} /> : name[0]?.toUpperCase()}</div><div><b>{name}</b><small>{user?.email}</small></div></div>
          <button className="btn-logout" onClick={out}>
            <LogOut size={16} /> Sair
          </button>
        </div>
      </aside>
      <main className="main">
        <header className="topbar">
          <div><h1>{title}</h1><p>{sub}</p></div>
          <div className="top-actions">
            <button className="mobile-avatar" onClick={() => nav('/app/perfil')} title="Meu perfil">{avatar ? <img src={avatar} alt="Meu perfil" /> : name[0]?.toUpperCase()}</button>
            {pathname === '/app/dashboard' && (
              <button className="btn-primary" onClick={() => nav('/app/agenda?nova=1')}><Plus size={16} /> Novo agendamento</button>
            )}
          </div>
        </header>
        <CloudBar cloud={cloud} />
        <Outlet />
      </main>
    </div>
  );
}
