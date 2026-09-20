import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';
import { store, uid } from './store';

// Camada de dados: Supabase como fonte primária, SEMPRE filtrando por
// user_id (o id do dentista logado). Se o banco ainda não foi criado ou a
// rede falhar, cai para o espelho em localStorage para o app não travar.
export const TABLES = {
  patients: 'odonto_patients',
  appointments: 'odonto_appointments',
  prescriptions: 'odonto_prescriptions',
  supplies: 'odonto_supplies',
  expenses: 'odonto_expenses',
  receipts: 'odonto_receipts',
  evolutions: 'odonto_evolutions',
  odontogram: 'odonto_odontogram',
  perio: 'odonto_perio',
  dentists: 'odonto_dentists',
};

async function cloudList(table, userId) {
  const { data, error } = await supabase
    .from(table).select('*').eq('user_id', userId).order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

export function useCloudTable(table, userId) {
  const localKey = TABLES[table];
  const [items, setItems] = useState(() => store.get(localKey, []));
  const [loading, setLoading] = useState(true);
  const [cloud, setCloud] = useState(null); // null = desconhecido, true/false
  const [cloudError, setCloudError] = useState('');

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    let alive = true;
    (async () => {
      try {
        const rows = await cloudList(table, userId);
        if (alive) { setItems(rows); setCloud(true); setCloudError(''); snap(rows); }
      } catch (e) {
        if (alive) {
          setItems(store.get(localKey, [])); setCloud(false);
          setCloudError(e?.message || String(e));
          console.warn(`[odonto] tabela "${table}" em modo local:`, e?.message || e);
        }
      } finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [table, userId]);

  const localSave = (next) => { store.set(localKey, next); setItems(next); setCloud(false); };
  const snap = (rows) => { try { store.set(localKey, rows); } catch { /* quota cheia: segue sem espelho */ } };

  const add = useCallback(async (obj) => {
    const row = { ...obj, id: obj.id || uid() };
    if (userId) {
      try {
        const { data, error } = await supabase
          .from(table).insert({ ...row, user_id: userId }).select().single();
        if (error) throw error;
        setItems((prev) => { const next = [...prev, data]; snap(next); return next; });
        setCloud(true);
        return data;
      } catch { /* cai para o modo local */ }
    }
    const next = [...items, row];
    localSave(next);
    return row;
  }, [table, userId, items]);

  const update = useCallback(async (id, patch) => {
    if (userId) {
      try {
        const { data, error } = await supabase
          .from(table).update(patch).eq('id', id).eq('user_id', userId).select().single();
        if (error) throw error;
        setItems((prev) => { const next = prev.map((x) => (x.id === id ? data : x)); snap(next); return next; });
        setCloud(true);
        return data;
      } catch { /* cai para o modo local */ }
    }
    const next = items.map((x) => (x.id === id ? { ...x, ...patch } : x));
    localSave(next);
    return next.find((x) => x.id === id);
  }, [table, userId, items]);

  // Retorna true quando excluiu na nuvem, false quando caiu no modo local
  const remove = useCallback(async (id) => {
    if (userId) {
      try {
        const { error } = await supabase
          .from(table).delete().eq('id', id).eq('user_id', userId);
        if (error) throw error;
        setItems((prev) => { const next = prev.filter((x) => x.id !== id); snap(next); return next; });
        setCloud(true);
        return true;
      } catch { /* cai para o modo local */ }
    }
    localSave(items.filter((x) => x.id !== id));
    return false;
  }, [table, userId, items]);

  return { items, loading, cloud, cloudError, add, update, remove };
}

// ---- Configurações (1 linha por dentista) ----
export const SETTINGS_DEFAULTS = {
  nome: 'OdontoControl — Consultório Odontológico',
  dentista: '', cro: '', telefone: '', email: '', endereco: '', logo: '',
};
const SETTING_FIELDS = ['nome', 'dentista', 'cro', 'telefone', 'email', 'endereco', 'logo'];

export function useSettings(userId) {
  const [settings, setSettings] = useState(() => ({ ...SETTINGS_DEFAULTS, ...store.get('odonto_settings', {}) }));
  const [loading, setLoading] = useState(true);
  const [cloud, setCloud] = useState(null);

  const load = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    try {
      const { data, error } = await supabase
        .from('settings').select('*').eq('user_id', userId).maybeSingle();
      if (error) throw error;
      if (data) setSettings({ ...SETTINGS_DEFAULTS, ...data });
      setCloud(true);
    } catch {
      setSettings({ ...SETTINGS_DEFAULTS, ...store.get('odonto_settings', {}) });
      setCloud(false);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => { load(); }, [load]);
  // Layout e Prescrições recarregam quando Configurações salva
  useEffect(() => {
    window.addEventListener('odonto:settings', load);
    return () => window.removeEventListener('odonto:settings', load);
  }, [load]);

  const save = async (form) => {
    store.set('odonto_settings', form); // espelho local imediato
    if (userId) {
      try {
        const { error } = await supabase.from('settings').upsert(
          { ...form, user_id: userId, updated_at: new Date().toISOString() },
          { onConflict: 'user_id' },
        );
        if (error) throw error;
        setCloud(true);
      } catch { setCloud(false); }
    }
    setSettings({ ...form });
    window.dispatchEvent(new Event('odonto:settings'));
  };

  return { settings, loading, cloud, save };
}

// ---- Prontuário: tabelas filhas vinculadas ao paciente ----
// Toda linha carrega user_id (dono) + patient_id. RLS garante o isolamento.
export function useChildTable(table, localKey, userId, patientId) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cloud, setCloud] = useState(null);

  useEffect(() => {
    if (!userId || !patientId) { setLoading(false); return; }
    let alive = true;
    (async () => {
      try {
        const { data, error } = await supabase.from(table).select('*')
          .eq('user_id', userId).eq('patient_id', patientId).order('created_at', { ascending: true });
        if (error) throw error;
        if (alive) { setItems(data || []); setCloud(true); }
      } catch {
        if (alive) { setItems(store.get(localKey, []).filter((r) => r.patient_id === patientId)); setCloud(false); }
      } finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [table, localKey, userId, patientId]);

  const add = async (obj) => {
    const row = { ...obj, id: obj.id || uid(), patient_id: patientId };
    if (userId) {
      try {
        const { data, error } = await supabase.from(table)
          .insert({ ...row, user_id: userId }).select().single();
        if (error) throw error;
        setItems((prev) => [...prev, data]);
        setCloud(true);
        return data;
      } catch { /* modo local */ }
    }
    const all = [...store.get(localKey, []), row];
    store.set(localKey, all);
    setItems(all.filter((r) => r.patient_id === patientId));
    setCloud(false);
    return row;
  };

  const update = async (id, patch) => {
    if (userId) {
      try {
        const { data, error } = await supabase.from(table)
          .update(patch).eq('id', id).eq('user_id', userId).select().single();
        if (error) throw error;
        setItems((prev) => prev.map((x) => (x.id === id ? data : x)));
        setCloud(true);
        return data;
      } catch { /* modo local */ }
    }
    const all = store.get(localKey, []).map((x) => (x.id === id ? { ...x, ...patch } : x));
    store.set(localKey, all);
    setItems(all.filter((r) => r.patient_id === patientId));
    setCloud(false);
  };

  const remove = async (id) => {
    if (userId) {
      try {
        const { error } = await supabase.from(table).delete().eq('id', id).eq('user_id', userId);
        if (error) throw error;
        setItems((prev) => prev.filter((x) => x.id !== id));
        setCloud(true);
        return;
      } catch { /* modo local */ }
    }
    const all = store.get(localKey, []).filter((x) => x.id !== id);
    store.set(localKey, all);
    setItems(all.filter((r) => r.patient_id === patientId));
    setCloud(false);
  };

  return { items, loading, cloud, add, update, remove };
}

// ---- Anamnese: 1 ficha por paciente (upsert por patient_id) ----
const ANAMNESE_FIELDS = ['queixa_principal', 'historico', 'hipertensao', 'diabete', 'cardiopatia', 'alergias', 'medicamentos', 'cirurgias', 'tabagista', 'gestante', 'observacoes'];
export const ANAMNESE_DEFAULTS = {
  queixa_principal: '', historico: '', hipertensao: false, diabete: false,
  cardiopatia: false, alergias: '', medicamentos: '', cirurgias: '',
  tabagista: false, gestante: false, observacoes: '',
};
// Legado: antes o campo se chamava 'fumante' — normaliza para 'tabagista'
// sem perder o valor já salvo (nuvem antiga ou espelho local).
const normalizeAnamnese = (row) => {
  if (!row) return row;
  if (row.tabagista === undefined && row.fumante !== undefined) {
    const { fumante, ...rest } = row;
    return { ...rest, tabagista: fumante };
  }
  return row;
};

export function useAnamnese(userId, patientId) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cloud, setCloud] = useState(null);

  useEffect(() => {
    if (!userId || !patientId) { setLoading(false); return; }
    let alive = true;
    (async () => {
      try {
        const { data: row, error } = await supabase.from('anamneses').select('*')
          .eq('user_id', userId).eq('patient_id', patientId).maybeSingle();
        if (error) throw error;
        if (alive) { setData(normalizeAnamnese(row) || null); setCloud(true); }
      } catch {
        if (alive) {
          setData(normalizeAnamnese(store.get('odonto_anamnesis', []).find((r) => r.patient_id === patientId)) || null);
          setCloud(false);
        }
      } finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [userId, patientId]);

  const save = async (values) => {
    const clean = {};
    ANAMNESE_FIELDS.forEach((f) => { clean[f] = values[f] ?? ANAMNESE_DEFAULTS[f]; });
    if (userId) {
      try {
        const { data: row, error } = await supabase.from('anamneses').upsert(
          { ...clean, user_id: userId, patient_id: patientId, updated_at: new Date().toISOString() },
          { onConflict: 'patient_id' },
        ).select().single();
        if (error) throw error;
        setData(row);
        setCloud(true);
        return row;
      } catch { /* modo local */ }
    }
    const all = store.get('odonto_anamnesis', []).filter((r) => r.patient_id !== patientId);
    const row = { ...clean, patient_id: patientId };
    store.set('odonto_anamnesis', [...all, row]);
    setData(row);
    setCloud(false);
    return row;
  };

  return { data, loading, cloud, save };
}
