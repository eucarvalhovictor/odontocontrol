import { useState } from 'react';
import { Plus, Printer, Trash2, X, Pill } from 'lucide-react';
import { useAuth, displayName } from '../lib/auth';
import { useCloudTable, useSettings } from '../lib/db';
import { todayISO, fmtDate } from '../lib/store';
import CloudBar from '../components/CloudBar';
import SearchBar from '../components/SearchBar';

export default function Prescricoes() {
  const { user } = useAuth();
  const { items: list, loading, cloud, add, remove } = useCloudTable('prescriptions', user?.id);
  const { items: pats } = useCloudTable('patients', user?.id);
  const { items: dents } = useCloudTable('dentists', user?.id); // equipe do consultório
  const { settings } = useSettings(user?.id);
  const [q, setQ] = useState('');
  const [modal, setModal] = useState(false);
  const [preview, setPreview] = useState(null); // receita com pop-up de impressão aberto
  const [form, setForm] = useState({ data: todayISO() });
  const shown = [...list].reverse().filter(p => ((p.paciente || '') + (p.med || '')).toLowerCase().includes(q.toLowerCase()));

  const save = async () => {
    if (!form.med?.trim()) return alert('Informe o medicamento');
    await add({ ...form, paciente: form.paciente || pats[0]?.nome, dentista: form.dentista || settings.dentista || displayName(user) });
    setModal(false); setForm({ data: todayISO() });
  };
  const del = async (p) => { if (confirm('Excluir?')) await remove(p.id); };
  const print = (p) => {
    const cfg = { telefone: '', email: '', ...settings };
    const w = window.open('', '_blank');
    w.document.write(`<html><head><title>Receita — ${p.paciente}</title><style>body{font-family:Inter,Arial;padding:40px;color:#0f172a}.head{display:flex;gap:16px;align-items:center;border-bottom:3px solid #14b8a6;padding-bottom:12px}.head img{width:72px;height:72px;object-fit:contain;border:1px solid #ccfbf1;border-radius:10px}.head b{font-size:18px;color:#0f766e}.head small{color:#5b6b7c}.box{border:2px solid #14b8a6;border-radius:12px;padding:24px;margin-top:20px}.sig{margin-top:60px;text-align:center}.foot{margin-top:30px;border-top:1px solid #ccfbf1;padding-top:10px;font-size:12px;color:#5b6b7c;text-align:center}</style></head><body><div class="head">${cfg.logo ? `<img src="${cfg.logo}"/>` : ''}<div><b>${cfg.nome}</b><br><small>${cfg.dentista} • ${cfg.cro}<br>${cfg.endereco} • ${cfg.telefone}</small></div></div><h2>Receita Odontológica</h2><p><b>Paciente:</b> ${p.paciente} &nbsp; <b>Data:</b> ${fmtDate(p.data)}</p><div class="box"><h3>Prescrição</h3><p><b>${p.med}</b><br>${p.dose || ''} — ${p.freq || ''}</p><p>${p.orient || ''}</p></div><div class="sig">___________________________________<br>${p.dentista || cfg.dentista} — ${cfg.cro}</div><div class="foot">${cfg.nome} • ${cfg.endereco} • ${cfg.telefone} • ${cfg.email}</div><script>window.print()<\/script></body></html>`);
  };

  if (loading) return <div className="auth-loading"><div className="spin" /></div>;

  return (
    <>
      <CloudBar cloud={cloud} />
      <div className="toolbar">
        <SearchBar value={q} onChange={setQ} placeholder="Buscar prescrição / paciente..." />
        <button className="btn-primary" onClick={()=>setModal(true)}><Plus size={16}/> Nova prescrição</button>
      </div>
      <div className="cards-grid">
        {shown.map(p=>(
          <div className="presc-card" key={p.id}>
            <small style={{color:'#5b6b7c'}}>{fmtDate(p.data)} • {p.dentista}</small>
            <h4 style={{display:'flex',gap:8,alignItems:'center'}}><Pill size={16}/> {p.paciente}</h4>
            <div className="med"><b>{p.med}</b><br/>{p.dose} — {p.freq}<br/><small>{p.orient}</small></div>
            <div className="actions">
              <button className="btn-sm primary" onClick={()=>setPreview(p)}><Printer size={14}/> Imprimir</button>
              <button className="btn-sm danger" onClick={()=>del(p)}><Trash2 size={14}/> Excluir</button>
            </div>
          </div>
        ))}
      </div>
      {modal && (
        <div className="modal-bg" onClick={()=>setModal(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div className="modal-head"><h3>Nova prescrição</h3><button className="icon-btn" onClick={()=>setModal(false)}><X size={16}/></button></div>
            <div className="modal-body">
              <div className="row">
                <label>Paciente<select value={form.paciente||''} onChange={e=>setForm({...form,paciente:e.target.value})}>{pats.map(p=><option key={p.id}>{p.nome}</option>)}</select></label>
                <label>Data<input type="date" value={form.data} onChange={e=>setForm({...form,data:e.target.value})}/></label>
              </div>
              <label>Dentista<select value={form.dentista||''} onChange={e=>setForm({...form,dentista:e.target.value})}>
                <option value="">Padrão — {settings.dentista || displayName(user) || 'responsável'}</option>
                {dents.map(d=><option key={d.id} value={d.nome}>{d.nome}</option>)}
              </select></label>
              <label>Medicamento*<input placeholder="Ex: Amoxicilina 500mg" value={form.med||''} onChange={e=>setForm({...form,med:e.target.value})}/></label>
              <div className="row">
                <label>Dosagem<input placeholder="Ex: 1 cápsula" value={form.dose||''} onChange={e=>setForm({...form,dose:e.target.value})}/></label>
                <label>Frequência<input placeholder="Ex: 8/8h por 7 dias" value={form.freq||''} onChange={e=>setForm({...form,freq:e.target.value})}/></label>
              </div>
              <label>Orientações<textarea rows={2} value={form.orient||''} onChange={e=>setForm({...form,orient:e.target.value})}/></label>
              <div className="modal-foot"><button className="btn-ghost" onClick={()=>setModal(false)}>Cancelar</button><button className="btn-primary" onClick={save}>Salvar</button></div>
            </div>
          </div>
        </div>
      )}
      {preview && (
        <div className="modal-bg" onClick={()=>setPreview(null)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div className="modal-head"><h3>Receita — {preview.paciente}</h3><button className="icon-btn" onClick={()=>setPreview(null)}><X size={16}/></button></div>
            <div className="modal-body">
              <div className="print-sheet">
                <div className="print-head">
                  {settings.logo ? <img src={settings.logo} alt="Logo"/> : null}
                  <div><b>{settings.nome}</b><small>{settings.dentista} • {settings.cro}<br/>{settings.endereco} • {settings.telefone}</small></div>
                </div>
                <h4>Receita Odontológica</h4>
                <p className="print-line"><b>Paciente:</b> {preview.paciente} &nbsp; <b>Data:</b> {fmtDate(preview.data)}</p>
                <div className="print-box">
                  <b>{preview.med}</b><br/>{preview.dose} — {preview.freq}<br/><small>{preview.orient}</small>
                </div>
                <div className="print-sig">___________________________________<br/>{preview.dentista || settings.dentista} — {settings.cro}</div>
              </div>
              <div className="modal-foot">
                <button className="btn-ghost" onClick={()=>setPreview(null)}>Fechar</button>
                <button className="btn-primary" onClick={()=>{ print(preview); setPreview(null); }}><Printer size={16}/> Imprimir agora</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
