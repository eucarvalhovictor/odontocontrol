import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Plus, X, CalendarDays, Trash2, CalendarCheck, FileText, UserPlus, FolderOpen } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useCloudTable } from '../lib/db';
import { todayISO } from '../lib/store';
import CloudBar from '../components/CloudBar';

const STATUS = ['agendado', 'confirmado', 'concluido', 'cancelado'];
// Rótulos Explícitos Com Primeira Letra Maiúscula (Independem Do CSS)
export const STATUS_LABEL = { todos: 'Todos', agendado: 'Agendado', confirmado: 'Confirmado', concluido: 'Concluído', cancelado: 'Cancelado' };
const Pad = (n) => String(n).padStart(2, '0');
const IsoOf = (d) => `${d.getFullYear()}-${Pad(d.getMonth() + 1)}-${Pad(d.getDate())}`;
const ParseIso = (iso) => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); };
const DOW = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const DOW_FULL = ['Domingo', 'Segunda-Feira', 'Terça-Feira', 'Quarta-Feira', 'Quinta-Feira', 'Sexta-Feira', 'Sábado'];
const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

// Tag De Status: Um Clique Abre O Dropdown (Portal No Body) Para Escolher O Novo Status
function StatusTag({ status, onOpen }) {
  return (
    <button className={`badge clickable ${status}`} title="Clique Para Alterar O Status" onClick={(e) => { e.stopPropagation(); onOpen(e.currentTarget.getBoundingClientRect()); }}>
      <span className="dot" />{STATUS_LABEL[status]}
    </button>
  );
}

// Pílula De Evento Do Calendário Com O Mesmo Dropdown Em Portal
function EvtPill({ a, onOpen }) {
  return (
    <button className={`evt ${a.status}`} style={{ width: '100%' }} title={`${a.paciente} — Clique Para Alterar O Status`} onClick={(e) => { e.stopPropagation(); onOpen(e.currentTarget.getBoundingClientRect()); }}>
      {a.hora} {a.paciente.split(' ')[0]}
    </button>
  );
}

// Menu Renderizado Direto No Body Com Position:Fixed — Nenhum Card Cobre
function StatusMenu({ menu, current, onPick, onClose }) {
  return createPortal(
    <>
      <div className="menu-overlay" style={{ zIndex: 900 }} onClick={onClose} />
      <div className="status-menu fixed" style={{ left: menu.x, top: menu.y }} onClick={(e) => e.stopPropagation()}>
        {STATUS.map(s => (
          <button key={s} className={`status-opt ${s === current ? 'sel' : ''}`} onClick={() => { onPick(s); onClose(); }}>
            <span className={`mdot ${s}`} />{STATUS_LABEL[s]}{s === current ? ' ✓' : ''}
          </button>
        ))}
      </div>
    </>,
    document.body
  );
}

