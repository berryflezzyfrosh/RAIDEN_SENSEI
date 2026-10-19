import { useEffect, useState } from 'react';
import { Crosshair, Cpu, Camera, Crown, Save, Trash2, LogOut, User as UserIcon, Activity, Wallet } from 'lucide-react';
import { Card, Button, Badge, Spinner } from '@/components/ui';
import { PremiumBadge } from '@/components/PremiumLock';
import { useAuth } from '@/hooks/useAuth';
import { navigate } from '@/hooks/useRouter';
import { supabase } from '@/lib/supabase';
import { getPresetMeta } from '@/lib/presets';
import { deviceSummary, detectDevice } from '@/utils/device';
import type { SavedSensitivity, Payment } from '@/types';

export function DashboardPage() {
  const { user, profile, isPremium, signOut } = useAuth();
  const [sens, setSens] = useState<SavedSensitivity[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { navigate('login'); return; }
    (async () => {
      const [s, p] = await Promise.all([
        supabase.from('saved_sensitivities').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('payments').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      ]);
      setSens((s.data as SavedSensitivity[]) ?? []);
      setPayments((p.data as Payment[]) ?? []);
      setLoading(false);
    })();
  }, [user]);

  if (!user) return null;

  const device = detectDevice();

  const delSens = async (id: string) => {
    const { error } = await supabase.from('saved_sensitivities').delete().eq('id', id);
    if (!error) setSens((cur) => cur.filter((x) => x.id !== id));
  };

  const pendingPay = payments.find((p) => p.status === 'pending' || p.status === 'under_review');

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10">
      <header className="mb-8 animate-fade-up">
        <h1 className="font-display text-3xl font-bold text-neutral-900">
          Hello, <span className="text-gradient-orange">{profile?.display_name || user.email}</span>
        </h1>
        <p className="mt-1 text-sm text-neutral-500">Your gaming dashboard</p>
      </header>

      {/* Status cards */}
      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wide text-neutral-400 font-semibold">Account</span>
            {isPremium ? <PremiumBadge /> : <Badge color="neutral">FREE</Badge>}
          </div>
          <div className="mt-2 text-sm text-neutral-700">{profile?.email}</div>
          <div className="mt-1 text-xs text-neutral-500">
            {profile?.account_status === 'active' ? 'Active account' : profile?.account_status}
          </div>
        </Card>
        <Card className="p-5">
          <div className="text-xs uppercase tracking-wide text-neutral-400 font-semibold">Saved profiles</div>
          <div className="mt-2 text-2xl font-display font-bold text-neutral-900">
            {sens.length}{!isPremium && <span className="text-sm text-neutral-400"> / 3</span>}
          </div>
          <div className="mt-1 text-xs text-neutral-500">{isPremium ? 'Unlimited' : 'Free limit'}</div>
        </Card>
        <Card className="p-5">
          <div className="text-xs uppercase tracking-wide text-neutral-400 font-semibold">Payments</div>
          <div className="mt-2 text-2xl font-display font-bold text-neutral-900">{payments.length}</div>
          <div className="mt-1 text-xs text-neutral-500">
            {pendingPay ? 'Pending review' : isPremium ? 'Premium active' : 'No active payment'}
          </div>
        </Card>
      </div>

      {/* Quick actions */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <QuickAction icon={<Crosshair />} label="Generate Sensitivity" onClick={() => navigate('sensitivity')} />
        <QuickAction icon={<Cpu />} label="Device Analysis" onClick={() => navigate('device')} />
        <QuickAction icon={<Camera />} label="Face Analysis" onClick={() => navigate('face')} />
        <QuickAction icon={<Crown />} label={isPremium ? 'Premium' : 'Upgrade'} onClick={() => navigate('premium')} highlight={!isPremium} />
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Saved sensitivities */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-bold text-neutral-900 flex items-center gap-2"><Save size={18} /> Saved sensitivities</h2>
            <Button size="sm" variant="outline" onClick={() => navigate('sensitivity')}>New</Button>
          </div>
          {loading ? <Spinner label="Loading..." /> : sens.length === 0 ? (
            <div className="text-center py-8 text-sm text-neutral-400">
              <Save size={32} className="mx-auto mb-2 opacity-40" />
              No saved profiles yet.
            </div>
          ) : (
            <div className="space-y-2">
              {sens.map((s) => (
                <div key={s.id} className="rounded-xl border border-neutral-200 p-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold text-sm text-neutral-900 truncate">{s.name}</div>
                      <div className="text-xs text-neutral-500 mt-0.5">
                        {getPresetMeta(s.preset as never)?.label ?? s.preset} • {s.confidence}% conf.
                      </div>
                      <div className="text-xs text-neutral-400 mt-0.5">{deviceSummary(device)}</div>
                    </div>
                    <button onClick={() => delSens(s.id)} className="text-neutral-400 hover:text-red-500" aria-label="Delete">
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                    {Object.entries(s.values).map(([k, v]) => (
                      <span key={k} className="px-2 py-0.5 rounded bg-neutral-100 text-neutral-700">
                        {k.replace('_', ' ')}: {v as number}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Payment + activity */}
        <div className="space-y-5">
          <Card className="p-5">
            <h2 className="font-display font-bold text-neutral-900 flex items-center gap-2 mb-3"><Wallet size={18} /> Payment status</h2>
            {payments.length === 0 ? (
              <div className="text-sm text-neutral-400">
                No payments yet.{' '}
                <button onClick={() => navigate('premium')} className="text-orange-600 font-semibold hover:underline">Upgrade to Premium</button>
              </div>
            ) : (
              <div className="space-y-2">
                {payments.slice(0, 3).map((p) => (
                  <div key={p.id} className="flex items-center justify-between text-sm border-b border-neutral-100 pb-2">
                    <span className="text-neutral-700">₦{Number(p.amount).toLocaleString()}</span>
                    <Badge color={p.status === 'verified' ? 'green' : p.status === 'rejected' ? 'red' : 'amber'}>
                      {p.status.replace('_', ' ')}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="font-display font-bold text-neutral-900 flex items-center gap-2 mb-3"><Activity size={18} /> Account</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-neutral-500">Email</span><span className="font-medium text-neutral-900 truncate ml-2">{user.email}</span></div>
              <div className="flex justify-between"><span className="text-neutral-500">Joined</span><span className="font-medium text-neutral-900">{new Date(profile?.created_at ?? Date.now()).toLocaleDateString()}</span></div>
            </div>
            <div className="mt-4 flex gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate('profile')}><UserIcon size={14} /> Profile</Button>
              <Button variant="ghost" size="sm" onClick={signOut}><LogOut size={14} /> Logout</Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function QuickAction({ icon, label, onClick, highlight }: { icon: React.ReactNode; label: string; onClick: () => void; highlight?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 rounded-xl border p-4 text-left card-hover ${
        highlight ? 'border-amber-300 bg-gradient-to-br from-amber-50 to-white' : 'border-neutral-200 bg-white'
      }`}
    >
      <span className={`inline-flex h-10 w-10 items-center justify-center rounded-lg ${highlight ? 'bg-amber-500 text-white' : 'bg-orange-50 text-orange-600'}`}>
        {icon}
      </span>
      <span className="font-semibold text-sm text-neutral-900">{label}</span>
    </button>
  );
}
