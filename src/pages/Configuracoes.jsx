import { useState, useEffect, useRef } from 'react';
import { Building2, ImagePlus, Save, CheckCircle2, Trash2, Printer, Stethoscope, Plus, Pencil, X } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useSettings, useCloudTable, SETTINGS_DEFAULTS } from '../lib/db';
import CloudBar from '../components/CloudBar';

const initials = (nome) => (nome || '?')
  .split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

const TABS = [
  ['clinica', 'Consultório', Building2],
  ['equipe', 'Equipe', Stethoscope],
  ['receita', 'Receita', Printer],
];

export default function Configuracoes() {
  const { user } = useAuth();
  const { settings, loading, cloud, save: saveCloud } = useSettings(user?.id);
  const { items: dents, cloud: dentCloud, add: addDent, update: updateDent, remove: removeDent } = useCloudTable('dentists', user?.id);
  const [tab, setTab] = useState('clinica');
  const [form, setForm] = useState({ ...SETTINGS_DEFAULTS });
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dentNome, setDentNome] = useState('');
  const [dentCro, setDentCro] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editNome, setEditNome] = useState('');
  const [editCro, setEditCro] = useState('');
  const [confirmDel, setConfirmDel] = useState(null); // id com exclusão pendente de confirmação
  const fileRef = useRef(null);

  useEffect(() => { setForm({ ...settings }); }, [settings]);

  const set = (k, v) => { setForm({ ...form, [k]: v }); setSaved(false); };

  const onFile = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return alert('Envie Um Arquivo De Imagem (PNG, JPG Ou SVG).');
    if (file.size > 1500000) return alert('Logo Muito Grande — Máximo De 1,5 MB.');
    const r = new FileReader();
    r.onload = () => set('logo', r.result);
    r.readAsDataURL(file);
  };

  const save = async () => {
    if (!form.nome.trim()) return alert('Informe O Nome Do Consultório.');
    setBusy(true);
    await saveCloud({ ...form, email: (form.email || '').toLowerCase() });
    setBusy(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const addDentista = async () => {
    if (!dentNome.trim()) return alert('Informe O Nome Do Dentista.');
    await addDent({ nome: dentNome.trim(), cro: dentCro.trim() });
    setDentNome(''); setDentCro('');
  };

  const startEdit = (d) => { setEditingId(d.id); setEditNome(d.nome); setEditCro(d.cro || ''); };
  const cancelEdit = () => { setEditingId(null); setEditNome(''); setEditCro(''); };
  const saveEdit = async () => {
    if (!editNome.trim()) return alert('Informe O Nome Do Dentista.');
    await updateDent(editingId, { nome: editNome.trim(), cro: editCro.trim() });
    cancelEdit();
  };
  const askDel = (d) => {
    setConfirmDel(d.id);
    setTimeout(() => setConfirmDel((c) => (c === d.id ? null : c)), 5000);
  };
  const delDent = async (d) => {
    setConfirmDel(null);
    let ok = false;
    try {
      ok = await removeDent(d.id);
    } catch {
      ok = false;
    }
    if (editingId === d.id) cancelEdit();
    // Caiu no modo local mas a nuvem parecia ok: avisa em vez de fingir que salvou
    if (ok === false && dentCloud !== false) {
      alert('Não foi possível excluir na nuvem. Verifique a conexão e se a migration_004 foi rodada no SQL Editor do Supabase. A lista desta tela foi atualizada.');
    }
  };

  const logoSrc = form.logo || '/logo.svg'; // logo do projeto como padrão

  if (loading) return <div className="auth-loading"><div className="spin" /></div>;

  return (
    <>
      <CloudBar cloud={cloud} />

      <div className="cfg-hero">
        <img src={logoSrc} alt="Logo" className="cfg-hero-logo" />
        <div className="cfg-hero-info">
          <h2>{form.nome || 'Meu Consultório'}</h2>
          <div className="cfg-hero-meta">
            {form.dentista && <span>{form.dentista}</span>}
            {form.cro && <span>{form.cro}</span>}
            <span className="hl">{dents.length} Dentista(s) Na Equipe</span>
          </div>
        </div>
        <button className="cfg-hero-save" onClick={save} disabled={busy}>
          {saved ? <><CheckCircle2 size={16} /> Salvo ✓</> : <><Save size={16} /> {busy ? 'Salvando...' : 'Salvar Tudo'}</>}
        </button>
      </div>

      <div className="cfg-tabs">
        {TABS.map(([key, label, Icon]) => (
          <button key={key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>
            <Icon size={15} /> {label}
            {key === 'equipe' && dents.length > 0 && <em>{dents.length}</em>}
          </button>
        ))}
      </div>

      {tab === 'clinica' && (
        <div className="cfg-panel">
          <div className="cfg-sec-title"><b>Dados Do Consultório</b><small>Nome, Responsável E Contato — Usados No Cabeçalho Da Receita.</small></div>
          <label>Nome Do Consultório*<input value={form.nome} onChange={e => set('nome', e.target.value)} placeholder="Ex: Sorriso Perfeito Odontologia" /></label>
          <div className="form-2col">
            <label>Dentista Responsável<input value={form.dentista} onChange={e => set('dentista', e.target.value)} placeholder="Quem assina por padrão" /></label>
            <label>CRO<input value={form.cro} onChange={e => set('cro', e.target.value)} placeholder="CRO-SP 00000" /></label>
          </div>
          <div className="form-2col">
            <label>Telefone<input value={form.telefone} onChange={e => set('telefone', e.target.value)} placeholder="(11) 99999-9999" /></label>
            <label>E-Mail<input value={form.email} onChange={e => set('email', e.target.value)} placeholder="contato@clinica.com" /></label>
          </div>
          <label>Endereço<input value={form.endereco} onChange={e => set('endereco', e.target.value)} placeholder="Rua, número, bairro, cidade" /></label>
          <div className="cfg-savebar">
            <button className="btn-primary" onClick={save} disabled={busy}><Save size={16} /> {busy ? 'Salvando...' : 'Salvar Configurações'}</button>
            {saved && <div className="saved-msg" style={{ marginTop: 0 }}><CheckCircle2 size={16} /> Configurações Salvas Com Sucesso!</div>}
          </div>
        </div>
      )}

      {tab === 'equipe' && (
        <div className="cfg-panel">
          <div className="cfg-sec-title"><b>Quem Atende No Consultório</b><small>Vale Para O Agendamento E Para As Prescrições — Edite Ou Remova Quando Quiser. O Histórico Feito Com Um Nome Removido É Mantido.</small></div>
          {dentCloud === false && (
            <div className="cloud-warn">Equipe salva só neste aparelho: a tabela «dentists» não foi encontrada na nuvem. Rode a migration_004 no SQL Editor do Supabase para sincronizar.</div>
          )}
          <div className="member-grid">
            {dents.map(d => (
              <div className="member" key={d.id}>
                <span className="member-avatar">{initials(d.nome)}</span>
                {editingId === d.id ? (
                  <div className="member-edit">
                    <input value={editNome} onChange={e => setEditNome(e.target.value)} placeholder="Nome do dentista" />
                    <input value={editCro} onChange={e => setEditCro(e.target.value)} placeholder="CRO-SP 00000" />
                    <div className="member-actions">
                      <button className="btn-sm primary" onClick={saveEdit}><Save size={13} /> Salvar</button>
                      <button className="btn-sm" onClick={cancelEdit}><X size={13} /></button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="member-info">
                      <b>{d.nome}</b>
                      {d.cro ? <span className="cro-chip">{d.cro}</span> : <small>Sem CRO Informado</small>}
                    </div>
                    <div className="member-actions">
                      <button className="icon-btn" title="Editar dentista" onClick={() => startEdit(d)}><Pencil size={14} /></button>
                      {confirmDel === d.id ? (
                        <button className="btn-sm danger" title="Clique para confirmar a exclusão" onClick={() => delDent(d)}>Confirmar?</button>
                      ) : (
                        <button className="icon-btn danger" title="Remover da equipe" onClick={() => askDel(d)}><Trash2 size={14} /></button>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
            <div className="member add">
              <span className="member-avatar ghost"><Plus size={20} /></span>
              <div className="member-edit">
                <input value={dentNome} onChange={e => setDentNome(e.target.value)} placeholder="Nome do novo dentista*" />
                <input value={dentCro} onChange={e => setDentCro(e.target.value)} placeholder="CRO-SP 00000" />
                <div className="member-actions">
                  <button className="btn-sm primary" onClick={addDentista}><Plus size={13} /> Adicionar À Equipe</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'receita' && (
        <div className="cfg-panel">
          <div className="cfg-sec-title"><b>Logo E Impressão</b><small>A Logo Vai Para A Barra Lateral E Para O Topo Da Receita.</small></div>
          <div className="rx-grid">
            <div>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => onFile(e.target.files[0])} />
              <div className="logo-drop" onClick={() => fileRef.current.click()}>
                <img src={logoSrc} alt="Logo Do Consultório" className="logo-preview" />
                <b>{form.logo ? 'Clique Para Trocar A Logo' : 'Logo Padrão — Clique Para Enviar A Sua'}</b>
                <small style={{ color: '#5b6b7c' }}>PNG Ou JPG De Até 1,5 MB</small>
              </div>
              <div className="actions">
                <button className="btn-sm primary" onClick={() => fileRef.current.click()}><ImagePlus size={14} /> {form.logo ? 'Trocar Logo' : 'Enviar Logo'}</button>
                {form.logo && <button className="btn-sm danger" onClick={() => set('logo', '')}><Trash2 size={14} /> Remover</button>}
              </div>
            </div>
            <div>
              <small className="rx-cap">Pré-visualização — cabeçalho da receita impressa</small>
              <div className="rx-preview">
                <div className="rx-head">
                  <img src={logoSrc} alt="Logo" />
                  <div><b>{form.nome}</b><small>{form.dentista} • {form.cro}<br />{form.endereco} • {form.telefone}</small></div>
                </div>
                <small style={{ color: '#5b6b7c' }}>Receita Odontológica — Nome Do Paciente, Medicamento, Dosagem...</small>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
