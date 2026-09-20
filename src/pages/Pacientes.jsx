import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Search, Pencil, Trash2, X, FileText, Camera, ImagePlus } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useCloudTable, useChildTable, useAnamnese, ANAMNESE_DEFAULTS } from '../lib/db';
import { store, fmtDate, todayISO } from '../lib/store';
import { fileToDataURL } from '../lib/image';
import CloudBar from '../components/CloudBar';
import SearchBar from '../components/SearchBar';

const BRL = (v) => (+v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const PLAN_STATUS = ['planejado', 'em_andamento', 'concluido'];
const PLAN_LABEL = { planejado: 'Planejado', em_andamento: 'Em Andamento', concluido: 'Concluído' };
const nextPlan = (s) => PLAN_STATUS[(PLAN_STATUS.indexOf(s) + 1) % PLAN_STATUS.length];
const EXAM_TYPES = ['Radiografia Panorâmica', 'Periapical', 'Interproximal', 'Tomografia', 'Telerradiografia', 'Foto Clínica', 'Outro'];
const ANAM_BOOL = [['hipertensao', 'Hipertensão'], ['diabete', 'Diabetes'], ['cardiopatia', 'Cardiopatia'], ['tabagista', 'Tabagista'], ['gestante', 'Gestante']];
const ANAM_TEXT = ['queixa_principal', 'historico', 'alergias', 'medicamentos', 'cirurgias', 'observacoes'];

export default function Pacientes() {
  const { user } = useAuth();
  const { items: list, loading, cloud, cloudError, add, update, remove } = useCloudTable('patients', user?.id);
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [record, setRecord] = useState(null); // paciente com prontuário aberto
  const [rtab, setRtab] = useState('anamnese');
  const photoRef = useRef(null);

  // Chegando da agenda (avulso recém-cadastrado): abre o prontuário direto
  useEffect(() => {
    const pid = params.get('prontuario');
    if (pid && !loading) {
      const p = list.find((x) => x.id === pid);
      if (p) { setRecord(p); setRtab('anamnese'); }
      setParams({});
    }
  }, [loading]);

  const filtered = list.filter(p => ((p.nome || '') + (p.cpf || '') + (p.tel || '')).toLowerCase().includes(q.toLowerCase()));

  const open = (p) => { setForm(p || { convenio: 'Particular' }); setModal(true); };
  const openRecord = (p) => { setRecord(p); setRtab('anamnese'); };

  const onPhoto = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return alert('Envie um arquivo de imagem.');
    try {
      setForm({ ...form, foto: await fileToDataURL(file, { maxDim: 512, quality: 0.85 }) });
    } catch { alert('Não foi possível ler a imagem.'); }
  };

  const save = async () => {
    if (!form.nome?.trim()) return alert('Informe o nome');
    const data = { ...form, email: (form.email || '').toLowerCase(), status: 'ativo' };
    if (form.id) await update(form.id, data);
    else await add(data);
    setModal(false);
    if (record && form.id === record.id) setRecord({ ...record, ...data });
  };

  const del = async (p) => {
    if (!confirm(`Excluir ${p.nome}? Anamnese, plano, exames, odontograma e evoluções também serão apagados.`)) return;
    await remove(p.id);
    // Nuvem apaga os filhos via ON DELETE CASCADE; espelho local limpa aqui
    ['odonto_anamnesis', 'odonto_plans', 'odonto_exams', 'odonto_odontogram', 'odonto_evolutions'].forEach((k) => {
      store.set(k, store.get(k, []).filter((r) => r.patient_id !== p.id));
    });
    if (record?.id === p.id) setRecord(null);
  };

  if (loading) return <div className="auth-loading"><div className="spin" /></div>;

  return (
    <>
      <CloudBar cloud={cloud} table="patients" detail={cloudError} />
      <div className="toolbar">
        <SearchBar value={q} onChange={setQ} placeholder="Buscar por nome, CPF, telefone..." />
        <button className="btn-primary" onClick={() => open(null)}><Plus size={16} /> Novo paciente</button>
      </div>
      <div className="panel table-wrap">
        <table>
          <thead><tr><th>Paciente</th><th>Contato</th><th>Nasc.</th><th>Convênio</th><th></th></tr></thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.id}>
                <td>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    {p.foto
                      ? <img src={p.foto} alt={p.nome} className="avatar-sm" />
                      : <span className="avatar-sm empty">{(p.nome || '?')[0]?.toUpperCase()}</span>}
                    <div><b>{p.nome}</b><br /><small>{p.cpf}</small></div>
                  </div>
                </td>
                <td>{p.tel}<br /><small>{p.email}</small></td>
                <td>{fmtDate(p.nasc)}</td><td>{p.convenio}</td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <button className="icon-btn" title="Prontuário: anamnese, plano e exames" onClick={() => openRecord(p)}><FileText size={15} /></button>{' '}
                  <button className="icon-btn" onClick={() => open(p)}><Pencil size={15} /></button>{' '}
                  <button className="icon-btn danger" onClick={() => del(p)}><Trash2 size={15} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="modal-bg" onClick={() => setModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-head"><h3>{form.id ? 'Editar' : 'Novo'} paciente</h3><button className="icon-btn" onClick={() => setModal(false)}><X size={16} /></button></div>
            <div className="modal-body">
              <div className="photo-row">
                {form.foto
                  ? <img src={form.foto} alt="Foto do paciente" className="avatar-lg" />
                  : <span className="avatar-lg empty"><Camera size={26} /></span>}
                <div className="col">
                  <input ref={photoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => onPhoto(e.target.files[0])} />
                  <button type="button" className="btn-sm" onClick={() => photoRef.current.click()}><Camera size={13} /> {form.foto ? 'Trocar foto' : 'Foto de perfil'}</button>
                  {form.foto && <button type="button" className="btn-sm danger" onClick={() => setForm({ ...form, foto: '' })}><Trash2 size={13} /> Remover</button>}
                </div>
              </div>
              <div className="row">
                <label>Nome*<input value={form.nome || ''} onChange={e => setForm({ ...form, nome: e.target.value })} /></label>
                <label>CPF<input value={form.cpf || ''} onChange={e => setForm({ ...form, cpf: e.target.value })} /></label>
              </div>
              <div className="row">
                <label>Telefone<input value={form.tel || ''} onChange={e => setForm({ ...form, tel: e.target.value })} /></label>
                <label>E-mail<input type="email" value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })} /></label>
              </div>
              <div className="row">
                <label>Nascimento<input type="date" value={form.nasc || ''} onChange={e => setForm({ ...form, nasc: e.target.value })} /></label>
                <label>Convênio<select value={form.convenio || 'Particular'} onChange={e => setForm({ ...form, convenio: e.target.value })}><option>Particular</option><option>Amil Dental</option><option>OdontoPrev</option><option>SulAmérica</option><option>Bradesco Dental</option></select></label>
              </div>
              <label>Alergias<input value={form.alergias || ''} onChange={e => setForm({ ...form, alergias: e.target.value })} /></label>
              <label>Observações<textarea rows={2} value={form.obs || ''} onChange={e => setForm({ ...form, obs: e.target.value })} /></label>
              <div className="modal-foot"><button className="btn-ghost" onClick={() => setModal(false)}>Cancelar</button><button className="btn-primary" onClick={save}>Salvar</button></div>
            </div>
          </div>
        </div>
      )}

      {record && (
        <RecordModal patient={record} tab={rtab} setTab={setRtab} onClose={() => setRecord(null)} userId={user?.id} />
      )}
    </>
  );
}

