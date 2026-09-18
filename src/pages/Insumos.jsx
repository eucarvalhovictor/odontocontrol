import { useState } from 'react';
import { Plus, Pencil, Trash2, X, Minus } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useCloudTable } from '../lib/db';
import { fmtDate } from '../lib/store';
import CloudBar from '../components/CloudBar';
import SearchBar from '../components/SearchBar';

const BRL = (v) => (+v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function Insumos() {
  const { user } = useAuth();
  const { items: list, loading, cloud, add, update, remove } = useCloudTable('supplies', user?.id);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ cat: 'Outros', qtd: 10, min: 5, un: 'un', custo: 0 });
  const shown = list.filter(s => ((s.nome || '') + (s.forn || '')).toLowerCase().includes(q.toLowerCase()) && (!cat || s.cat === cat));

  const open = (s) => { setForm(s?.id ? s : { cat: 'Outros', qtd: 10, min: 5, un: 'un', custo: 0 }); setModal(true); };
  const save = async () => {
    if (!form.nome?.trim()) return alert('Informe o nome');
    if (form.id) await update(form.id, { ...form, qtd: +form.qtd, min: +form.min, custo: +(form.custo || 0) });
    else await add({ ...form, qtd: +form.qtd, min: +form.min, custo: +(form.custo || 0) });
    setModal(false);
  };
  const move = async (id, d) => {
    const s = list.find(x => x.id === id);
    if (s) await update(id, { qtd: Math.max(0, (s.qtd ?? 0) + d) });
  };
  const del = async (s) => { if (confirm('Excluir?')) await remove(s.id); };

  if (loading) return <div className="auth-loading"><div className="spin" /></div>;

  return (
    <>
      <CloudBar cloud={cloud} />
      <div className="toolbar">
        <SearchBar value={q} onChange={setQ} placeholder="Buscar insumo..." />
        <select value={cat} onChange={e=>setCat(e.target.value)}>
          <option value="">Todas categorias</option>
          <option>Anestésicos</option><option>Resinas</option><option>Higiene</option>
          <option>Descartáveis</option><option>Ortodontia</option><option>Outros</option>
        </select>
        <button className="btn-primary" onClick={()=>open(null)}><Plus size={16}/> Novo insumo</button>
      </div>
      <div className="cards-grid">
        {shown.map(s=>{
          const low = (s.qtd ?? 0) <= (s.min ?? 0);
          const pct = Math.min(100, Math.round((s.qtd ?? 0) / ((s.min ?? 0)*2 || 1) * 100));
          return (
            <div className="ins-card" key={s.id}>
              <small>{s.cat}</small><h4>{s.nome}</h4>
              <small>{s.qtd} {s.un} • mín {s.min} • val {fmtDate(s.val)}</small>
              <small className="cost-line">Custo {BRL(s.custo)}/un • em estoque {BRL((+s.custo || 0) * (+s.qtd || 0))}</small>
              <div className={`stock-bar ${low?'low':''}`}><i style={{width:pct+'%'}}/></div>
              <span className={`badge ${low?'baixo':'ok'}`}>{low?'⚠ estoque baixo':'estoque ok'}</span>
              <div className="actions">
                <button className="btn-sm" onClick={()=>move(s.id,1)}><Plus size={13}/> Entrada</button>
                <button className="btn-sm" onClick={()=>move(s.id,-1)}><Minus size={13}/> Saída</button>
                <button className="btn-sm" onClick={()=>open(s)}><Pencil size={13}/> Editar</button>
                <button className="btn-sm danger" onClick={()=>del(s)}><Trash2 size={13}/></button>
              </div>
            </div>
          );
        })}
      </div>
      {modal && (
        <div className="modal-bg" onClick={()=>setModal(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div className="modal-head"><h3>{form.id?'Editar':'Novo'} insumo</h3><button className="icon-btn" onClick={()=>setModal(false)}><X size={16}/></button></div>
            <div className="modal-body">
              <div className="row">
                <label>Nome*<input value={form.nome||''} onChange={e=>setForm({...form,nome:e.target.value})}/></label>
                <label>Categoria<select value={form.cat} onChange={e=>setForm({...form,cat:e.target.value})}><option>Anestésicos</option><option>Resinas</option><option>Higiene</option><option>Descartáveis</option><option>Ortodontia</option><option>Outros</option></select></label>
              </div>
              <div className="row">
                <label>Qtd<input type="number" value={form.qtd} onChange={e=>setForm({...form,qtd:+e.target.value})}/></label>
                <label>Mínimo<input type="number" value={form.min} onChange={e=>setForm({...form,min:e.target.value})}/></label>
              </div>
              <div className="row">
                <label>Unidade<input value={form.un||''} onChange={e=>setForm({...form,un:e.target.value})}/></label>
                <label>Validade<input type="date" value={form.val||''} onChange={e=>setForm({...form,val:e.target.value})}/></label>
              </div>
              <div className="row">
                <label>Custo unitário (R$)<input type="number" min="0" step="0.01" value={form.custo ?? ''} onChange={e=>setForm({...form,custo:+e.target.value})} placeholder="0,00"/></label>
                <label>Valor em estoque<b style={{ padding: '12px 0' }}>{BRL((+form.custo || 0) * (+form.qtd || 0))}</b></label>
              </div>
              <label>Fornecedor<input value={form.forn||''} onChange={e=>setForm({...form,forn:e.target.value})}/></label>
              <div className="modal-foot"><button className="btn-ghost" onClick={()=>setModal(false)}>Cancelar</button><button className="btn-primary" onClick={save}>Salvar</button></div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
