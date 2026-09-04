import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

// If env is missing we still export a placeholder so the UI can show a
// "not connected" banner instead of crashing.
export const configured = Boolean(url && anon && !String(url).includes('your-project'));

export const supabase = configured
  ? createClient(url, anon, { auth: { persistSession: true } })
  : null;