// ---------- Prontuário moderno: hero + segmented + progresso ----------
function ageOf(nasc) {
  if (!nasc) return null;
  const b = new Date(nasc + 'T00:00');
  if (isNaN(b)) return null;
  const n = new Date();
  let a = n.getFullYear() - b.getFullYear();
  const m = n.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && n.getDate() < b.getDate())) a--;
  return a;
}

function RecordModal({ patient, tab, setTab, onClose, userId }) {
  const an = useAnamnese(userId, patient.id);
  const plans = useChildTable('treatment_plans', 'odonto_plans', userId, patient.id);
  const exams = useChildTable('exams', 'odonto_exams', userId, patient.id);
  const odonto = useChildTable('odontogram', 'odonto_odontogram', userId, patient.id);
  const perio = useChildTable('perio', 'odonto_perio', userId, patient.id);
  const evoAll = useCloudTable('evolutions', userId);
  // Evoluções vinculadas ao cadastro + as registradas pelo nome (agenda avulsa)
  const evoItems = evoAll.items
    .filter((e) => e.patient_id === patient.id || (!e.patient_id && e.paciente === patient.nome))
    .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));

  const anData = an.data || {};
  const anFilled = ANAM_TEXT.filter((k) => (anData[k] || '').trim()).length;
  const anPct = Math.round((anFilled / ANAM_TEXT.length) * 100);
  const pDone = plans.items.filter((i) => i.status === 'concluido').length;
  const pTotal = plans.items.length;
  const pPct = pTotal ? Math.round((pDone / pTotal) * 100) : 0;
  const age = ageOf(patient.nasc);

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal wide" onClick={e => e.stopPropagation()}>
        <div className="record-hero">
          <button className="record-close" onClick={onClose} title="Fechar"><X size={18} /></button>
          <div className="rh-main">
            {patient.foto
              ? <img src={patient.foto} alt={patient.nome} className="avatar-xl" />
              : <span className="avatar-xl empty">{(patient.nome || '?')[0]?.toUpperCase()}</span>}
            <div>
              <h2>{patient.nome}</h2>
              <div className="rh-chips">
                {patient.convenio && <span>{patient.convenio}</span>}
                {age !== null && <span>{age} anos</span>}
                {patient.tel && <span>{patient.tel}</span>}
              </div>
            </div>
          </div>
          <div className="rh-stats">
            <div className="rh-stat"><small>Anamnese</small><b>{an.data ? (anPct === 100 ? 'Completa' : `${anPct}%`) : 'Pendente'}</b><div className="pbar"><i style={{ width: anPct + '%' }} /></div></div>
            <div className="rh-stat"><small>Plano de tratamento</small><b>{pDone}/{pTotal} concluídos</b><div className="pbar"><i style={{ width: pPct + '%' }} /></div></div>
            <div className="rh-stat"><small>Exames de imagem</small><b>{exams.items.length} anexado(s)</b><div className="pbar"><i style={{ width: exams.items.length ? '100%' : '0%' }} /></div></div>
          </div>
        </div>
        <div className="seg">
          <button className={tab === 'anamnese' ? 'active' : ''} onClick={() => setTab('anamnese')}>Anamnese{an.data && <em>{anPct}%</em>}</button>
          <button className={tab === 'plano' ? 'active' : ''} onClick={() => setTab('plano')}>Plano{pTotal > 0 && <em>{pDone}/{pTotal}</em>}</button>
          <button className={tab === 'exames' ? 'active' : ''} onClick={() => setTab('exames')}>Exames{exams.items.length > 0 && <em>{exams.items.length}</em>}</button>
          <button className={tab === 'odonto' ? 'active' : ''} onClick={() => setTab('odonto')}>Odontograma{odonto.items.length > 0 && <em>{odonto.items.length}</em>}</button>
          <button className={tab === 'perio' ? 'active' : ''} onClick={() => setTab('perio')}>Periograma{perio.items.length > 0 && <em>{perio.items.length}</em>}</button>
          <button className={tab === 'evolucao' ? 'active' : ''} onClick={() => setTab('evolucao')}>Evolução{evoItems.length > 0 && <em>{evoItems.length}</em>}</button>
        </div>
        <div className="modal-body">
          {tab === 'anamnese' && <AnamneseTab an={an} />}
          {tab === 'plano' && <PlanTab plans={plans} userId={userId} />}
          {tab === 'exames' && <ExamsTab exams={exams} />}
          {tab === 'odonto' && <OdontoTab odonto={odonto} />}
          {tab === 'perio' && <PerioTab perio={perio} />}
          {tab === 'evolucao' && <EvolucaoTab items={evoItems} evoAll={evoAll} patient={patient} />}
        </div>
      </div>
    </div>
  );
}

