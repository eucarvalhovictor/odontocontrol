import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Wallet, Plus, Trash2, Hourglass } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useCloudTable } from '../lib/db';
import { supabase } from '../lib/supabase';
import { store, todayISO } from '../lib/store';
import CloudBar from '../components/CloudBar';

const BRL = (v) => (+v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const matCost = (mats) => (mats || []).reduce((s, m) => s + (+m.custo || 0) * (+m.qtd || 1), 0);

// Todos os itens de plano do dentista (todos os pacientes).
// Nuvem quando disponível; espelho local 'odonto_plans' como fallback.
function useAllPlans(userId) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cloud, setCloud] = useState(null);
  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    let alive = true;
    (async () => {
      try {
        const { data, error } = await supabase.from('treatment_plans').select('*').eq('user_id', userId);
        if (error) throw error;
        if (alive) { setItems(data || []); setCloud(true); }
      } catch {
        if (alive) { setItems(store.get('odonto_plans', [])); setCloud(false); }
      } finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [userId]);
  return { items, loading, cloud };
}

const CATS = ['Aluguel', 'Salários', 'Materiais', 'Equipamentos', 'Marketing', 'Contas', 'Outros'];

export default function Financeiro() {
  const { user } = useAuth();
  const id = user?.id;
  const plans = useAllPlans(id);
  const exp = useCloudTable('expenses', id);
  const [desc, setDesc] = useState('');
  const [cat, setCat] = useState('Outros');
  const [valor, setValor] = useState('');
  const [data, setData] = useState(todayISO());
  const loading = plans.loading || exp.loading;
  const cloud = plans.cloud === false || exp.cloud === false ? false : true;

  const done = plans.items.filter((p) => p.status === 'concluido');
  const open = plans.items.filter((p) => p.status !== 'concluido');
  const recebido = done.reduce((s, p) => s + (+p.valor || 0), 0);
  const aReceber = open.reduce((s, p) => s + (+p.valor || 0), 0);
  const gastoMat = plans.items.reduce((s, p) => s + matCost(p.materiais), 0);
  const despesas = exp.items.reduce((s, e) => s + (+e.valor || 0), 0);
  const gastos = gastoMat + despesas;
  const lucro = recebido - gastos;
  const margem = recebido > 0 ? Math.round((lucro / recebido) * 100) : 0;

  // Últimos 6 meses: recebido (concluídos) x gastos (materiais + despesas)
  const months = [];
  const now = new Date();
  for (let k = 5; k >= 0; k--) {
    const d = new Date(now.getFullYear(), now.getMonth() - k, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleString('pt-BR', { month: 'short' }).replace('.', '');
    const rec = done.filter((p) => (p.created_at || '').slice(0, 7) === key)
      .reduce((s, p) => s + (+p.valor || 0), 0);
    const gm = plans.items.filter((p) => (p.created_at || '').slice(0, 7) === key)
      .reduce((s, p) => s + matCost(p.materiais), 0);
    const de = exp.items.filter((e) => (e.data || '').slice(0, 7) === key)
      .reduce((s, e) => s + (+e.valor || 0), 0);
    months.push({ label, rec, gas: gm + de });
  }
  const maxV = Math.max(1, ...months.flatMap((m) => [m.rec, m.gas]));

  const addExp = async () => {
    if (!desc.trim()) return alert('Descreva o gasto');
    if (!(+valor > 0)) return alert('Informe um valor maior que zero');
    await exp.add({ descricao: desc.trim(), categoria: cat, valor: +valor, data: data || todayISO() });
    setDesc(''); setCat('Outros'); setValor(''); setData(todayISO());
  };

  const ordered = [...exp.items].sort((a, b) => String(b.data || '').localeCompare(String(a.data || '')));

  if (loading) return <div className="auth-loading"><div className="spin" /></div>;

  return (
    <>
      <CloudBar cloud={cloud} />
      <div className="cards fin-cards">
        <div className="card hero"><small>Recebido (concluídos)</small><b><TrendingUp size={22} />{BRL(recebido)}</b><span>{done.length} procedimentos concluídos</span></div>
        <div className="card"><small>A receber</small><b><Hourglass size={22} />{BRL(aReceber)}</b><span>{open.length} em aberto</span></div>
        <div className="card"><small>Materiais consumidos</small><b><TrendingDown size={22} />{BRL(gastoMat)}</b><span>nos planos de tratamento</span></div>
        <div className="card"><small>Despesas lançadas</small><b><TrendingDown size={22} />{BRL(despesas)}</b><span>{exp.items.length} lançamentos</span></div>
        <div className={`card ${lucro >= 0 ? 'profit' : 'loss'}`}><small>Lucro • {margem}% de margem</small><b><Wallet size={22} />{BRL(lucro)}</b><span>recebido menos gastos</span></div>
      </div>
      <div className="grid2">
        <div className="panel">
          <h3>Últimos 6 meses</h3>
          <div className="fin-bars">
            {months.map((m) => (
              <div className="fin-month" key={m.label}>
                <div className="fin-cols">
                  <i className="rec" style={{ height: Math.max(4, Math.round((m.rec / maxV) * 140)) }} title={`Recebido ${BRL(m.rec)}`} />
                  <i className="gas" style={{ height: Math.max(4, Math.round((m.gas / maxV) * 140)) }} title={`Gastos ${BRL(m.gas)}`} />
                </div>
                <small>{m.label}</small>
              </div>
            ))}
          </div>
          <div className="fin-legend"><span><i className="rec" /> Recebido</span><span><i className="gas" /> Gastos</span></div>
        </div>
        <div className="panel">
          <h3>Lançar gasto</h3>
          <label>Descrição*<input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Ex: Aluguel, resina, anúncio..." /></label>
          <div className="row">
            <label>Categoria
              <select value={cat} onChange={(e) => setCat(e.target.value)}>
                {CATS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label>Valor (R$)*<input type="number" min="0" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" /></label>
            <label>Data<input type="date" value={data} onChange={(e) => setData(e.target.value)} /></label>
          </div>
          <button className="btn-primary" onClick={addExp}><Plus size={16} /> Adicionar gasto</button>
          <h3 style={{ marginTop: 26 }}>Despesas</h3>
          <div className="list">
            {ordered.slice(0, 12).map((e) => (
              <div className="row-item" key={e.id}>
                <div><b>{e.descricao}</b><br /><small>{e.categoria} • {e.data?.split('-').reverse().join('/') || '—'} • <b style={{ color: '#dc2626' }}>{BRL(e.valor)}</b></small></div>
                <button className="icon-btn danger" title="Excluir lançamento" onClick={() => { if (confirm('Excluir lançamento?')) exp.remove(e.id); }}><Trash2 size={14} /></button>
              </div>
            ))}
            {!ordered.length && <small style={{ color: '#5b6b7c' }}>Nenhum gasto lançado. Registre aluguel, salários e compras aqui.</small>}
          </div>
        </div>
      </div>
    </>
  );
}
