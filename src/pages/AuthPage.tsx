import { useState } from 'react';
import { Mail, Lock, User as UserIcon, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button, Card } from '@/components/ui';
import { Logo } from '@/components/Logo';
import { navigate } from '@/hooks/useRouter';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseConfigError, supabase } from '@/lib/supabase';

export function AuthPage({ mode }: { mode: 'login' | 'signup' }) {
  const { refreshProfile } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (mode === 'signup' && !displayName.trim()) {
      setError('Enter a display name.');
      return;
    }
    setLoading(true);
    try {
      const configError = getSupabaseConfigError();
      if (configError) throw new Error(configError);
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { display_name: displayName.trim() } },
        });
        if (error) throw error;
        if (data.user && !data.session) {
          setSuccess(data.user.identities?.length === 0
            ? 'An account with this email may already exist. Try logging in.'
            : 'Account created. Check your email to confirm your account, then log in.');
        } else if (data.session) {
          await refreshProfile(data.user?.id);
          navigate('dashboard');
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        await refreshProfile(data.user.id);
        navigate('dashboard');
      }
    } catch (err) {
      const msg = (err as Error).message;
      const normalizedMessage = msg.toLowerCase();
      setError(
        /failed to fetch|networkerror|load failed/i.test(msg)
          ? 'Could not reach Supabase Auth. Check your connection and confirm this GitHub Pages build has the correct Supabase URL and anon key.'
          : normalizedMessage.includes('email not confirmed')
          ? 'Confirm your email using the link Supabase sent you, then log in.'
          : normalizedMessage.includes('database error saving new user') ||
            normalizedMessage.includes('user_profiles') ||
            normalizedMessage.includes('schema cache')
          ? 'This Supabase project is missing the app database setup. Apply all project migrations, then try creating the account again.'
          : normalizedMessage.includes('invalid login')
          ? 'Wrong email or password.'
          : normalizedMessage.includes('already registered')
          ? 'That email is already registered. Try logging in.'
          : msg,
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gradient-to-b from-orange-50/60 to-white px-4 py-10">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-6">
          <Logo size={44} withText />
        </div>
        <Card className="p-7 animate-scale-in">
          <h1 className="font-display text-2xl font-bold text-neutral-900 text-center">
            {mode === 'signup' ? 'Create your account' : 'Welcome back'}
          </h1>
          <p className="mt-1.5 text-sm text-neutral-500 text-center">
            {mode === 'signup'
              ? 'Save sensitivities, track your device, unlock premium.'
              : 'Log in to access your dashboard and saved profiles.'}
          </p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            {mode === 'signup' && (
              <div>
                <span className="block text-sm font-medium text-neutral-700 mb-1.5">Display name</span>
                <div className="relative">
                  <UserIcon size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value.slice(0, 40))}
                    placeholder="Player tag"
                    autoComplete="nickname"
                    className="w-full rounded-xl border border-neutral-300 bg-white pl-10 pr-4 py-2.5 text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-200 focus:outline-none"
                  />
                </div>
              </div>
            )}
            <div>
              <span className="block text-sm font-medium text-neutral-700 mb-1.5">Email</span>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  className="w-full rounded-xl border border-neutral-300 bg-white pl-10 pr-4 py-2.5 text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-200 focus:outline-none"
                />
              </div>
            </div>
            <div>
              <span className="block text-sm font-medium text-neutral-700 mb-1.5">Password</span>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  className="w-full rounded-xl border border-neutral-300 bg-white pl-10 pr-4 py-2.5 text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-200 focus:outline-none"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
                <AlertCircle size={16} className="mt-0.5 flex-shrink-0" /> {error}
              </div>
            )}
            {success && (
              <div className="flex items-start gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0" /> {success}
              </div>
            )}

            <Button type="submit" full size="lg" loading={loading}>
              {mode === 'signup' ? 'Create account' : 'Log in'}
            </Button>
          </form>

          <div className="mt-5 text-center text-sm text-neutral-500">
            {mode === 'signup' ? (
              <>Already have an account?{' '}
                <button onClick={() => navigate('login')} className="font-semibold text-orange-600 hover:underline">
                  Log in
                </button>
              </>
            ) : (
              <>New here?{' '}
                <button onClick={() => navigate('signup')} className="font-semibold text-orange-600 hover:underline">
                  Create an account
                </button>
              </>
            )}
          </div>
        </Card>
        <p className="mt-4 text-center text-xs text-neutral-400">
          Are you the site owner?{' '}
          <button onClick={() => navigate('admin-login')} className="font-semibold text-neutral-600 hover:underline">
            Admin access
          </button>
        </p>
      </div>
    </div>
  );
}