// ---------- Aba 1: Anamnese com salvamento automático ----------
function AnamneseTab({ an }) {
  const { data, loading, cloud, save } = an;
  const [f, setF] = useState({ ...ANAMNESE_DEFAULTS });
  const [st, setSt] = useState('idle'); // idle | saving | saved
  const [last, setLast] = useState('');
  const loadedRef = useRef(false);

  useEffect(() => { if (data) { setF({ ...ANAMNESE_DEFAULTS, ...data }); setLast((data.updated_at || '').slice(0, 10)); } }, [data]);
  useEffect(() => { if (!loading) loadedRef.current = true; }, [loading]);
  useEffect(() => {
    if (!loadedRef.current) return;
    setSt('saving');
    const t = setTimeout(async () => {
      const row = await save(f);
      setLast(((row || {}).updated_at || new Date().toISOString()).slice(0, 10));
      setSt('saved');
    }, 1200);
    return () => clearTimeout(t);
  }, [f]);

  const set = (k, v) => setF({ ...f, [k]: v });

  if (loading) return <div className="auth-loading" style={{ minHeight: 200 }}><div className="spin" /></div>;

  return (
    <>
      <CloudBar cloud={cloud} />
      <div className="save-bar">
        <span className={`save-state ${st}`}>
          <span className="sdot" />
          {st === 'saving' ? 'Salvando...' : st === 'saved' ? 'Salvo ✓ — nada se perde' : 'Preenchimento automático salvo'}
        </span>
        {last && <small>Última atualização: {fmtDate(last)}</small>}
      </div>
      <label>Queixa Principal<textarea rows={2} value={f.queixa_principal} onChange={e => set('queixa_principal', e.target.value)} placeholder="Ex: Dor no dente 36 há 3 dias" /></label>
      <label>Histórico Médico<textarea rows={2} value={f.historico} onChange={e => set('historico', e.target.value)} placeholder="Doenças, tratamentos em andamento..." /></label>
      <div className="check-grid">
        {ANAM_BOOL.map(([k, l]) => (
          <label key={k} className="check"><input type="checkbox" checked={!!f[k]} onChange={e => set(k, e.target.checked)} />{l}</label>
        ))}
      </div>
      <div className="row">
        <label>Alergias<input value={f.alergias} onChange={e => set('alergias', e.target.value)} placeholder="Ex: Penicilina, látex" /></label>
        <label>Medicamentos em Uso<input value={f.medicamentos} onChange={e => set('medicamentos', e.target.value)} /></label>
      </div>
      <label>Cirurgias<input value={f.cirurgias} onChange={e => set('cirurgias', e.target.value)} /></label>
      <label>Observações<textarea rows={2} value={f.observacoes} onChange={e => set('observacoes', e.target.value)} /></label>
    </>
  );
}

// ---------- Aba 2: Plano de Tratamento com materiais, custos e lucro ----------
const matCost = (i) => (i.materiais || []).reduce((s, m) => s + (+m.custo || 0) * (+m.qtd || 1), 0);
const matProfit = (i) => (+i.valor || 0) - matCost(i);

