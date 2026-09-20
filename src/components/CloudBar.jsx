import { WifiOff } from 'lucide-react';

// Aparece quando o banco ainda não responde: mostra o motivo real
// (tabela ausente, RLS, rede) em vez de culpar sempre o schema.sql.
export default function CloudBar({ cloud, table, detail }) {
  if (cloud !== false) return null;
  const msg = detail || '';
  const missingTable = /Could not find the table|relation .* does not exist|42P01|PGRST205/i.test(msg);
  return (
    <div className="cloud-warn">
      <WifiOff size={15} />
      <span>
        <b>Modo local{table ? ` (${table})` : ''}.</b>{' '}
        {missingTable ? (
          <>A tabela <b>{table || 'do banco'}</b> não existe no Supabase. Rode o <b>supabase/schema.sql</b> + migrations no SQL Editor.</>
        ) : (
          <>Sem sincronizar com a nuvem agora. Verifique a conexão e as políticas RLS.</>
        )}
        {msg && <small style={{ display: 'block', marginTop: 4, opacity: .8 }}>Detalhe: {msg.slice(0, 220)}</small>}
      </span>
    </div>
  );
}
