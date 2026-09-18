import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Zera dados locais legados (demo): contas novas e existentes começam com
// painéis vazios. A fonte de verdade é o Supabase, isolada por usuário.
const LEGACY = ['odonto_patients', 'odonto_appointments', 'odonto_prescriptions', 'odonto_supplies', 'odonto_settings', 'odonto_seeded', 'odonto_auth'];
if (localStorage.getItem('odonto_wipe_v2') !== '1') {
  LEGACY.forEach((k) => localStorage.removeItem(k));
  sessionStorage.removeItem('odonto_auth');
  localStorage.setItem('odonto_wipe_v2', '1');
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
