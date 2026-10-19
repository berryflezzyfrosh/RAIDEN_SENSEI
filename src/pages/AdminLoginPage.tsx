import { useState } from 'react';
import { Shield, Mail, Lock, Key, AlertCircle, CheckCircle2, Crown } from 'lucide-react';
import { Card, Button } from '@/components/ui';
import { Logo } from '@/components/Logo';
import { supabase, SUPABASE_URL } from '@/lib/supabase';
import { navigate } from '@/hooks/useRouter';
import { useAuth } from '@/hooks/useAuth';

export function AdminLoginPage() {
  const { refreshProfile } = useAuth();
  const [mode, setMode] = useState<'login' | 'bootstrap'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secret, setSecret] = useState('');
  const [newSecret, setNewSecret] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);
    try {
      const fnUrl = `${SUPABASE_URL}/functions/v1/owner-auth`;
      if (mode === 'bootstrap') {
        const res = await fetch(fnUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode: 'bootstrap_set_secret', newSecret }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Bootstrap failed');
        setInfo('Owner secret set. You can now create your admin account.');
        setMode('login');
        setLoading(false);
        return;
      }

      const res = await fetch(fnUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'signup',
          email,
          password,
          ownerSecret: secret,
          displayName,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Auth failed');

      // The edge function returns a session; set it in the client.
      if (data.session?.access_token) {
        const { error: setErr } = await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
        if (setErr) throw setErr;
        await refreshProfile();
        navigate('admin');
      } else {
        throw new Error('No session returned.');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const loginInstead = async () => {
    setError('');
    setInfo('');
    setLoading(true);
    try {
      const fnUrl = `${SUPABASE_URL}/functions/v1/owner-auth`;
      const res = await fetch(fnUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'login', email, password, ownerSecret: secret }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      if (data.session?.access_token) {
        const { error: setErr } = await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
        if (setErr) throw setErr;
        await refreshProfile();
        navigate('admin');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gradient-to-b from-neutral-900 via-neutral-900 to-black px-4 py-10">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-6">
          <Logo size={44} withText />
        </div>
        <Card className="p-7 animate-scale-in bg-white">
          <div className="text-center">
            <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-900 text-white shadow-lg">
              <Shield size={26} />
            </div>
            <h1 className="mt-3 font-display text-2xl font-bold text-neutral-900">Owner Access</h1>
            <p className="mt-1 text-sm text-neutral-500">
              {mode === 'bootstrap' ? 'Initialize the owner secret (first run only)' : 'Secure admin login'}
            </p>
          </div>

          <form onSubmit={submit} className="mt-6 space-y-4">
            {mode === 'bootstrap' ? (
              <>
                <Field icon={<Key size={16} />} label="Choose an owner secret (min 8 chars)">
                  <input
                    type="password"
                    value={newSecret}
                    onChange={(e) => setNewSecret(e.target.value)}
                    placeholder="Long random secret"
                    className="w-full rounded-xl border border-neutral-300 bg-white pl-10 pr-4 py-2.5 text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-200 focus:outline-none"
                  />
                </Field>
                <Button type="submit" full size="lg" loading={loading}>Initialize secret</Button>
                <button type="button" onClick={() => setMode('login')} className="block w-full text-center text-sm text-neutral-500 hover:underline">
                  Already have a secret? Log in
                </button>
              </>
            ) : (
              <>
                <Field icon={<UserIconSmall />} label="Display name (only for first signup)">
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value.slice(0, 40))}
                    placeholder="Owner"
                    className="w-full rounded-xl border border-neutral-300 bg-white pl-10 pr-4 py-2.5 text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-200 focus:outline-none"
                  />
                </Field>
                <Field icon={<Mail size={16} />} label="Email">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="owner@example.com"
                    className="w-full rounded-xl border border-neutral-300 bg-white pl-10 pr-4 py-2.5 text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-200 focus:outline-none"
                  />
                </Field>
                <Field icon={<Lock size={16} />} label="Password">
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full rounded-xl border border-neutral-300 bg-white pl-10 pr-4 py-2.5 text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-200 focus:outline-none"
                  />
                </Field>
                <Field icon={<Key size={16} />} label="Owner secret">
                  <input
                    type="password"
                    required
                    value={secret}
                    onChange={(e) => setSecret(e.target.value)}
                    placeholder="Server-stored owner secret"
                    className="w-full rounded-xl border border-neutral-300 bg-white pl-10 pr-4 py-2.5 text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-200 focus:outline-none"
                  />
                </Field>

                {error && (
                  <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
                    <AlertCircle size={16} className="mt-0.5 flex-shrink-0" /> {error}
                  </div>
                )}
                {info && (
                  <div className="flex items-start gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                    <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0" /> {info}
                  </div>
                )}

                <Button type="submit" full size="lg" loading={loading}>
                  <Crown size={16} /> Create admin account
                </Button>
                <button
                  type="button"
                  onClick={loginInstead}
                  className="block w-full text-center text-sm text-neutral-500 hover:underline"
                >
                  Already have an admin account? Log in
                </button>
                <button
                  type="button"
                  onClick={() => setMode('bootstrap')}
                  className="block w-full text-center text-xs text-neutral-400 hover:underline"
                >
                  First run: initialize owner secret
                </button>
              </>
            )}
          </form>
        </Card>
        <p className="mt-4 text-center text-xs text-neutral-400">
          The owner secret is verified server-side and never stored in the browser.
        </p>
      </div>
    </div>
  );
}

function Field({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-neutral-700 mb-1.5">{label}</span>
      <div className="relative">{icon}{children}</div>
    </label>
  );
}

function UserIconSmall() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  );
}
