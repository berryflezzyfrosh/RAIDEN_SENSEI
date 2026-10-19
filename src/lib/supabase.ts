import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
export const SUPABASE_ANON_KEY = anonKey ?? '';

if (!url || !anonKey) {
  // In dev, surface a helpful error. The values are pre-populated in hosted env.
  console.error('Missing Supabase env vars. Check .env for VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY.');
}

export const supabase = createClient(
  (url ?? 'http://localhost:54321') as string,
  (anonKey ?? 'public') as string,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);

export const SUPABASE_URL = url ?? '';
