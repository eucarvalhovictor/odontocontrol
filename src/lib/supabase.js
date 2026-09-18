import { createClient } from '@supabase/supabase-js';

// Projeto: OdontoControl — https://nivfesmuvlxnqhhipunm.supabase.co
// A anon key é pública por natureza (o isolamento real é feito pelas
// políticas RLS em supabase/schema.sql: cada dentista só enxerga as
// linhas cujo user_id é o seu próprio auth.uid()).
const URL = import.meta.env.VITE_SUPABASE_URL || 'https://nivfesmuvlxnqhhipunm.supabase.co';
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pdmZlc211dmx4bnFoaGlwdW5tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk1Nzk4NDMsImV4cCI6MjEwNTE1NTg0M30.XKwrWjO6D7HScSfgLINfpWHV15EmpPCWVFccJA8ezuw';

export const supabase = createClient(URL, ANON);
