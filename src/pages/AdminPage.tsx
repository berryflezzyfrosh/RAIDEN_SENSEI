import { useEffect, useState, useCallback } from 'react';
import {
  Shield, Users, Crown, Clock, CheckCircle2, XCircle, Banknote,
  Search, Ban, RotateCcw, Settings, ScrollText, X, Eye, MessageCircle, Store,
} from 'lucide-react';
import { Card, Button, Badge, Spinner, Input } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { navigate } from '@/hooks/useRouter';
import { supabase } from '@/lib/supabase';
import { MessagesPage } from '@/pages/MessagesPage';
import { AdminMarketplaceTab } from '@/pages/AdminMarketplaceTab';
import type { AdminUserRow, AdminPaymentRow, AdminLogRow, PaymentStatus } from '@/types';

type Tab = 'overview' | 'users' | 'payments' | 'messages' | 'marketplace' | 'logs' | 'settings';

export function AdminPage() {
  const { isAdmin, loading } = useAuth();
  const [tab, setTab] = useState<Tab>('overview');
  const { data: moderationRows, reload: reloadModeration } = useAdminCall<{ review_status: string }[]>('admin_list_marketplace_moderation');
  const pendingMarketplaceCount = moderationRows?.filter((listing) => listing.review_status === 'pending').length ?? 0;

  useEffect(() => {
    if (!isAdmin) return;
    const channel = supabase.channel('admin-marketplace-moderation')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'free_fire_account_listings' }, () => { void reloadModeration(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'free_fire_hud_listings' }, () => { void reloadModeration(); })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [isAdmin, reloadModeration]);

  useEffect(() => {
    if (!loading && !isAdmin) navigate('admin-login');
  }, [isAdmin, loading]);

  if (!isAdmin) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Spinner label="Checking admin access..." />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
      <header className="mb-6 animate-fade-up">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-900 text-white">
            <Shield size={20} />
          </span>
          <div>
            <h1 className="font-display text-2xl font-bold text-neutral-900">Admin Dashboard</h1>
            <p className="text-xs text-neutral-500">Owner control panel</p>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto no-scrollbar mb-5 border-b border-neutral-200">
        {([
          { id: 'overview', label: 'Overview', icon: Shield },
          { id: 'users', label: 'Users', icon: Users },
          { id: 'payments', label: 'Payments', icon: Banknote },
          { id: 'messages', label: 'Messages', icon: MessageCircle },
          { id: 'marketplace', label: 'Marketplace', icon: Store },
          { id: 'logs', label: 'Logs', icon: ScrollText },
          { id: 'settings', label: 'Settings', icon: Settings },
        ] as { id: Tab; label: string; icon: typeof Shield }[]).map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition ${
                tab === t.id ? 'border-orange-500 text-orange-700' : 'border-transparent text-neutral-500 hover:text-neutral-800'
              }`}
            >
              <Icon size={15} /> {t.label}
              {t.id === 'marketplace' && pendingMarketplaceCount > 0 && <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-800">{pendingMarketplaceCount}</span>}
            </button>
          );
        })}
      </div>

      {tab === 'overview' && <Overview />}
      {tab === 'users' && <UsersTab />}
      {tab === 'payments' && <PaymentsTab />}
      {tab === 'messages' && <MessagesPage adminInbox />}
      {tab === 'marketplace' && <AdminMarketplaceTab />}
      {tab === 'logs' && <LogsTab />}
      {tab === 'settings' && <SettingsTab />}
    </div>
  );
}

function useAdminCall<T>(rpc: string, args?: Record<string, unknown>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const serializedArgs = JSON.stringify(args ?? {});
  const reload = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc(rpc, JSON.parse(serializedArgs));
    if (error) setError(error.message);
    else setError('');
    setData((data as T) ?? null);
    setLoading(false);
  }, [rpc, serializedArgs]);

  useEffect(() => { reload(); }, [reload]);
  return { data, loading, error, reload };
}

function Overview() {
  const { data: users } = useAdminCall<AdminUserRow[]>('admin_list_users');
  const { data: payments } = useAdminCall<AdminPaymentRow[]>('admin_list_payments');

  const stats = {
    total: users?.length ?? 0,
    premium: users?.filter((u) => u.premium_status === 'premium').length ?? 0,
    free: users?.filter((u) => u.premium_status === 'free').length ?? 0,
    pending: payments?.filter((p) => p.status === 'pending' || p.status === 'under_review').length ?? 0,
    verified: payments?.filter((p) => p.status === 'verified').length ?? 0,
    rejected: payments?.filter((p) => p.status === 'rejected').length ?? 0,
  };

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <StatCard icon={<Users />} label="Total users" value={stats.total} color="orange" />
      <StatCard icon={<Crown />} label="Premium users" value={stats.premium} color="amber" />
      <StatCard icon={<Users />} label="Free users" value={stats.free} color="neutral" />
      <StatCard icon={<Clock />} label="Pending payments" value={stats.pending} color="amber" />
      <StatCard icon={<CheckCircle2 />} label="Verified payments" value={stats.verified} color="green" />
      <StatCard icon={<XCircle />} label="Rejected payments" value={stats.rejected} color="red" />
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: 'orange' | 'amber' | 'neutral' | 'green' | 'red' }) {
  const colors = {
    orange: 'from-orange-500 to-orange-600',
    amber: 'from-amber-400 to-orange-500',
    neutral: 'from-neutral-700 to-neutral-900',
    green: 'from-emerald-500 to-emerald-600',
    red: 'from-red-500 to-red-600',
  };
  return (
    <Card className="p-5">
      <div className={`inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${colors[color]} text-white shadow-md`}>
        {icon}
      </div>
      <div className="mt-3 text-3xl font-display font-extrabold text-neutral-900">{value}</div>
      <div className="text-sm text-neutral-500">{label}</div>
    </Card>
  );
}

function UsersTab() {
  const { data: users, loading, error, reload } = useAdminCall<AdminUserRow[]>('admin_list_users');
  const [q, setQ] = useState('');
  const [acting, setActing] = useState<string | null>(null);

  const filtered = (users ?? []).filter((u) =>
    u.email.toLowerCase().includes(q.toLowerCase()) ||
    u.display_name.toLowerCase().includes(q.toLowerCase())
  );

  const act = async (action: 'suspend' | 'restore' | 'revoke', userId: string) => {
    setActing(userId);
    const rpc = action === 'suspend' ? 'admin_suspend_user' : action === 'restore' ? 'admin_restore_user' : 'admin_revoke_premium';
    const { data, error } = await supabase.rpc(rpc, { p_user_id: userId });
    if (error || data !== true) alert(error?.message ?? 'The requested user action was not completed.');
    await reload();
    setActing(null);
  };

  if (loading) return <Spinner label="Loading users..." />;
  if (error) return <div className="text-red-600 text-sm">{error}</div>;

  return (
    <div>
      <div className="mb-4 relative max-w-sm">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by email or name"
          className="w-full rounded-xl border border-neutral-300 bg-white pl-10 pr-4 py-2.5 text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-200 focus:outline-none"
        />
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-4 py-3 font-semibold">User</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Premium</th>
                <th className="px-4 py-3 font-semibold">Joined</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filtered.map((u) => (
                <tr key={u.id} className="hover:bg-neutral-50">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-neutral-900">{u.display_name || '—'}</div>
                    <div className="text-xs text-neutral-500">{u.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge color={u.account_status === 'active' ? 'green' : 'red'}>{u.account_status}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    {u.premium_status === 'premium' ? <Badge color="amber"><Crown size={10} /> Premium</Badge> : <Badge color="neutral">Free</Badge>}
                  </td>
                  <td className="px-4 py-3 text-xs text-neutral-500">{new Date(u.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-1.5">
                      {u.premium_status === 'premium' && (
                        <button onClick={() => act('revoke', u.id)} disabled={acting === u.id} title="Revoke premium" className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50">
                          <Crown size={15} />
                        </button>
                      )}
                      {u.account_status === 'active' ? (
                        <button onClick={() => act('suspend', u.id)} disabled={acting === u.id} title="Suspend" className="p-1.5 rounded-lg text-red-500 hover:bg-red-50">
                          <Ban size={15} />
                        </button>
                      ) : (
                        <button onClick={() => act('restore', u.id)} disabled={acting === u.id} title="Restore" className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50">
                          <RotateCcw size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function PaymentsTab() {
  const { data: payments, loading, error, reload } = useAdminCall<AdminPaymentRow[]>('admin_list_payments');
  const [filter, setFilter] = useState<PaymentStatus | 'all'>('all');
  const [viewing, setViewing] = useState<AdminPaymentRow | null>(null);
  const [acting, setActing] = useState<string | null>(null);

  const filtered = (payments ?? []).filter((p) => filter === 'all' || p.status === filter);

  const act = async (action: 'verify' | 'reject', payId: string) => {
    setActing(payId);
    const rpc = action === 'verify' ? 'admin_verify_payment' : 'admin_reject_payment';
    const { data, error } = await supabase.rpc(rpc, { p_payment_id: payId, p_note: '' });
    if (error || data !== true) alert(error?.message ?? 'Payment review was not completed. Confirm the payment is still pending and has a receipt.');
    await reload();
    setActing(null);
  };

  if (loading) return <Spinner label="Loading payments..." />;
  if (error) return <div className="text-red-600 text-sm">{error}</div>;

  return (
    <div>
      <div className="flex gap-1.5 mb-4 overflow-x-auto no-scrollbar">
        {(['all', 'pending', 'under_review', 'verified', 'rejected'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${
              filter === f ? 'bg-orange-100 text-orange-700' : 'bg-neutral-100 text-neutral-600'
            }`}
          >
            {f.replace('_', ' ')}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card className="p-8 text-center text-neutral-400 text-sm">No payments in this view.</Card>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((p) => (
            <Card key={p.id} className="p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge color={p.status === 'verified' ? 'green' : p.status === 'rejected' ? 'red' : 'amber'}>
                      {p.status.replace('_', ' ')}
                    </Badge>
                    <Badge color="neutral">{p.plan ?? 'Legacy plan'}</Badge>
                    {p.purpose === 'hud' && <Badge color="blue">HUD · {p.hud_listing_id?.slice(0, 8) ?? 'listing'}</Badge>}
                    <span className="font-semibold text-neutral-900">₦{Number(p.amount).toLocaleString()}</span>
                    <span className="text-xs text-neutral-500 font-mono">{p.transaction_reference}</span>
                  </div>
                  <div className="mt-1.5 text-xs text-neutral-500">
                    {new Date(p.created_at).toLocaleString()}
                    {p.review_note && <span className="ml-2">• Note: {p.review_note}</span>}
                  </div>
                  {p.fraud_flags && p.fraud_flags.length > 0 && (
                    <div className="mt-1 text-xs text-amber-700">
                      Screening risk {p.fraud_risk_score}/100: {p.fraud_flags.join(', ')}
                    </div>
                  )}
                </div>
                <div className="flex gap-1.5">
                  {p.storage_path && (
                    <button onClick={() => setViewing(p)} className="p-2 rounded-lg text-neutral-600 hover:bg-neutral-100" title="View receipt">
                      <Eye size={16} />
                    </button>
                  )}
                  {(p.status === 'pending' || p.status === 'under_review') && (
                    <>
                      <Button size="sm" onClick={() => act('verify', p.id)} loading={acting === p.id} disabled={!p.storage_path}>Verify</Button>
                      <Button size="sm" variant="danger" onClick={() => act('reject', p.id)} loading={acting === p.id}>Reject</Button>
                    </>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {viewing && <ReceiptModal payment={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}

function ReceiptModal({ payment, onClose }: { payment: AdminPaymentRow; onClose: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    (async () => {
      if (!payment.storage_path) return;
      const { data } = await supabase.storage.from('receipts').createSignedUrl(payment.storage_path, 300);
      setUrl(data?.signedUrl ?? null);
    })();
  }, [payment.storage_path]);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-neutral-200">
          <h3 className="font-display font-bold text-neutral-900">Receipt — {payment.transaction_reference}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-neutral-100"><X size={18} /></button>
        </div>
        <div className="p-4">
          {url ? (
            payment.mime_type?.startsWith('image/') ? (
              <img src={url} alt="Receipt" className="w-full rounded-lg" />
            ) : (
              <a href={url} target="_blank" rel="noopener noreferrer" className="text-orange-600 underline">Open receipt</a>
            )
          ) : (
            <Spinner label="Loading receipt..." />
          )}
          <div className="mt-4 text-sm space-y-1">
            <div><span className="text-neutral-500">Amount:</span> ₦{Number(payment.amount).toLocaleString()}</div>
            <div><span className="text-neutral-500">Status:</span> {payment.status}</div>
            <div><span className="text-neutral-500">File:</span> {payment.file_name}</div>
            <div><span className="text-neutral-500">Submitted:</span> {new Date(payment.created_at).toLocaleString()}</div>
            <div><span className="text-neutral-500">OCR confidence:</span> {Math.round((payment.ocr_confidence ?? 0) * 100)}%</div>
            <div><span className="text-neutral-500">Screening risk:</span> {payment.fraud_risk_score}/100</div>
            {payment.ocr_text && <pre className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap rounded-lg bg-neutral-50 p-3 text-xs text-neutral-700">{payment.ocr_text}</pre>}
          </div>
        </div>
      </div>
    </div>
  );
}

function LogsTab() {
  const { data: logs, loading, error } = useAdminCall<AdminLogRow[]>('admin_list_logs', { p_limit: 100 });
  if (loading) return <Spinner label="Loading logs..." />;
  if (error) return <div className="text-red-600 text-sm">{error}</div>;
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-4 py-3 font-semibold">Time</th>
              <th className="px-4 py-3 font-semibold">Kind</th>
              <th className="px-4 py-3 font-semibold">Event</th>
              <th className="px-4 py-3 font-semibold">User</th>
              <th className="px-4 py-3 font-semibold">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {(logs ?? []).map((l) => (
              <tr key={`${l.kind}-${l.id}`} className="hover:bg-neutral-50">
                <td className="px-4 py-3 text-xs text-neutral-500">{new Date(l.created_at).toLocaleString()}</td>
                <td className="px-4 py-3"><Badge color={l.kind === 'admin' ? 'orange' : 'blue'}>{l.kind}</Badge></td>
                <td className="px-4 py-3 font-medium text-neutral-900">{l.event}</td>
                <td className="px-4 py-3 text-xs text-neutral-500 font-mono">{l.user_id?.slice(0, 8) ?? '—'}</td>
                <td className="px-4 py-3 text-xs text-neutral-500">{JSON.stringify(l.metadata)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function SettingsTab() {
  const [price, setPrice] = useState('');
  const [bank, setBank] = useState('');
  const [accName, setAccName] = useState('');
  const [accNum, setAccNum] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('app_config').select('key, value');
      for (const r of data ?? []) {
        if (r.key === 'premium_price') setPrice(r.value);
        if (r.key === 'opay_bank') setBank(r.value);
        if (r.key === 'opay_account_name') setAccName(r.value);
        if (r.key === 'opay_account_number') setAccNum(r.value);
      }
    })();
  }, []);

  const save = async () => {
    const parsedPrice = Number(price);
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      setError('Enter a valid premium price greater than zero.');
      return;
    }
    setSaving(true);
    setError('');
    const upserts = [
      ['premium_price', price],
      ['opay_bank', bank],
      ['opay_account_name', accName],
      ['opay_account_number', accNum],
    ] as const;
    for (const [k, v] of upserts) {
      const { data, error: saveError } = await supabase.rpc('admin_update_app_config', { p_key: k, p_value: v });
      if (saveError || data !== true) {
        setError(saveError?.message ?? `Could not save ${k}.`);
        setSaving(false);
        return;
      }
    }
    setSaved(true);
    setSaving(false);
    setTimeout(() => setSaved(false), 1800);
  };

  return (
    <Card className="p-6 max-w-xl">
      <h2 className="font-display font-bold text-neutral-900 mb-4">Payment configuration</h2>
      <div className="space-y-4">
        <Input label="Premium price (₦)" type="number" value={price} onChange={setPrice} />
        <Input label="Bank" value={bank} onChange={setBank} />
        <Input label="Account name" value={accName} onChange={setAccName} />
        <Input label="Account number" value={accNum} onChange={setAccNum} />
        {error && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{error}</div>}
        <Button onClick={save} loading={saving}>
          {saved ? <><CheckCircle2 size={16} /> Saved</> : 'Save settings'}
        </Button>
      </div>
    </Card>
  );
}
