// Connexion à Supabase (clé publique uniquement).
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm';
import { SUPABASE_URL, SUPABASE_KEY } from './config.js';

function keyProblem(key) {
  if (!key || key.startsWith('COLLEZ')) return 'missing';
  if (key.startsWith('sb_secret_')) return 'secret';
  try {
    const part = key.split('.')[1];
    if (part) {
      const json = JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/')));
      if (json.role === 'service_role') return 'secret';
    }
  } catch (e) { /* clé au nouveau format : pas un JWT, c'est normal */ }
  return null;
}

export const configProblem = keyProblem(SUPABASE_KEY); // null = tout est bon

export const supabase = configProblem
  ? null
  : createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