export default function Agenda() {
  const [params, setParams] = useSearchParams();
  const [view, setView] = useState('dia'); // dia | semana | mes
  const [data, setData] = useState(todayISO());
  const [filter, setFilter] = useState('todos');
  const { user } = useAuth();
  const { items: list, loading, cloud, add, update, remove } = useCloudTable('appointments', user?.id);
  const { items: pats, add: addPat } = useCloudTable('patients', user?.id);
  const { items: dents, add: addDent } = useCloudTable('dentists', user?.id); // equipe do consultório
  const evo = useCloudTable('evolutions', user?.id); // evolução clínica por consulta
  const [modal, setModal] = useState(params.get('nova') === '1');
  const [evoAppt, setEvoAppt] = useState(null); // consulta com evolução aberta
  const [addingDent, setAddingDent] = useState(false); // adição rápida de dentista
  const [newDent, setNewDent] = useState('');
  const [menu, setMenu] = useState(null); // {id, x, y} Do Dropdown Aberto Em Portal No Body
  const openMenu = (id, rect) => {
    const W = 190, H = 215;
    const x = Math.max(8, Math.min(rect.left, window.innerWidth - W - 8));
    const flip = rect.bottom + H + 8 > window.innerHeight;
    setMenu({ id, x, y: flip ? Math.max(8, rect.top - H - 8) : rect.bottom + 6 });
  };
  useEffect(() => {
    if (!menu) return;
    const onKey = (e) => { if (e.key === 'Escape') setMenu(null); };
    const onMove = () => setMenu(null);
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', onMove);
    window.addEventListener('scroll', onMove, true);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('resize', onMove); window.removeEventListener('scroll', onMove, true); };
  }, [menu]);
  const [form, setForm] = useState({ hora: '09:00' });
  useEffect(() => { if (params.get('nova')) setParams({}); }, []);

  const dentistaSel = form.dentista || dents[0]?.nome || '';
  const save = async () => {
    const nome = (form.paciente || '').trim();
    if (!nome) return alert('Informe o nome do paciente (pode digitar — não precisa estar cadastrado)');
    await add({ paciente: nome, data: form.data || data, hora: form.hora, proc: form.proc || 'Avaliação', dentista: dentistaSel, status: 'agendado' });
    setForm({ dentista: form.dentista, hora: '09:00' });
    setModal(false);
  };
  const addDentista = async () => {
    const nome = newDent.trim();
    if (!nome) return alert('Informe o nome do dentista');
    await addDent({ nome });
    setForm({ ...form, dentista: nome });
    setNewDent('');
    setAddingDent(false);
  };
  const evoCount = (id) => evo.items.filter((e) => e.appointment_id === id).length;
  const setStatus = async (id, status) => { await update(id, { status }); };
  const del = async (id) => { if (!confirm('Excluir?')) return; await remove(id); };

  const visible = useMemo(() => list.filter(a => filter === 'todos' || a.status === filter), [list, filter]);
  const byDay = useMemo(() => {
    const m = {};
    visible.forEach(a => { (m[a.data] = m[a.data] || []).push(a); });
    Object.values(m).forEach(arr => arr.sort((x, y) => x.hora.localeCompare(y.hora)));
    return m;
  }, [visible]);

  // Navegação apenas pelo calendário (campo de data, Hoje e cliques no mês/semana)
  const cursor = ParseIso(data);

  const title = view === 'mes'
    ? `${MONTHS[cursor.getMonth()]} De ${cursor.getFullYear()}`
    : view === 'semana'
      ? `Semana De ${IsoOf(new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() - cursor.getDay())).split('-').reverse().join('/')} A ${IsoOf(new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + (6 - cursor.getDay()))).split('-').reverse().join('/')}`
      : `${Pad(cursor.getDate())} De ${MONTHS[cursor.getMonth()]} De ${cursor.getFullYear()}`;

  // Células Do Mês (42 Dias, Semana Começa No Domingo)
  const monthCells = useMemo(() => {
    const y = cursor.getFullYear(), m = cursor.getMonth();
    const first = new Date(y, m, 1).getDay();
    const cells = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(y, m, 1 - first + i);
      cells.push({ date: d, iso: IsoOf(d), inMonth: d.getMonth() === m });
    }
    return cells;
  }, [data]);

  // Colunas Da Semana
  const weekDays = useMemo(() => {
    const start = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() - cursor.getDay());
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      return { date: d, iso: IsoOf(d) };
    });
  }, [data]);

  const hoje = todayISO();
  if (loading) return <div className="auth-loading"><div className="spin" /></div>;
  const dayList = (byDay[data] || []);
  const count = (s) => dayList.filter(a => a.status === s).length;

  return (
    <>
      <CloudBar cloud={cloud} />
      {menu && <StatusMenu menu={menu} current={(list.find(x => x.id === menu.id) || {}).status} onPick={(s) => setStatus(menu.id, s)} onClose={() => setMenu(null)} />}

      <div className="toolbar">
        <div className="chips">
          {[['dia', 'Dia'], ['semana', 'Semana'], ['mes', 'Mês']].map(([v, label]) => (
            <button key={v} className={`chip ${view === v ? 'active' : ''}`} onClick={() => setView(v)}><CalendarDays size={14} style={{ verticalAlign: -2 }} /> {label}</button>
          ))}
        </div>
        <div className="cal-nav">
          <span className="cal-title">{title}</span>
          <button className="btn-sm" onClick={() => setData(hoje)}>Hoje</button>
        </div>
      </div>

      <div className="toolbar">
        <input type="date" value={data} onChange={e => e.target.value && setData(e.target.value)} />
        <div className="chips">
          {['todos', 'agendado', 'confirmado', 'concluido', 'cancelado'].map(f => (
            <button key={f} className={`chip ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>{STATUS_LABEL[f]}</button>
          ))}
        </div>
        <button className="btn-primary" onClick={() => setModal(true)}><Plus size={16} /> Agendar</button>
      </div>

      {view === 'dia' && (
        <>
          <div className="day-head">
            <div>
              <h2>{DOW_FULL[cursor.getDay()]}, {Pad(cursor.getDate())} De {MONTHS[cursor.getMonth()]}</h2>
              <p>{dayList.length} Consulta(s) Neste Dia • {count('confirmado')} Confirmada(s)</p>
            </div>
            <div className="day-counts">
              <div className="day-count"><b>{dayList.length}</b><span>Total</span></div>
              <div className="day-count"><b>{count('confirmado')}</b><span>Confirmados</span></div>
              <div className="day-count"><b>{count('concluido')}</b><span>Concluídos</span></div>
              <div className="day-count"><b>{count('cancelado')}</b><span>Cancelados</span></div>
            </div>
          </div>
          {dayList.length ? (
            <div className="timeline">
              {dayList.map(a => (
                <div className="tl-item" key={a.id}>
                  <div className="tl-time">{a.hora}</div>
                  <div className={`tl-dot ${a.status}`} />
                  <div className="tl-card">
                    <div><b>{a.paciente}</b><br /><small>{a.proc} • {a.dentista}</small></div>
                    <div className="actions" style={{ marginTop: 0 }}>
                      <StatusTag status={a.status} onOpen={(r) => openMenu(a.id, r)} />
                      <button className="btn-sm" title="Evolução clínica da consulta" onClick={() => setEvoAppt(a)}><FileText size={13} /> Evolução{evoCount(a.id) > 0 && ` (${evoCount(a.id)})`}</button>
                      <button className="btn-sm danger" onClick={() => del(a.id)}><Trash2 size={13} /> Excluir</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-day">
              <CalendarCheck size={36} color="#14b8a6" />
              <b>Nenhuma Consulta Neste Dia</b>
              <small>A Agenda Está Livre — Que Tal Agendar Um Paciente?</small>
              <button className="btn-primary" onClick={() => setModal(true)}><Plus size={16} /> Agendar Consulta</button>
            </div>
          )}
        </>
      )}

      {view === 'semana' && (
        <div className="week-grid">
          {weekDays.map(({ date, iso }) => (
            <div key={iso} className={`week-col ${iso === hoje ? 'today' : ''}`}>
              <div className="week-col-head" onClick={() => { setData(iso); setView('dia'); }}>
                <small>{DOW[date.getDay()]} • {Pad(date.getDate())}/{Pad(date.getMonth() + 1)}</small>
                <b>{Pad(date.getDate())}</b>
              </div>
              {(byDay[iso] || []).map(a => (
                <EvtPill key={a.id} a={a} onOpen={(r) => openMenu(a.id, r)} />
              ))}
              {!(byDay[iso] || []).length && <span className="evt-more">Livre</span>}
            </div>
          ))}
        </div>
      )}

      {view === 'mes' && (
        <div className="panel">
          <div className="cal-grid">
            {DOW.map((d, i) => <div key={i} className="cal-dow">{d}</div>)}
            {monthCells.map(({ date, iso, inMonth }) => {
              const evts = byDay[iso] || [];
              return (
                <div
                  key={iso}
                  className={`cal-day ${inMonth ? '' : 'other'} ${iso === hoje ? 'today' : ''} ${iso === data ? 'selected' : ''}`}
                  onClick={() => setData(iso)}
                  onDoubleClick={() => { setData(iso); setView('dia'); }}
                >
                  <span className="cal-num">{date.getDate()}</span>
                  {evts.slice(0, 3).map(a => (
                    <EvtPill key={a.id} a={a} onOpen={(r) => openMenu(a.id, r)} />
                  ))}
                  {evts.length > 3 && <span className="evt-more">+{evts.length - 3} Mais</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {modal && (
        <div className="modal-bg" onClick={() => setModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-head"><h3>Novo Agendamento</h3><button className="icon-btn" onClick={() => setModal(false)}><X size={16} /></button></div>
            <div className="modal-body">
              <div className="row">
                <label>Paciente*<input list="agenda-pats" placeholder="Digite o nome — não precisa estar cadastrado" value={form.paciente || ''} onChange={e => setForm({ ...form, paciente: e.target.value })} /></label>
                <datalist id="agenda-pats">{pats.map(p => <option key={p.id} value={p.nome} />)}</datalist>
                <label>Dentista
                  <div style={{ display: 'flex', gap: 8 }}>
                    <select value={dentistaSel} onChange={e => setForm({ ...form, dentista: e.target.value })} style={{ flex: 1 }}>
                      {dents.map(d => <option key={d.id} value={d.nome}>{d.nome}</option>)}
                      {!dents.length && <option value="">Nenhum dentista cadastrado</option>}
                    </select>
                    <button type="button" className="btn-sm" title="Adicionar dentista" onClick={() => setAddingDent(!addingDent)}><Plus size={14} /></button>
                  </div>
                </label>
              </div>
              {addingDent && (
                <div className="row">
                  <label>Novo Dentista*<input placeholder="Ex: Dr. Paulo" value={newDent} onChange={e => setNewDent(e.target.value)} /></label>
                  <label style={{ justifyContent: 'end' }}><span>&nbsp;</span><button className="btn-primary" onClick={addDentista}><Plus size={16} /> Adicionar</button></label>
                </div>
              )}
              <div className="row">
                <label>Data<input type="date" value={form.data || data} onChange={e => setForm({ ...form, data: e.target.value })} /></label>
                <label>Hora<input type="time" value={form.hora} onChange={e => setForm({ ...form, hora: e.target.value })} /></label>
              </div>
              <label>Procedimento<input placeholder="Ex: Limpeza, Restauração..." value={form.proc || ''} onChange={e => setForm({ ...form, proc: e.target.value })} /></label>
              <div className="modal-foot"><button className="btn-ghost" onClick={() => setModal(false)}>Cancelar</button><button className="btn-primary" onClick={save}>Agendar</button></div>
            </div>
          </div>
        </div>
      )}
      {evoAppt && (
        <EvolucaoModal appt={evoAppt} pats={pats} addPat={addPat} evo={evo} onClose={() => setEvoAppt(null)} />
      )}
    </>
  );
}

// ---------- Evolução clínica de uma consulta (+ cadastro do avulso) ----------
function EvolucaoModal({ appt, pats, addPat, evo, onClose }) {
  const navigate = useNavigate();
  const [nota, setNota] = useState('');
  const [busy, setBusy] = useState(false);
  const [cad, setCad] = useState(false); // formulário de cadastro aberto
  const [pcad, setPcad] = useState({});
  const [createdId, setCreatedId] = useState(null);
  const notes = evo.items
    .filter((e) => e.appointment_id === appt.id)
    .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
  const match = pats.find((p) => p.nome === appt.paciente) || pats.find((p) => p.id === createdId) || null;

  const submit = async () => {
    if (!nota.trim()) return alert('Escreva a evolução da consulta');
    setBusy(true);
    // Vincula ao cadastro quando o nome confere; avulso fica só com o nome
    await evo.add({
      appointment_id: appt.id,
      patient_id: match ? match.id : null,
      paciente: appt.paciente,
      data: appt.data,
      nota: nota.trim(),
    });
    setNota('');
    setBusy(false);
  };

  const cadastrar = async () => {
    const nome = (pcad.nome || '').trim();
    if (!nome) return alert('Informe o nome do paciente');
    setBusy(true);
    const novo = await addPat({
      nome,
      cpf: (pcad.cpf || '').trim(),
      tel: (pcad.tel || '').trim(),
      email: (pcad.email || '').toLowerCase(),
      nasc: pcad.nasc || '',
      convenio: pcad.convenio || 'Particular',
      alergias: (pcad.alergias || '').trim(),
      obs: (pcad.obs || '').trim(),
      status: 'ativo',
    });
    // Vincula ao prontuário as evoluções desta consulta feitas antes do cadastro
    if (novo?.id) {
      setCreatedId(novo.id);
      await Promise.all(notes.filter((n) => !n.patient_id).map((n) => evo.update(n.id, { patient_id: novo.id })));
    }
    setCad(false);
    setBusy(false);
  };

  const setP = (k, v) => setPcad({ ...pcad, [k]: v });

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-head"><h3>Evolução — {appt.paciente}</h3><button className="icon-btn" onClick={onClose}><X size={16} /></button></div>
        <div className="modal-body">
          <small style={{ color: '#5b6b7c' }}>{appt.proc} • {appt.data?.split('-').reverse().join('/')} às {appt.hora} • {appt.dentista}</small>
          {match ? (
            <div className="avulso-box done">
              <div><b>Paciente cadastrado ✓</b><small>Anamnese, plano, exames e odontograma em /pacientes. As evoluções desta consulta já estão vinculadas.</small></div>
              <button className="btn-sm primary" onClick={() => navigate(`/app/pacientes?prontuario=${match.id}`)}><FolderOpen size={13} /> Abrir prontuário</button>
            </div>
          ) : (
            <div className="avulso-box">
              <div><b>Paciente ainda sem cadastro</b><small>Primeira vez no consultório? Cadastre para liberar o prontuário completo e vincular esta evolução.</small></div>
              {!cad && <button className="btn-sm primary" onClick={() => { setPcad({ nome: appt.paciente, convenio: 'Particular' }); setCad(true); }}><UserPlus size={13} /> Cadastrar paciente</button>}
              {cad && (
                <div className="cad-mini">
                  <div className="row">
                    <label>Nome*<input value={pcad.nome || ''} onChange={e => setP('nome', e.target.value)} /></label>
                    <label>CPF<input value={pcad.cpf || ''} onChange={e => setP('cpf', e.target.value)} /></label>
                  </div>
                  <div className="row">
                    <label>Telefone<input value={pcad.tel || ''} onChange={e => setP('tel', e.target.value)} /></label>
                    <label>E-mail<input type="email" value={pcad.email || ''} onChange={e => setP('email', e.target.value)} /></label>
                  </div>
                  <div className="row">
                    <label>Nascimento<input type="date" value={pcad.nasc || ''} onChange={e => setP('nasc', e.target.value)} /></label>
                    <label>Convênio<select value={pcad.convenio || 'Particular'} onChange={e => setP('convenio', e.target.value)}><option>Particular</option><option>Amil Dental</option><option>OdontoPrev</option><option>SulAmérica</option><option>Bradesco Dental</option></select></label>
                  </div>
                  <label>Alergias<input value={pcad.alergias || ''} onChange={e => setP('alergias', e.target.value)} placeholder="Ex: Penicilina, látex" /></label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn-primary" onClick={cadastrar} disabled={busy}><UserPlus size={15} /> {busy ? 'Salvando...' : 'Salvar cadastro'}</button>
                    <button className="btn-ghost" onClick={() => setCad(false)}>Voltar</button>
                  </div>
                </div>
              )}
            </div>
          )}
          <div className="evo-list">
            {notes.map((n) => (
              <div className="evo-item" key={n.id}>
                <div className="evo-head"><b>{n.data ? n.data.split('-').reverse().join('/') : ''}</b><button className="icon-btn danger" title="Excluir evolução" onClick={() => { if (confirm('Excluir esta evolução?')) evo.remove(n.id); }}><Trash2 size={13} /></button></div>
                <p>{n.nota}</p>
              </div>
            ))}
            {!notes.length && <small style={{ color: '#5b6b7c' }}>Nenhuma evolução registrada para esta consulta ainda.</small>}
          </div>
          <label>Nova Evolução<textarea rows={3} value={nota} onChange={e => setNota(e.target.value)} placeholder="Ex: Realizada restauração no 36, resina A2. Retorno em 6 meses." /></label>
          <div className="modal-foot"><button className="btn-ghost" onClick={onClose}>Fechar</button><button className="btn-primary" onClick={submit} disabled={busy}><Plus size={16} /> {busy ? 'Salvando...' : 'Registrar Evolução'}</button></div>
        </div>
      </div>
    </div>
  );
}
