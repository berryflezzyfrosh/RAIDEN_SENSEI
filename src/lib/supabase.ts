import { createClient } from '@supabase/supabase-js';

const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim().replace(/\/+$/, '');
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
export const SUPABASE_ANON_KEY = anonKey ?? '';
export const SUPABASE_URL = url ?? '';

export function getOwnerAuthEndpoint(): string {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('This site build is missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Set both in the hosting provider and rebuild/redeploy the frontend.');
  }
  let parsed: URL;
  try {
    parsed = new URL(SUPABASE_URL);
  } catch {
    throw new Error('VITE_SUPABASE_URL is not a valid absolute URL. Set it to your Supabase project URL and rebuild/redeploy the frontend.');
  }
  if (parsed.protocol !== 'https:' && parsed.hostname !== 'localhost' && parsed.hostname !== '127.0.0.1') {
    throw new Error('VITE_SUPABASE_URL must use HTTPS for the deployed site.');
  }
  return `${SUPABASE_URL}/functions/v1/owner-auth`;
}

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

