import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase';

const AuthCtx = createContext(null);

// Sessão real via Supabase Auth. Cada login retorna um user.id único e
// todas as consultas ao banco são filtradas por esse id (+ RLS no SQL).
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user ?? null;
      setUser(u);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signIn = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  // Cria a conta; o trigger on_auth_user_created (schema.sql) cria o perfil.
  // Se "Confirm email" estiver ativo no Supabase, data.session vem null e o
  // usuário precisa clicar no link do e-mail antes do primeiro login.
  const signUp = async (email, password, nome) => {
    const { data, error } = await supabase.auth.signUp({
      email, password, options: { data: { nome } },
    });
    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    // Limpa caches locais de assinatura (legado global + por usuário)
    // para nunca reaproveitar liberação de outro usuário.
    try {
      localStorage.removeItem('odonto_subscription');
      const rm = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('odonto_subscription:')) rm.push(k);
      }
      rm.forEach((k) => localStorage.removeItem(k));
    } catch { /* ignore */ }
    setUser(null);
  };

  // Sessão de 15 min com logout por inatividade: qualquer atividade
  // (mouse, teclado, toque, scroll) reinicia o cronômetro. 1 min antes de
  // expirar, dispara 'odonto:session-warning' (o Layout mostra um aviso com
  // botão "Continuar conectado"); ao expirar, desloga e dispara
  // 'odonto:session-expired'. Sincroniza entre abas via 'storage'.
  useEffect(() => {
    if (!user) return;
    const IDLE_MS = 15 * 60 * 1000;
    const WARN_MS = 60 * 1000;
    let timer = null;
    let warnTimer = null;

    const logout = async () => {
      window.dispatchEvent(new Event('odonto:session-expired'));
      await supabase.auth.signOut();
      setUser(null);
    };
    const poke = () => {
      try { localStorage.setItem('odonto_last_activity', String(Date.now())); } catch { /* ignore */ }
      clearTimeout(timer);
      clearTimeout(warnTimer);
      warnTimer = setTimeout(() => window.dispatchEvent(new Event('odonto:session-warning')), IDLE_MS - WARN_MS);
      timer = setTimeout(logout, IDLE_MS);
    };
    // "Continuar conectado" do aviso chama isto
    window.__odonto_poke = poke;

    const EVTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    EVTS.forEach((e) => window.addEventListener(e, poke, { passive: true }));
    const onStorage = (e) => { if (e.key === 'odonto_last_activity') poke(); };
    window.addEventListener('storage', onStorage);
    poke();
    return () => {
      EVTS.forEach((e) => window.removeEventListener(e, poke));
      window.removeEventListener('storage', onStorage);
      clearTimeout(timer);
      clearTimeout(warnTimer);
      delete window.__odonto_poke;
    };
  }, [user]);

  // Recarrega o usuário (usado após updateUser: foto, nome, e-mail, senha)
  const refresh = async () => {
    const { data } = await supabase.auth.getUser();
    if (data?.user) setUser(data.user);
    return data?.user;
  };

  return (
    <AuthCtx.Provider value={{ user, loading, signIn, signUp, signOut, refresh }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);

export const displayName = (user) =>
  user?.user_metadata?.nome || user?.email?.split('@')[0] || 'Dentista';
