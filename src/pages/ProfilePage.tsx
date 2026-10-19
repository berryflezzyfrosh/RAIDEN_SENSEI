import { useState } from 'react';
import { User as UserIcon, Mail, Save, CheckCircle2, Crown } from 'lucide-react';
import { Card, Button, Badge } from '@/components/ui';
import { PremiumBadge } from '@/components/PremiumLock';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { navigate } from '@/hooks/useRouter';

export function ProfilePage() {
  const { user, profile, isPremium, refreshProfile } = useAuth();
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  if (!user) {
    navigate('login');
    return null;
  }

  const save = async () => {
    setSaving(true);
    setError('');
    const { error } = await supabase
      .from('user_profiles')
      .update({ display_name: displayName.slice(0, 40), updated_at: new Date().toISOString() })
      .eq('id', user.id);
    if (error) setError(error.message);
    else {
      setSaved(true);
      await refreshProfile();
      setTimeout(() => setSaved(false), 1800);
    }
    setSaving(false);
  };

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-10">
      <header className="mb-6 animate-fade-up">
        <h1 className="font-display text-3xl font-bold text-neutral-900">Profile</h1>
        <p className="mt-1 text-sm text-neutral-500">Manage your account details.</p>
      </header>

      <Card className="p-6 animate-fade-up">
        <div className="flex items-center gap-4">
          <span className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 text-white text-2xl font-bold">
            {(profile?.display_name || user.email || '?').slice(0, 1).toUpperCase()}
          </span>
          <div>
            <div className="font-display font-bold text-neutral-900 text-lg">{profile?.display_name || 'Player'}</div>
            <div className="text-sm text-neutral-500">{user.email}</div>
            <div className="mt-1 flex gap-2">
              {isPremium ? <PremiumBadge /> : <Badge color="neutral">FREE</Badge>}
              <Badge color={profile?.account_status === 'active' ? 'green' : 'red'}>{profile?.account_status}</Badge>
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <label className="block">
            <span className="block text-sm font-medium text-neutral-700 mb-1.5">Display name</span>
            <div className="relative">
              <UserIcon size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value.slice(0, 40))}
                className="w-full rounded-xl border border-neutral-300 bg-white pl-10 pr-4 py-2.5 text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-200 focus:outline-none"
              />
            </div>
          </label>

          <div>
            <span className="block text-sm font-medium text-neutral-700 mb-1.5">Email</span>
            <div className="relative">
              <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                value={user.email ?? ''}
                disabled
                className="w-full rounded-xl border border-neutral-200 bg-neutral-50 pl-10 pr-4 py-2.5 text-sm text-neutral-500"
              />
            </div>
          </div>

          {error && <div className="text-sm text-red-600">{error}</div>}

          <div className="flex gap-2">
            <Button onClick={save} loading={saving}>
              {saved ? <><CheckCircle2 size={16} /> Saved</> : <><Save size={16} /> Save changes</>}
            </Button>
            {!isPremium && (
              <Button variant="premium" onClick={() => navigate('premium')}>
                <Crown size={16} /> Upgrade
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
