import { useState } from 'react';
import { useNavigate, Navigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, LogIn, UserPlus, CreditCard } from 'lucide-react';
import { useAuth } from '../lib/auth';

const tr = (m) => {
  if (!m) return 'Falha na autenticação.';
  if (m.includes('Invalid login credentials')) return 'E-mail ou senha incorretos.';
  if (m.includes('already registered') || m.includes('already exists')) return 'Este e-mail já está cadastrado. Faça login.';
  if (m.includes('Email not confirmed')) return 'Confirme seu e-mail antes de entrar (verifique a caixa de entrada).';
  if (m.includes('Password')) return 'A senha deve ter ao menos 6 caracteres.';
  return m;
};

export default function Login() {
  const { user, signIn, signUp } = useAuth();
  const nav = useNavigate();
  const [params] = useSearchParams();
  // "Comprar" na landing cai aqui direto no cadastro (?cadastro=1)
  const [mode, setMode] = useState(params.get('cadastro') ? 'signup' : 'login'); // login | signup
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [show, setShow] = useState(false);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [busy, setBusy] = useState(false);
  if (user) return <Navigate to="/app/dashboard" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setErr(''); setOk(''); setBusy(true);
    const mail = email.trim().toLowerCase(); // e-mail sempre minúsculo
    try {
      if (mode === 'login') {
        await signIn(mail, pass);
        // O Guard (/app) decide: sem assinatura vai para /app/checkout,
        // com assinatura vai para o dashboard.
        nav('/app/dashboard');
      } else {
        if (!nome.trim()) { setErr('Informe seu nome.'); setBusy(false); return; }
        const data = await signUp(mail, pass, nome.trim());
        // Conta nova nunca tem assinatura: vai direto para o checkout do cartão.
        if (data.session) nav('/app/checkout');
        else { setOk('Conta criada! Verifique seu e-mail para confirmar o cadastro e depois faça login.'); setMode('login'); }
      }
    } catch (e2) { setErr(tr(e2.message)); }
    setBusy(false);
  };

  return (
    <div className="login-wrap">
      <div className="login-card">
        <img src="/logo.svg" alt="OdontoControl" className="login-logo" />
        <h1>OdontoControl</h1>
        <p className="sub">Gestão do seu consultório odontológico</p>
        <div className="auth-tabs">
          <button className={mode === 'login' ? 'active' : ''} onClick={() => { setMode('login'); setErr(''); setOk(''); }}>Entrar</button>
          <button className={mode === 'signup' ? 'active' : ''} onClick={() => { setMode('signup'); setErr(''); setOk(''); }}>Criar conta</button>
        </div>
        <form onSubmit={submit}>
          {mode === 'signup' && (
            <label className="field">Nome
              <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Dra. Camila" required />
            </label>
          )}
          <label className="field">E-mail
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="voce@consultorio.com" />
          </label>
          <label className="field">Senha
            <div style={{ position: 'relative' }}>
              <input type={show ? 'text' : 'password'} value={pass} onChange={e => setPass(e.target.value)} required minLength={6} style={{ width: '100%' }} />
              <button type="button" onClick={() => setShow(!show)} style={{ position: 'absolute', right: 10, top: 12, border: 'none', background: 'none', cursor: 'pointer', color: '#0f766e' }}>
                {show ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>
          {err && <div className="error">{err}</div>}
          {ok && <div className="ok-msg">{ok}</div>}
          <button className="btn-primary" style={{ width: '100%', justifyContent: 'center' }} type="submit" disabled={busy}>
            {mode === 'login' ? <><LogIn size={16} /> {busy ? 'Entrando...' : 'Entrar no painel'}</> : <><UserPlus size={16} /> {busy ? 'Criando...' : 'Criar minha conta'}</>}
          </button>
          {mode === 'signup' && (
            <small className="auth-hint"><CreditCard size={13} /> Após criar a conta, você cadastra o cartão de crédito para verificação e libera os 7 dias grátis.</small>
          )}
        </form>
        <button className="back-site" onClick={() => nav('/')}>← Voltar ao site</button>
      </div>
      <div className="login-side">
        <div className="login-copy">
          <h2>Sorriso saudável,<br />gestão em dia.</h2>
          <p>Prontuários, agenda, receitas e estoque em um só painel.</p>
        </div>
        <div className="login-art">
          <svg viewBox="0 0 440 360" className="art-svg" aria-hidden="true">
            <circle cx="220" cy="178" r="128" fill="rgba(255,255,255,.08)" />
            <circle cx="220" cy="178" r="158" fill="none" stroke="rgba(255,255,255,.28)" strokeWidth="1.5" strokeDasharray="3 9" />
            <ellipse cx="220" cy="178" rx="185" ry="70" fill="none" stroke="rgba(255,255,255,.18)" strokeWidth="1.5" transform="rotate(-14 220 178)" />
            <circle cx="377" cy="138" r="7" fill="#a7f3d0" />
            <circle cx="63" cy="238" r="5" fill="rgba(255,255,255,.7)" />
            <circle cx="96" cy="92" r="4" fill="rgba(255,255,255,.5)" />
            <path d="M70 60 l3 6.5 6.5 3 -6.5 3 -3 6.5 -3 -6.5 -6.5 -3 6.5 -3 Z" fill="#a7f3d0" />
            <path d="M368 250 l2.4 5 5 2.4 -5 2.4 -2.4 5 -2.4 -5 -5 -2.4 5 -2.4 Z" fill="rgba(255,255,255,.85)" />
            <path d="M322 66 h14 M329 59 v14" stroke="rgba(255,255,255,.8)" strokeWidth="5" strokeLinecap="round" />
            <g transform="translate(148,84) scale(1.5)" opacity=".35">
              <path d="M64 34 C58 26 42 26 39 40 C36 52 41 62 43 74 C45 86 45 98 51 101 C57 104 58 94 58 86 C58 78 60 74 64 74 C68 74 70 78 70 86 C70 94 71 104 77 101 C83 98 83 86 85 74 C87 62 92 52 89 40 C86 26 70 26 64 34 Z" fill="#042f2e" />
            </g>
            <g transform="translate(140,76) scale(1.5)">
              <path d="M64 34 C58 26 42 26 39 40 C36 52 41 62 43 74 C45 86 45 98 51 101 C57 104 58 94 58 86 C58 78 60 74 64 74 C68 74 70 78 70 86 C70 94 71 104 77 101 C83 98 83 86 85 74 C87 62 92 52 89 40 C86 26 70 26 64 34 Z" fill="#ffffff" />
              <path d="M96 24 l2.6 5.4 5.4 2.6 -5.4 2.6 -2.6 5.4 -2.6 -5.4 -5.4 -2.6 5.4 -2.6 Z" fill="#2dd4bf" />
            </g>
          </svg>
          <div className="float-card fa"><span className="fdot" /><div><b>Consulta confirmada</b><small>Hoje • 09:00</small></div></div>
          <div className="float-card fb"><b>Movimento da semana</b><div className="fbars"><i style={{ height: '40%' }} /><i style={{ height: '70%' }} /><i style={{ height: '52%' }} /><i style={{ height: '90%' }} /><i style={{ height: '64%' }} /></div></div>
        </div>
      </div>
    </div>
  );
}
