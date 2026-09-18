import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';
import { store } from './store';

// Cobrança: só cartão de crédito, via Stripe.
// Sem chaves no .env, o checkout roda em MODO DEMONSTRAÇÃO (verificação
// simulada da operadora, sem cobrar de verdade). Com VITE_STRIPE_PAYMENT_LINK
// configurado, o comprador é levado ao checkout hospedado do Stripe e a
// assinatura é ativada pelo webhook (Supabase Edge Function) — até lá o
// acesso fica pendente ("aguardando confirmação").

export const PLAN_PRICE = 99.9;
export const TRIAL_DAYS = 7;

const SUB_KEY_PREFIX = 'odonto_subscription:';

const subKey = (userId) => (userId ? `${SUB_KEY_PREFIX}${userId}` : null);

// Remove cache legado global (uma vez liberado, valia para qualquer conta
// nova no mesmo navegador — era isso que liberava acesso sem pagamento).
try {
  if (localStorage.getItem('odonto_subscription')) {
    localStorage.removeItem('odonto_subscription');
  }
} catch { /* ignore */ }

export function stripeConfig() {
  return {
    paymentLink: import.meta.env.VITE_STRIPE_PAYMENT_LINK || '',
    publishableKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '',
  };
}

// 'stripe-link' = cobra de verdade pelo Stripe hospedado; 'demo' = simulação.
export function billingMode() {
  return stripeConfig().paymentLink ? 'stripe-link' : 'demo';
}

// Status que liberam o acesso: active, ou trialing dentro do prazo.
export function isLiberated(sub) {
  if (!sub) return false;
  if (sub.status === 'active') return true;
  if (sub.status === 'trialing') {
    if (!sub.trial_ends_at) return true;
    return new Date(sub.trial_ends_at).getTime() > Date.now();
  }
  return false;
}

export function useSubscription(userId) {
  const [sub, setSub] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) { setSub(null); setLoading(false); return null; }
    setLoading(true);
    const key = subKey(userId);
    try {
      const { data, error } = await supabase.from('subscriptions')
        .select('*').eq('user_id', userId).maybeSingle();
      if (error) throw error;
      if (data) {
        setSub(data);
        try { if (key) store.set(key, data); } catch { /* ignore */ }
      } else {
        // Conta nova sem assinatura: nunca reaproveitar cache de outro usuário.
        setSub(null);
        try { if (key) localStorage.removeItem(key); } catch { /* ignore */ }
      }
      return data;
    } catch {
      // Sem acesso ao banco, só confia no cache DESTE usuário (não global).
      const cached = key ? store.get(key, null) : null;
      // Só aceita o cache se for do mesmo user_id.
      if (cached && cached.user_id !== userId && cached.id !== userId) {
        setSub(null);
        return null;
      }
      setSub(cached);
      return cached;
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  // Ativa a assinatura após pagamento/verificação aprovada.
  // gateway: 'demo' | 'stripe'
  const activate = useCallback(async ({ last4, brand, gateway }) => {
    const trialEnds = new Date(Date.now() + TRIAL_DAYS * 86400000).toISOString();
    const row = {
      user_id: userId,
      status: 'trialing',
      plan: 'unico',
      gateway: gateway || billingMode(),
      card_last4: last4 || null,
      card_brand: brand || null,
      trial_ends_at: trialEnds,
      updated_at: new Date().toISOString(),
    };
    try {
      const { data, error } = await supabase.from('subscriptions')
        .upsert(row, { onConflict: 'user_id' }).select().single();
      if (error) throw error;
      setSub(data);
      try { const k = subKey(userId); if (k) store.set(k, data); } catch { /* ignore */ }
      return data;
    } catch {
      const local = { ...row, id: row.user_id };
      setSub(local);
      try { const k = subKey(userId); if (k) store.set(k, local); } catch { /* ignore */ }
      return local;
    }
  }, [userId]);

  return { sub, loading, load, activate, liberated: isLiberated(sub) };
}

// ---------- Cartão de crédito: validação ----------

export function onlyDigits(v) { return (v || '').replace(/\D/g, ''); }

export function formatCardNumber(v) {
  return onlyDigits(v).slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 ');
}

export function formatExpiry(v) {
  const d = onlyDigits(v).slice(0, 4);
  if (d.length <= 2) return d;
  return d.slice(0, 2) + '/' + d.slice(2);
}

export function detectBrand(number) {
  const d = onlyDigits(number);
  if (/^4/.test(d)) return 'Visa';
  if (/^(5[1-5]|2[2-7])/.test(d)) return 'Mastercard';
  if (/^3[47]/.test(d)) return 'Amex';
  if (/^(4011|4312|4389|4514|4576|5041|5066|5067|509[0-9]|6277|6362|6363|650|6516|6550)/.test(d)) return 'Elo';
  if (/^(606282|3841)/.test(d)) return 'Hipercard';
  return 'Cartão';
}

export function luhnOk(number) {
  const d = onlyDigits(number);
  if (d.length < 13 || d.length > 19) return false;
  let sum = 0;
  let dbl = false;
  for (let i = d.length - 1; i >= 0; i--) {
    let n = +d[i];
    if (dbl) { n *= 2; if (n > 9) n -= 9; }
    sum += n;
    dbl = !dbl;
  }
  return sum % 10 === 0;
}

export function validateCard({ number, name, expiry, cvv }) {
  if (!luhnOk(number)) return 'Número do cartão inválido. Confira os dígitos.';
  if (!name.trim()) return 'Informe o nome impresso no cartão.';
  const m = (expiry || '').match(/^(0[1-9]|1[0-2])\/(\d{2})$/);
  if (!m) return 'Validade inválida. Use o formato MM/AA.';
  const exp = new Date(2000 + +m[2], +m[1], 0, 23, 59, 59);
  if (exp.getTime() < Date.now()) return 'Cartão vencido. Use outro cartão.';
  if (!/^\d{3,4}$/.test(onlyDigits(cvv))) return 'CVV inválido (3 ou 4 dígitos).';
  return '';
}

// ---------- Verificação junto à operadora ----------
// Hoje: simulação fiel do fluxo Stripe (latência + aprovação/recusa).
// Com backend + Stripe real, trocar o corpo por confirmCardSetup/setupIntent.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function processCardPayment({ number }) {
  const d = onlyDigits(number);
  await sleep(1800); // ida à "operadora"
  if (d.endsWith('0002')) {
    const err = new Error('Pagamento recusado pela operadora (cartão sem limite/autorização negada). Tente outro cartão.');
    err.code = 'card_declined';
    throw err;
  }
  if (!luhnOk(number)) {
    const err = new Error('Cartão inválido.');
    err.code = 'invalid_card';
    throw err;
  }
  return {
    ok: true,
    last4: d.slice(-4),
    brand: detectBrand(d),
    authCode: Math.random().toString(36).slice(2, 8).toUpperCase(),
  };
}

// Cartões de teste do modo demonstração (números oficiais de teste Stripe)
export const DEMO_CARDS = [
  { number: '4242 4242 4242 4242', label: 'aprovado' },
  { number: '4000 0000 0000 0002', label: 'recusado' },
];
