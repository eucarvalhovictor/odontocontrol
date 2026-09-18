import { useNavigate } from 'react-router-dom';
import { Users, CalendarCheck, TriangleAlert, Pill, ArrowUpRight } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useCloudTable } from '../lib/db';
import { todayISO } from '../lib/store';
import CloudBar from '../components/CloudBar';

export default function Dashboard() {
  const nav = useNavigate();
  const { user } = useAuth();
  const id = user?.id;
  const { items: pats, loading: lp, cloud: cp } = useCloudTable('patients', id);
  const { items: appts, loading: la, cloud: ca } = useCloudTable('appointments', id);
  const { items: pres, loading: lr, cloud: cr } = useCloudTable('prescriptions', id);
  const { items: sup, loading: ls, cloud: cs } = useCloudTable('supplies', id);
  const loading = lp || la || lr || ls;
  const cloud = [cp, ca, cr, cs].some((c) => c === false) ? false : true;

  const hoje = todayISO();
  const t = appts.filter(a => a.data === hoje);
  const low = sup.filter(s => (s.qtd ?? 0) <= (s.min ?? 0));

  // Cards Clicáveis: Levam Para A Respectiva Página
  const go = (to, label) => ({
    onClick: () => nav(to),
    role: 'link',
    tabIndex: 0,
    title: `Ir Para ${label}`,
    onKeyDown: (e) => { if (e.key === 'Enter') nav(to); },
  });

  const days = ['D','S','T','Q','Q','S','S'];
  const bars = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0,10);
    const c = appts.filter(a => a.data === iso).length;
    bars.push({ h: c ? 20 + c*18 : 8, label: days[d.getDay()], c });
  }

  if (loading) return <div className="auth-loading"><div className="spin" /></div>;

  return (
    <>
      <CloudBar cloud={cloud} />
      <div className="cards">
        <div className="card hero link" {...go('/app/pacientes', 'Pacientes')}><span className="go"><ArrowUpRight size={16}/></span><small>Pacientes ativos</small><b><Users size={22}/>{pats.length}</b><span>{pats.length} cadastrados</span></div>
        <div className="card link" {...go('/app/agenda', 'Agenda')}><span className="go"><ArrowUpRight size={16}/></span><small>Consultas hoje</small><b><CalendarCheck size={22}/>{t.length}</b><span>{t.filter(a=>a.status==='confirmado').length} confirmados</span></div>
        <div className="card link" {...go('/app/insumos', 'Insumos')}><span className="go"><ArrowUpRight size={16}/></span><small>Estoque baixo</small><b><TriangleAlert size={22}/>{low.length}</b><span>itens abaixo do mínimo</span></div>
        <div className="card link" {...go('/app/prescricoes', 'Prescrições')}><span className="go"><ArrowUpRight size={16}/></span><small>Prescrições</small><b><Pill size={22}/>{pres.length}</b><span>receitas emitidas</span></div>
      </div>
      <div className="grid2">
        <div className="panel">
          <h3>Próximas consultas — hoje</h3>
          <div className="list">
            {t.slice(0,5).map(a => (
              <div className="row-item" key={a.id}><div><b>{a.hora} — {a.paciente}</b><br/><small>{a.proc}</small></div><span className={`badge ${a.status}`}>{a.status}</span></div>
            ))}
            {!t.length && <small style={{color:'#5b6b7c'}}>Sem consultas hoje.</small>}
          </div>
        </div>
        <div className="panel">
          <h3>Movimento da semana</h3>
          <div className="bars">{bars.map((b,i)=><div key={i} className="bar" style={{height:b.h}} title={`${b.c} consultas`}><span>{b.label}</span></div>)}</div>
          <h3 style={{marginTop:34}}>Alertas de estoque</h3>
          <div className="list">
            {low.slice(0,5).map(s=><div className="row-item" key={s.id}><div><b>{s.nome}</b><br/><small>{s.qtd} {s.un} (mín {s.min})</small></div><span className="badge baixo">repor</span></div>)}
            {!low.length && <small style={{color:'#5b6b7c'}}>Estoque em dia ✓</small>}
          </div>
        </div>
      </div>
    </>
  );
}
