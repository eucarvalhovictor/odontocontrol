import { useState, useRef } from 'react';
import { Camera, KeyRound, Mail, Save, Trash2, UserRound } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { fileToDataURL } from '../lib/image';

export default function Perfil() {
  const { user, refresh } = useAuth();
  const meta = user?.user_metadata || {};

  const [nome, setNome] = useState(meta.nome || '');
  const [avatar, setAvatar] = useState(meta.avatar || '');
  const [msg1, setMsg1] = useState(null); // {ok, text}
  const [busy1, setBusy1] = useState(false);
  const photoRef = useRef(null);

  const [newMail, setNewMail] = useState('');
  const [msg2, setMsg2] = useState(null);
  const [busy2, setBusy2] = useState(false);

  const [p1, setP1] = useState('');
  const [p2, setP2] = useState('');
  const [msg3, setMsg3] = useState(null);
  const [busy3, setBusy3] = useState(false);

  const onPhoto = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { setMsg1({ ok: false, text: 'Envie um arquivo de imagem.' }); return; }
    try {
      setAvatar(await fileToDataURL(file, { maxDim: 256, quality: 0.8 }));
      setMsg1(null);
    } catch { setMsg1({ ok: false, text: 'Não foi possível ler a imagem.' }); }
  };

  const saveProfile = async () => {
    if (!nome.trim()) { setMsg1({ ok: false, text: 'Informe seu nome.' }); return; }
    setBusy1(true);
    const { error } = await supabase.auth.updateUser({ data: { ...meta, nome: nome.trim(), avatar: avatar || null } });
    setBusy1(false);
    if (error) setMsg1({ ok: false, text: error.message });
    else { await refresh(); setMsg1({ ok: true, text: 'Perfil atualizado!' }); }
  };

  const saveMail = async () => {
    const mail = newMail.trim().toLowerCase();
    if (!mail || !mail.includes('@')) { setMsg2({ ok: false, text: 'Informe um e-mail válido.' }); return; }
    if (mail === (user?.email || '').toLowerCase()) { setMsg2({ ok: false, text: 'Este já é o seu e-mail atual.' }); return; }
    setBusy2(true);
    const { error } = await supabase.auth.updateUser({ email: mail });
    setBusy2(false);
    if (error) setMsg2({ ok: false, text: error.message });
    else {
      await refresh();
      setNewMail('');
      setMsg2({ ok: true, text: 'Verifique o novo e-mail e clique no link de confirmação para concluir a troca.' });
    }
  };

  const savePass = async () => {
    if (p1.length < 6) { setMsg3({ ok: false, text: 'A senha deve ter ao menos 6 caracteres.' }); return; }
    if (p1 !== p2) { setMsg3({ ok: false, text: 'As senhas não conferem.' }); return; }
    setBusy3(true);
    const { error } = await supabase.auth.updateUser({ password: p1 });
    setBusy3(false);
    if (error) setMsg3({ ok: false, text: error.message });
    else { setP1(''); setP2(''); setMsg3({ ok: true, text: 'Senha alterada com sucesso!' }); }
  };

  return (
    <div className="cfg-grid">
      <div className="cfg-card">
        <h3><UserRound size={17} /> Foto e Nome</h3>
        <p className="desc">Sua foto aparece na barra lateral do painel.</p>
        <input ref={photoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => onPhoto(e.target.files[0])} />
        <div className="photo-row">
          {avatar
            ? <img src={avatar} alt="Foto de perfil" className="avatar-circle" />
            : <span className="avatar-circle empty"><Camera size={30} /></span>}
          <div className="col">
            <button type="button" className="btn-sm" onClick={() => photoRef.current.click()}><Camera size={13} /> {avatar ? 'Trocar foto' : 'Enviar foto'}</button>
            {avatar && <button type="button" className="btn-sm danger" onClick={() => setAvatar('')}><Trash2 size={13} /> Remover</button>}
          </div>
        </div>
        <label style={{ marginTop: 12 }}>Nome<input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Dra. Camila" /></label>
        <button className="btn-primary" onClick={saveProfile} disabled={busy1}><Save size={16} /> {busy1 ? 'Salvando...' : 'Salvar Perfil'}</button>
        {msg1 && <div className={msg1.ok ? 'saved-msg' : 'error'} style={msg1.ok ? {} : { marginTop: 12 }}>{msg1.text}</div>}
      </div>

      <div className="cfg-card">
        <h3><Mail size={17} /> E-mail de Acesso</h3>
        <p className="desc">E-mail atual: <b style={{ textTransform: 'lowercase' }}>{user?.email}</b></p>
        <label>Novo e-mail<input type="email" value={newMail} onChange={e => setNewMail(e.target.value)} placeholder="voce@consultorio.com" autoCapitalize="none" autoCorrect="off" spellCheck={false} /></label>
        <button className="btn-primary" onClick={saveMail} disabled={busy2}><Save size={16} /> {busy2 ? 'Salvando...' : 'Alterar E-mail'}</button>
        {msg2 && <div className={msg2.ok ? 'ok-msg' : 'error'} style={msg2.ok ? {} : { marginTop: 12 }}>{msg2.text}</div>}

        <h3 style={{ marginTop: 22 }}><KeyRound size={17} /> Senha</h3>
        <p className="desc">Mínimo de 6 caracteres.</p>
        <label>Nova senha<input type="password" value={p1} onChange={e => setP1(e.target.value)} /></label>
        <label>Confirmar senha<input type="password" value={p2} onChange={e => setP2(e.target.value)} /></label>
        <button className="btn-primary" onClick={savePass} disabled={busy3}><Save size={16} /> {busy3 ? 'Salvando...' : 'Alterar Senha'}</button>
        {msg3 && <div className={msg3.ok ? 'saved-msg' : 'error'} style={msg3.ok ? {} : { marginTop: 12 }}>{msg3.text}</div>}
      </div>
    </div>
  );
}