function PlanTab({ plans, userId }) {
  const { items, loading, cloud, add, update, remove } = plans;
  const supplies = useCloudTable('supplies', userId);
  const [proc, setProc] = useState('');
  const [dente, setDente] = useState('');
  const [valor, setValor] = useState('');
  const [openMat, setOpenMat] = useState(null);
  const [mSel, setMSel] = useState('');
  const [mNome, setMNome] = useState('');
  const [mCusto, setMCusto] = useState('');
  const [mQtd, setMQtd] = useState(1);

  const submit = async () => {
    if (!proc.trim()) return alert('Informe o procedimento');
    await add({ procedimento: proc.trim(), dente: dente.trim(), valor: +(valor || 0), status: 'planejado', materiais: [] });
    setProc(''); setDente(''); setValor('');
  };
  const done = items.filter((i) => i.status === 'concluido').length;
  const pct = items.length ? Math.round((done / items.length) * 100) : 0;
  const total = items.reduce((s, i) => s + (+i.valor || 0), 0);
  const custos = items.reduce((s, i) => s + matCost(i), 0);
  const lucro = total - custos;

  const pickSupply = (id) => {
    setMSel(id);
    const s = supplies.items.find((x) => String(x.id) === String(id));
    if (s) { setMNome(s.nome || ''); setMCusto(s.custo ?? ''); }
  };
  const addMat = async (item) => {
    if (!mNome.trim()) return alert('Informe o material');
    const mats = [...(item.materiais || []), { nome: mNome.trim(), custo: +(mCusto || 0), qtd: +(mQtd || 1) }];
    await update(item.id, { materiais: mats });
    setMNome(''); setMCusto(''); setMQtd(1); setMSel('');
  };
  const delMat = async (item, idx) => {
    if (!confirm('Remover material?')) return;
    await update(item.id, { materiais: (item.materiais || []).filter((_, j) => j !== idx) });
  };

  if (loading) return <div className="auth-loading" style={{ minHeight: 200 }}><div className="spin" /></div>;

  return (
    <>
      <CloudBar cloud={cloud} />
      <div className="plan-hero">
        <div className="ph-prog"><b>{done}/{items.length} concluídos</b><div className="pbar alt"><i style={{ width: pct + '%' }} /></div></div>
        <div className="ph-money"><div><small>Cobrado</small><b>{BRL(total)}</b></div><div><small>Materiais</small><b>{BRL(custos)}</b></div><div><small>Lucro</small><b className="profit">{BRL(lucro)}</b></div></div>
      </div>
      <div className="list">
        {items.map((i) => (
          <div className="row-item plan-item" key={i.id}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div><b>{i.procedimento}{i.dente ? ` — dente ${i.dente}` : ''}</b><br /><small>Cobrado {BRL(i.valor)} • Materiais {BRL(matCost(i))} • <span className="profit">Lucro {BRL(matProfit(i))}</span></small></div>
              {openMat === i.id && (
                <div className="mat-box">
                  {(i.materiais || []).map((m, idx) => (
                    <div className="mat-row" key={idx}>
                      <span>{m.nome} ×{m.qtd || 1}</span>
                      <span>{BRL((+m.custo || 0) * (+m.qtd || 1))}</span>
                      <button className="icon-btn danger" title="Remover material" onClick={() => delMat(i, idx)}><Trash2 size={13} /></button>
                    </div>
                  ))}
                  {!(i.materiais || []).length && <small style={{ color: '#5b6b7c' }}>Nenhum material lançado.</small>}
                  <div className="mat-add">
                    <select value={mSel} onChange={e => pickSupply(e.target.value)}>
                      <option value="">Do estoque...</option>
                      {supplies.items.map((s) => <option key={s.id} value={s.id}>{s.nome} — {BRL(s.custo)}/{s.un || 'un'}</option>)}
                    </select>
                    <input value={mNome} onChange={e => setMNome(e.target.value)} placeholder="Material" />
                    <input type="number" min="1" step="1" value={mQtd} onChange={e => setMQtd(+e.target.value)} title="Qtd" />
                    <input type="number" min="0" step="0.01" value={mCusto} onChange={e => setMCusto(e.target.value)} placeholder="Custo R$" title="Custo unitário (R$)" />
                    <button className="btn-sm primary" onClick={() => addMat(i)}><Plus size={13} /></button>
                  </div>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              <button className="btn-sm" onClick={() => { setOpenMat(openMat === i.id ? null : i.id); setMSel(''); setMNome(''); setMCusto(''); setMQtd(1); }}>Materiais ({(i.materiais || []).length})</button>
              <button className={`badge clickable ${i.status}`} title="Clique para avançar o status" onClick={() => update(i.id, { status: nextPlan(i.status) })}>{PLAN_LABEL[i.status] || i.status}</button>
              <button className="icon-btn danger" onClick={() => { if (confirm('Excluir item?')) remove(i.id); }}><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
        {!items.length && <small style={{ color: '#5b6b7c' }}>Nenhum procedimento no plano ainda.</small>}
      </div>
      <div className="row">
        <label>Procedimento*<input value={proc} onChange={e => setProc(e.target.value)} placeholder="Ex: Restauração, Canal..." /></label>
        <label>Dente<input value={dente} onChange={e => setDente(e.target.value)} placeholder="Ex: 36" /></label>
      </div>
      <div className="row">
        <label>Valor cobrado (R$)<input type="number" min="0" step="0.01" value={valor} onChange={e => setValor(e.target.value)} placeholder="0,00" /></label>
        <label style={{ justifyContent: 'end' }}><span>&nbsp;</span><button className="btn-primary" onClick={submit}><Plus size={16} /> Adicionar</button></label>
      </div>
    </>
  );
}

// ---------- Aba 3: Exames de Imagem ----------
function ExamsTab({ exams }) {
  const { items, loading, cloud, add, remove } = exams;
  const [titulo, setTitulo] = useState('');
  const [tipo, setTipo] = useState(EXAM_TYPES[0]);
  const [data, setData] = useState(todayISO());
  const [obs, setObs] = useState('');
  const [img, setImg] = useState('');
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState(null);
  const fileRef = useRef(null);

  const onFile = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return alert('Envie um arquivo de imagem.');
    try {
      setImg(await fileToDataURL(file, { maxDim: 1280, quality: 0.88 }));
      if (!titulo) setTitulo(file.name.replace(/\.[^.]+$/, ''));
    } catch { alert('Não foi possível ler a imagem.'); }
  };

  const submit = async () => {
    if (!img) return alert('Anexe a imagem do exame');
    setBusy(true);
    await add({ titulo: titulo.trim() || tipo, tipo, data, imagem: img, obs: obs.trim() });
    setTitulo(''); setTipo(EXAM_TYPES[0]); setData(todayISO()); setObs(''); setImg('');
    setBusy(false);
  };

  if (loading) return <div className="auth-loading" style={{ minHeight: 200 }}><div className="spin" /></div>;

  return (
    <>
      <CloudBar cloud={cloud} />
      {items.length > 0 && (
        <div className="exam-grid">
          {items.map((x) => (
            <div key={x.id} className="exam-thumb" onClick={() => setView(x)} title="Clique para ampliar">
              {x.imagem && <img src={x.imagem} alt={x.titulo} />}
              <span>{x.titulo}</span>
              <small>{x.tipo}{x.data ? ` • ${fmtDate(x.data)}` : ''}</small>
            </div>
          ))}
        </div>
      )}
      {!items.length && <small style={{ color: '#5b6b7c' }}>Nenhum exame anexado ainda.</small>}

      <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => onFile(e.target.files[0])} />
      <div className="logo-drop" onClick={() => fileRef.current.click()}>
        {img
          ? <img src={img} alt="Exame" className="logo-preview" style={{ maxWidth: 260, maxHeight: 180 }} />
          : <><ImagePlus size={30} color="#14b8a6" /><b>Clique para anexar o exame</b><small style={{ color: '#5b6b7c' }}>Foto, panorâmica, tomografia...</small></>}
      </div>
      <div className="row">
        <label>Título<input value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Ex: Panorâmica inicial" /></label>
        <label>Tipo<select value={tipo} onChange={e => setTipo(e.target.value)}>{EXAM_TYPES.map((t) => <option key={t}>{t}</option>)}</select></label>
      </div>
      <div className="row">
        <label>Data<input type="date" value={data} onChange={e => setData(e.target.value)} /></label>
        <label>Observação<input value={obs} onChange={e => setObs(e.target.value)} placeholder="Ex: Lado direito..." /></label>
      </div>
      <div className="modal-foot" style={{ justifyContent: 'flex-start' }}>
        <button className="btn-primary" onClick={submit} disabled={busy}><Plus size={16} /> {busy ? 'Salvando...' : 'Salvar Exame'}</button>
      </div>

      {view && (
        <div className="modal-bg" style={{ zIndex: 60 }} onClick={() => setView(null)}>
          <div style={{ display: 'grid', gap: 10, justifyItems: 'center' }} onClick={e => e.stopPropagation()}>
            <img src={view.imagem} alt={view.titulo} className="lightbox-img" />
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: '#fff', padding: '8px 14px', borderRadius: 12, fontSize: 13 }}>
              <b>{view.titulo}</b><span style={{ color: '#5b6b7c' }}>{view.tipo}{view.data ? ` • ${fmtDate(view.data)}` : ''}</span>
              <button className="btn-sm danger" onClick={() => { if (confirm('Excluir exame?')) { remove(view.id); setView(null); } }}><Trash2 size={13} /> Excluir</button>
              <button className="btn-sm" onClick={() => setView(null)}><X size={13} /> Fechar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ---------- Aba 4: Odontograma (numeração FDI) ----------
const ODONTO_STATUS = {
  higido: { label: 'Saudável', color: '#ffffff', border: '#94a3b8' },
  carie: { label: 'Cárie', color: '#f87171', border: '#991b1b' },
  restaurado: { label: 'Restaurado', color: '#60a5fa', border: '#1e40af' },
  endo: { label: 'Canal', color: '#c084fc', border: '#6b21a8' },
  coroa: { label: 'Coroa', color: '#fbbf24', border: '#92400e' },
  implante: { label: 'Implante', color: '#2dd4bf', border: '#115e59' },
  extracao: { label: 'Extração Indicada', color: '#fb923c', border: '#9a3412' },
  ausente: { label: 'Ausente', color: '#cbd5e1', border: '#475569' },
};
// Arcadas: superior direita/esquerda + inferior direita/esquerda (lado do paciente)
const ARCHES = [
  [['18', '17', '16', '15', '14', '13', '12', '11'], ['21', '22', '23', '24', '25', '26', '27', '28']],
  [['48', '47', '46', '45', '44', '43', '42', '41'], ['31', '32', '33', '34', '35', '36', '37', '38']],
];
const TOOTH_PATH = 'M64 34 C58 26 42 26 39 40 C36 52 41 62 43 74 C45 86 45 98 51 101 C57 104 58 94 58 86 C58 78 60 74 64 74 C68 74 70 78 70 86 C70 94 71 104 77 101 C83 98 83 86 85 74 C87 62 92 52 89 40 C86 26 70 26 64 34 Z';

function OdontoTab({ odonto }) {
  const { items, loading, cloud, add, update, remove } = odonto;
  const [sel, setSel] = useState(null);

  const rowOf = (t) => items.find((r) => r.dente === t);
  // Compatível com o formato antigo (status único) e o novo (statuses: até 2)
  const statusesOf = (t) => {
    const row = rowOf(t);
    if (!row) return [];
    if (Array.isArray(row.statuses) && row.statuses.length) return row.statuses.filter((s) => s && s !== 'higido').slice(0, 2);
    if (row.status && row.status !== 'higido') return [row.status];
    return [];
  };

  // Clique na paleta alterna a condição (máx. 2 por dente -> metade/metade)
  const toggle = async (t, s) => {
    const row = rowOf(t);
    const cur = statusesOf(t);
    if (s === 'higido') {
      if (row) await remove(row.id);
      return;
    }
    let next;
    if (cur.includes(s)) next = cur.filter((x) => x !== s);
    else if (cur.length >= 2) next = [cur[1], s]; // mantém no máx. 2: descarta a mais antiga
    else next = [...cur, s];
    if (!next.length) { if (row) await remove(row.id); }
    else if (row) await update(row.id, { status: next[0], statuses: next });
    else await add({ dente: t, status: next[0], statuses: next });
  };

  const clear = async (t) => {
    const row = rowOf(t);
    if (row) await remove(row.id);
  };

  if (loading) return <div className="auth-loading" style={{ minHeight: 200 }}><div className="spin" /></div>;

  const selStatuses = sel ? statusesOf(sel) : [];

  return (
    <>
      <CloudBar cloud={cloud} />
      <div className="odonto-legend">
        {Object.entries(ODONTO_STATUS).map(([k, s]) => (
          <span key={k}><i style={{ background: s.color, borderColor: s.border }} />{s.label}</span>
        ))}
      </div>
      <small style={{ color: '#5b6b7c', display: 'block', marginBottom: 8 }}>
        Toque em um dente e marque até <b>2 condições</b> — com 2, o dente fica metade/metade.
      </small>
      <div className="odonto-scroll">
        <div className="odonto">
          {ARCHES.map((arch, ai) => (
            <div className="odonto-arch" key={ai}>
              <small>{ai === 0 ? 'Superior' : 'Inferior'}</small>
              <div className="odonto-row">
                {arch.map((side, si) => (
                  <div className="odonto-side" key={si}>
                    {side.map((t) => {
                      const sts = statusesOf(t);
                      const c1 = sts[0] ? ODONTO_STATUS[sts[0]] : null;
                      const c2 = sts[1] ? ODONTO_STATUS[sts[1]] : null;
                      const base = c1 || ODONTO_STATUS.higido;
                      const gid = `og-${t}`;
                      const fill = c2 ? `url(#${gid})` : base.color;
                      const label = sts.length ? sts.map((s) => ODONTO_STATUS[s]?.label || s).join(' + ') : ODONTO_STATUS.higido.label;
                      const crossed = sts.includes('ausente') || sts.includes('extracao');
                      const crossColor = c2 ? c2.border : base.border;
                      return (
                        <button
                          key={t}
                          className={`odonto-tooth ${sel === t ? 'sel' : ''} ${sts.length > 1 ? 'duo' : ''}`}
                          title={`Dente ${t} — ${label}`}
                          onClick={() => setSel(sel === t ? null : t)}
                        >
                          <svg viewBox="0 0 128 128">
                            <defs>
                              {c2 && (
                                <linearGradient id={gid} x1="0" y1="0" x2="1" y2="0">
                                  <stop offset="50%" stopColor={c1.color} />
                                  <stop offset="50%" stopColor={c2.color} />
                                </linearGradient>
                              )}
                            </defs>
                            <path d={TOOTH_PATH} fill={fill} stroke={c2 ? '#334155' : base.border} strokeWidth="5" />
                            {crossed && (
                              <g stroke={crossColor} strokeWidth="7" strokeLinecap="round">
                                <line x1="38" y1="42" x2="90" y2="98" />
                                <line x1="90" y1="42" x2="38" y2="98" />
                              </g>
                            )}
                            {sts.length > 1 && <circle cx="96" cy="34" r="13" fill="#0f766e" stroke="#fff" strokeWidth="3" />}
                            {sts.length > 1 && <text x="96" y="39" textAnchor="middle" fontSize="16" fontWeight="800" fill="#fff">2</text>}
                          </svg>
                          <span>{t}</span>
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="odonto-pick">
        <b>{sel ? `Dente ${sel}${selStatuses.length ? ` — ${selStatuses.map((s) => ODONTO_STATUS[s]?.label).join(' + ')}` : ' — saudável'}` : 'Toque em um dente e escolha até 2 condições:'}</b>
        <div className="odonto-palette">
          {Object.entries(ODONTO_STATUS).map(([k, s]) => (
            <button
              key={k}
              className={`pick ${sel && selStatuses.includes(k) ? 'sel' : ''}`}
              disabled={!sel}
              onClick={() => toggle(sel, k)}
              title={k === 'higido' ? 'Limpar (voltar a saudável)' : `Adicionar/remover: ${s.label}`}
            >
              <i style={{ background: s.color, borderColor: s.border }} />{s.label}
            </button>
          ))}
        </div>
        {sel && selStatuses.length > 0 && (
          <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <small style={{ color: '#5b6b7c' }}>{selStatuses.length === 2 ? 'Dente com 2 condições (metade/metade). Clique de novo numa condição para removê-la.' : 'Dente com 1 condição. Marque outra para ficar metade/metade.'}</small>
            <button className="btn-sm danger" onClick={() => clear(sel)}>Limpar dente {sel}</button>
          </div>
        )}
      </div>
    </>
  );
}

// ---------- Aba 5: Periograma (sondagem por dente) ----------
// PS vestibular (M/C/D) + PS lingual/palatino (M/C/D), sangramento, placa e mobilidade.
const PERIO_TEETH = ARCHES.flat(2);
const emptyPerio = () => ({ ps_v: ['', '', ''], ps_l: ['', '', ''], sang: false, placa: false, mob: 0 });

function PerioTab({ perio }) {
  const { items, loading, cloud, add, update, remove } = perio;
  const [draft, setDraft] = useState({});

  useEffect(() => {
    const d = {};
    PERIO_TEETH.forEach((t) => {
      const row = items.find((r) => r.dente === t);
      d[t] = row ? {
        ps_v: [row.ps_v_m ?? '', row.ps_v_c ?? '', row.ps_v_d ?? ''],
        ps_l: [row.ps_l_m ?? '', row.ps_l_c ?? '', row.ps_l_d ?? ''],
        sang: !!row.sangramento, placa: !!row.placa, mob: row.mobilidade ?? 0,
      } : emptyPerio();
    });
    setDraft(d);
  }, [items]);

  const saveRow = async (t, patch) => {
    const row = items.find((r) => r.dente === t);
    if (row) await update(row.id, patch);
    else {
      // Só cria linha se houver algo preenchido
      const has = Object.values(patch).some((v) => v !== '' && v !== false && v !== 0 && v !== null && v !== undefined);
      if (has) await add({ dente: t, ...patch });
    }
  };

  const setPs = (t, side, idx, val) => {
    if (val !== '' && !/^\d{0,2}$/.test(val)) return;
    const cur = draft[t] || emptyPerio();
    const arr = [...cur[side]];
    arr[idx] = val;
    setDraft({ ...draft, [t]: { ...cur, [side]: arr } });
  };
  const blurPs = (t) => {
    const cur = draft[t];
    if (!cur) return;
    const num = (v) => (v === '' ? null : Math.min(15, Math.max(0, +v)));
    saveRow(t, {
      ps_v_m: num(cur.ps_v[0]), ps_v_c: num(cur.ps_v[1]), ps_v_d: num(cur.ps_v[2]),
      ps_l_m: num(cur.ps_l[0]), ps_l_c: num(cur.ps_l[1]), ps_l_d: num(cur.ps_l[2]),
    });
  };
  const toggleFlag = (t, key, col) => {
    const cur = draft[t] || emptyPerio();
    const next = !cur[key];
    setDraft({ ...draft, [t]: { ...cur, [key]: next } });
    saveRow(t, { [col]: next });
  };
  const setMob = (t, v) => {
    const cur = draft[t] || emptyPerio();
    setDraft({ ...draft, [t]: { ...cur, mob: v } });
    saveRow(t, { mobilidade: v });
  };
  const clearTooth = async (t) => {
    const row = items.find((r) => r.dente === t);
    if (row && confirm(`Limpar periograma do dente ${t}?`)) {
      await remove(row.id);
      setDraft({ ...draft, [t]: emptyPerio() });
    }
  };

  if (loading) return <div className="auth-loading" style={{ minHeight: 200 }}><div className="spin" /></div>;

  // Resumo clínico
  let sitios = 0, sang = 0, placa = 0, ps4 = 0, ps6 = 0;
  items.forEach((r) => {
    [r.ps_v_m, r.ps_v_c, r.ps_v_d, r.ps_l_m, r.ps_l_c, r.ps_l_d].forEach((v) => {
      if (v !== null && v !== '' && v !== undefined) { sitios++; if (+v >= 4) ps4++; if (+v >= 6) ps6++; }
    });
    if (r.sangramento) sang++;
    if (r.placa) placa++;
  });

  const renderArch = (teeth, title) => (
    <div className="perio-arch">
      <b className="perio-arch-title">{title}</b>
      <div className="perio-scroll">
        <table className="perio-table">
          <thead>
            <tr>
              <th>Dente</th>
              <th colSpan="3">PS Vestibular (M·C·D)</th>
              <th colSpan="3">PS Lingual (M·C·D)</th>
              <th>Sang.</th>
              <th>Placa</th>
              <th>Mob.</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {teeth.map((t) => {
              const cur = draft[t] || emptyPerio();
              return (
                <tr key={t} className={cur.sang ? 'perio-bleed' : ''}>
                  <td><b>{t}</b></td>
                  {[0, 1, 2].map((i) => (
                    <td key={'v' + i}>
                      <input
                        className="perio-in" inputMode="numeric" placeholder="–"
                        value={cur.ps_v[i]}
                        onChange={(e) => setPs(t, 'ps_v', i, e.target.value)}
                        onBlur={() => blurPs(t)}
                      />
                    </td>
                  ))}
                  {[0, 1, 2].map((i) => (
                    <td key={'l' + i}>
                      <input
                        className="perio-in" inputMode="numeric" placeholder="–"
                        value={cur.ps_l[i]}
                        onChange={(e) => setPs(t, 'ps_l', i, e.target.value)}
                        onBlur={() => blurPs(t)}
                      />
                    </td>
                  ))}
                  <td><input type="checkbox" className="perio-check bleed" checked={cur.sang} onChange={() => toggleFlag(t, 'sang', 'sangramento')} title="Sangramento à sondagem" /></td>
                  <td><input type="checkbox" className="perio-check" checked={cur.placa} onChange={() => toggleFlag(t, 'placa', 'placa')} title="Placa visível" /></td>
                  <td>
                    <select className="perio-in" value={cur.mob} onChange={(e) => setMob(t, +e.target.value)} title="Mobilidade">
                      <option value={0}>0</option><option value={1}>I</option><option value={2}>II</option><option value={3}>III</option>
                    </select>
                  </td>
                  <td><button className="icon-btn danger" style={{ padding: 5 }} title={`Limpar dente ${t}`} onClick={() => clearTooth(t)}><Trash2 size={12} /></button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <>
      <CloudBar cloud={cloud} />
      <div className="perio-legend">
        <span><i className="dot-bleed" /> Sangramento</span>
        <span><i className="dot-deep" /> PS ≥ 4 mm conta como bolsa</span>
        <span>PS em mm · M = mesial, C = centro, D = distal</span>
      </div>
      <div className="perio-summary">
        <div><small>Sítios sondados</small><b>{sitios}</b></div>
        <div><small>Dentes c/ sangramento</small><b>{sang}</b></div>
        <div><small>Dentes c/ placa</small><b>{placa}</b></div>
        <div><small>Sítios ≥ 4 mm</small><b className={ps4 ? 'warn' : ''}>{ps4}</b></div>
        <div><small>Sítios ≥ 6 mm</small><b className={ps6 ? 'bad' : ''}>{ps6}</b></div>
      </div>
      {renderArch(PERIO_TEETH.slice(0, 16), 'Arcada superior (18–28)')}
      {renderArch(PERIO_TEETH.slice(16), 'Arcada inferior (48–38)')}
      <small style={{ color: '#5b6b7c' }}>Salvamento automático por dente (ao sair do campo ou marcar as caixas). Valores de 0 a 15 mm.</small>
    </>
  );
}

// ---------- Aba 6: Evolução (histórico por consulta) ----------
function EvolucaoTab({ items, evoAll, patient }) {
  const [nota, setNota] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!nota.trim()) return alert('Escreva a evolução');
    setBusy(true);
    await evoAll.add({ appointment_id: null, patient_id: patient.id, paciente: patient.nome, data: todayISO(), nota: nota.trim() });
    setNota('');
    setBusy(false);
  };

  return (
    <>
      <CloudBar cloud={evoAll.cloud} />
      <div className="evo-list">
        {items.map((n) => (
          <div className="evo-item" key={n.id}>
            <div className="evo-head">
              <b>{n.data ? n.data.split('-').reverse().join('/') : fmtDate((n.created_at || '').slice(0, 10))}</b>
              <button className="icon-btn danger" title="Excluir evolução" onClick={() => { if (confirm('Excluir esta evolução?')) evoAll.remove(n.id); }}><Trash2 size={13} /></button>
            </div>
            <p>{n.nota}</p>
          </div>
        ))}
        {!items.length && <small style={{ color: '#5b6b7c' }}>Nenhuma evolução registrada. As evoluções feitas pela agenda aparecem aqui automaticamente.</small>}
      </div>
      <label>Nova Evolução<textarea rows={3} value={nota} onChange={e => setNota(e.target.value)} placeholder="Ex: Paciente sem dor, boa higiene. Manter acompanhamento." /></label>
      <div className="modal-foot" style={{ justifyContent: 'flex-start' }}>
        <button className="btn-primary" onClick={submit} disabled={busy}><Plus size={16} /> {busy ? 'Salvando...' : 'Registrar Evolução'}</button>
      </div>
    </>
  );
}
