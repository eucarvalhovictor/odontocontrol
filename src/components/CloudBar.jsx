import { WifiOff } from 'lucide-react';

// Aparece quando o banco ainda não responde (schema.sql não executado ou
// sem rede): o app segue funcionando com os dados locais do navegador.
export default function CloudBar({ cloud }) {
  if (cloud !== false) return null;
  return (
    <div className="cloud-warn">
      <WifiOff size={15} />
      <span><b>Modo local.</b> Execute o <b>supabase/schema.sql</b> no SQL Editor do Supabase para salvar no banco e sincronizar entre dispositivos.</span>
    </div>
  );
}
