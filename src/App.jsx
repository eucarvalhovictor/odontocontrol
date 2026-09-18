import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Pacientes from './pages/Pacientes';
import Agenda from './pages/Agenda';
import Prescricoes from './pages/Prescricoes';
import Insumos from './pages/Insumos';
import Financeiro from './pages/Financeiro';
import Configuracoes from './pages/Configuracoes';
import Perfil from './pages/Perfil';
import Checkout from './pages/Checkout';
import { AuthProvider, useAuth } from './lib/auth';
import { useSubscription } from './lib/billing';

function Guard({ children }) {
  const { user, loading } = useAuth();
  const sub = useSubscription(user?.id);
  if (loading || (user && sub.loading)) return <div className="auth-loading"><div className="spin" /></div>;
  if (!user) return <Navigate to="/app/login" replace />;
  // Sem plano verificado não há acesso: vai para o checkout do cartão.
  if (!sub.liberated) return <Navigate to="/app/checkout" replace />;
  return children;
}

// Só exige login (o checkout é justamente para quem ainda não tem plano).
function RequireUser({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="auth-loading"><div className="spin" /></div>;
  return user ? children : <Navigate to="/app/login" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Página pública */}
          <Route path="/" element={<Landing />} />
          {/* Painel: só após /app */}
          <Route path="/app/login" element={<Login />} />
          <Route path="/app/checkout" element={<RequireUser><Checkout /></RequireUser>} />
          <Route path="/app" element={<Guard><Layout /></Guard>}>
            <Route index element={<Navigate to="/app/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="pacientes" element={<Pacientes />} />
            <Route path="agenda" element={<Agenda />} />
            <Route path="prescricoes" element={<Prescricoes />} />
            <Route path="insumos" element={<Insumos />} />
            <Route path="financeiro" element={<Financeiro />} />
            <Route path="configuracoes" element={<Configuracoes />} />
            <Route path="perfil" element={<Perfil />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
