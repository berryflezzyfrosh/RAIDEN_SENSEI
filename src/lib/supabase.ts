import { createClient } from '@supabase/supabase-js';

const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim().replace(/\/+$/, '');
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
export const SUPABASE_ANON_KEY = anonKey ?? '';
export const SUPABASE_URL = url ?? '';

export function getSupabaseConfigError(): string | null {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return 'This site build is missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Add both as GitHub Actions repository secrets and rebuild/redeploy the site.';
  }
  let parsed: URL;
  try {
    parsed = new URL(SUPABASE_URL);
  } catch {
    return 'VITE_SUPABASE_URL in this site build is not a valid absolute URL. Set it to your Supabase project URL and rebuild/redeploy.';
  }
  if (parsed.protocol !== 'https:' && parsed.hostname !== 'localhost' && parsed.hostname !== '127.0.0.1') {
    return 'VITE_SUPABASE_URL in this site build must use HTTPS.';
  }
  return null;
}

export function getOwnerAuthEndpoint(): string {
  const configError = getSupabaseConfigError();
  if (configError) throw new Error(configError);
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

