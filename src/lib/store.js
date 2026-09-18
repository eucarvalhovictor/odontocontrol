export const uid = () => (window.crypto?.randomUUID ? window.crypto.randomUUID() : Math.random().toString(36).slice(2, 10));
export const todayISO = () => new Date().toISOString().slice(0, 10);
export const fmtDate = (iso) => {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

const get = (k, fb) => {
  try { return JSON.parse(localStorage.getItem(k)) ?? fb; } catch { return fb; }
};
const set = (k, v) => localStorage.setItem(k, JSON.stringify(v));

export const store = { get, set };
export const isAuth = () => sessionStorage.getItem('odonto_auth') === '1';
