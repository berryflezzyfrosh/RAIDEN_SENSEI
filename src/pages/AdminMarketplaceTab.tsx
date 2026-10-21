import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Check, EyeOff, Image as ImageIcon, RefreshCw, ShieldCheck, Store, X } from 'lucide-react';
import { Badge, Button, Card, Spinner } from '@/components/ui';
import { supabase } from '@/lib/supabase';

interface ModerationListing {
  listing_type: 'account' | 'hud';
  listing_id: string;
  seller_id: string;
  seller_name: string;
  title: string;
  description: string;
  asking_price: number;
  category: string;
  status: 'active' | 'sold' | 'hidden';
  review_status: 'pending' | 'approved' | 'rejected';
  review_reason: string;
  ai_review_decision: string;
  created_at: string;
  details: Record<string, unknown>;
}

type Filter = 'pending' | 'approved' | 'rejected' | 'all';

function formatDate(value: string) {
  return new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

function previewUrl(path: string) {
  return supabase.storage.from('marketplace').getPublicUrl(path).data.publicUrl;
}

export function AdminMarketplaceTab() {
  const [listings, setListings] = useState<ModerationListing[]>([]);
  const [filter, setFilter] = useState<Filter>('pending');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: loadError } = await supabase.rpc('admin_list_marketplace_moderation');
    if (loadError) setError(loadError.message);
    else {
      setError('');
      setListings((data ?? []) as ModerationListing[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => filter === 'all'
    ? listings
    : listings.filter((listing) => listing.review_status === filter), [filter, listings]);
  const pendingCount = listings.filter((listing) => listing.review_status === 'pending').length;

  const review = async (listing: ModerationListing, decision: 'approved' | 'rejected') => {
    const reason = decision === 'approved'
      ? 'Approved by administrator.'
      : window.prompt('Reason for rejecting this listing:', 'Does not meet marketplace rules.');
    if (reason === null) return;
    setBusyId(listing.listing_id);
    const { data, error: reviewError } = await supabase.rpc('admin_review_marketplace_listing', {
      p_listing_type: listing.listing_type,
      p_listing_id: listing.listing_id,
      p_decision: decision,
      p_reason: reason,
    });
    if (reviewError || data !== true) setError(reviewError?.message ?? 'The listing review was not saved.');
    await load();
    setBusyId(null);
  };

  const remove = async (listing: ModerationListing) => {
    if (!window.confirm(`Remove “${listing.title}” from the public marketplace? Existing purchase records will be retained.`)) return;
    const reason = window.prompt('Removal reason:', 'Removed by administrator for marketplace policy violation.');
    if (reason === null) return;
    setBusyId(listing.listing_id);
    const { data, error: removeError } = await supabase.rpc('admin_remove_marketplace_listing', {
      p_listing_type: listing.listing_type,
      p_listing_id: listing.listing_id,
      p_reason: reason,
    });
    if (removeError || data !== true) setError(removeError?.message ?? 'The listing could not be removed.');
    await load();
    setBusyId(null);
  };

  const deleteListing = async (listing: ModerationListing) => {
    if (!window.confirm(`Permanently delete “${listing.title}”? If this HUD has buyers, it will be removed from public view while their download access is retained.`)) return;
    setBusyId(listing.listing_id);
    const { data, error: deleteError } = await supabase.rpc('admin_delete_marketplace_listing', {
      p_listing_type: listing.listing_type,
      p_listing_id: listing.listing_id,
    });
    if (deleteError) setError(deleteError.message);
    else if (data === 'hidden_preserving_purchases') setNotice('HUD removed from public view. Existing buyer downloads remain available.');
    else if (data === 'deleted') setNotice('Listing permanently deleted.');
    else setError(data === 'not_found' ? 'Listing was already removed.' : 'The listing could not be deleted.');
    await load();
    setBusyId(null);
  };

  return <div>
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="font-display text-lg font-bold text-neutral-900">Marketplace moderation</h2><p className="mt-1 text-sm text-neutral-500">Pending posts stay hidden until approved. Account-transfer listings require human review.</p></div>
      <Button variant="outline" size="sm" onClick={() => void load()}><RefreshCw size={15} />Refresh</Button>
    </div>
    {error && <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"><AlertTriangle size={16} />{error}<button onClick={() => setError('')} className="ml-auto" aria-label="Dismiss"><X size={15} /></button></div>}
    {notice && <div className="mb-4 flex items-start justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}<button onClick={() => setNotice('')} aria-label="Dismiss" className="text-emerald-700"><X size={15} /></button></div>}
    <div className="mb-4 flex gap-1.5 overflow-x-auto">{(['pending', 'approved', 'rejected', 'all'] as const).map((item) => <button key={item} onClick={() => setFilter(item)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize ${filter === item ? 'bg-orange-100 text-orange-700' : 'bg-neutral-100 text-neutral-600'}`}>{item}{item === 'pending' ? ` (${pendingCount})` : ''}</button>)}</div>
    {loading ? <Spinner label="Loading marketplace posts..." /> : filtered.length === 0 ? <Card className="p-8 text-center"><Store size={26} className="mx-auto text-neutral-300" /><p className="mt-2 text-sm text-neutral-500">No {filter === 'all' ? '' : `${filter} `}marketplace posts.</p></Card> : <div className="space-y-3">{filtered.map((listing) => {
      const imagePaths = Array.isArray(listing.details.images) ? listing.details.images.filter((path): path is string => typeof path === 'string') : [];
      const hudPreview = typeof listing.details.preview_path === 'string' ? listing.details.preview_path : '';
      const images = listing.listing_type === 'account' ? imagePaths : hudPreview ? [hudPreview] : [];
      return <Card key={`${listing.listing_type}-${listing.listing_id}`} className="overflow-hidden">
        <div className="grid gap-0 md:grid-cols-[220px_minmax(0,1fr)]">
          {images.length ? <div className="grid grid-cols-2 gap-1 bg-neutral-100 p-1 md:grid-cols-1">{images.slice(0, 4).map((path) => <img key={path} src={previewUrl(path)} alt={`${listing.title} submission preview`} className="aspect-[4/3] max-h-40 w-full object-cover md:aspect-[16/10]" loading="lazy" />)}</div> : <div className="flex min-h-28 items-center justify-center bg-neutral-50 text-neutral-300"><ImageIcon size={28} /></div>}
          <div className="p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><Badge color={listing.listing_type === 'account' ? 'blue' : 'orange'}>{listing.listing_type === 'account' ? 'Account' : 'HUD'}</Badge><Badge color={listing.review_status === 'pending' ? 'amber' : listing.review_status === 'approved' ? 'green' : 'red'}>{listing.review_status}</Badge><span className="text-xs text-neutral-400">{formatDate(listing.created_at)}</span></div><h3 className="mt-2 font-display text-lg font-bold text-neutral-900">{listing.title}</h3><p className="text-xs text-neutral-500">By {listing.seller_name} · {listing.category} · {listing.listing_type === 'account' ? `Level ${String(listing.details.level ?? '?')} · ${String(listing.details.region ?? 'Region not set')}` : String(listing.details.device_compatibility ?? 'Device not set')}</p></div><div className="text-right font-display text-lg font-bold text-orange-700">{Number(listing.asking_price) > 0 ? `₦${Number(listing.asking_price).toLocaleString()}` : 'Free'}</div></div>
            <p className="mt-3 whitespace-pre-wrap text-sm text-neutral-700">{listing.description}</p>
            {listing.listing_type === 'account' && <div className="mt-3 grid gap-2 text-xs text-neutral-600 sm:grid-cols-2"><p><strong>Items:</strong> {String(listing.details.items || 'Not provided')}</p><p><strong>Characters:</strong> {String(listing.details.characters || 'Not provided')}</p><p><strong>Other details:</strong> {String(listing.details.details || 'Not provided')}</p><p><strong>Seller contact:</strong> {String(listing.details.contact || 'Not provided')}</p></div>}
            {listing.listing_type === 'hud' && <p className="mt-3 text-xs text-neutral-600"><strong>Device:</strong> {String(listing.details.device_compatibility || 'Not provided')} · {listing.details.free === true ? 'Free' : 'Paid'}</p>}
            <div className="mt-3 rounded-lg bg-neutral-50 p-3 text-xs text-neutral-600"><div className="flex items-center gap-1.5 font-semibold text-neutral-700"><ShieldCheck size={14} />AI review: {listing.ai_review_decision}</div><p className="mt-1">{listing.review_reason || 'No review note.'}</p><p className="mt-2 text-[10px] text-neutral-400">Automated moderation is not legal certification. Review game/platform transfer rules independently.</p></div>
            <div className="mt-4 flex flex-wrap gap-2">{listing.review_status === 'pending' && <><Button size="sm" onClick={() => void review(listing, 'approved')} loading={busyId === listing.listing_id}><Check size={14} />Approve</Button><Button size="sm" variant="danger" onClick={() => void review(listing, 'rejected')} loading={busyId === listing.listing_id}>Reject</Button></>}<Button size="sm" variant="outline" onClick={() => void remove(listing)} loading={busyId === listing.listing_id}><EyeOff size={14} />Remove from marketplace</Button><Button size="sm" variant="danger" onClick={() => void deleteListing(listing)} loading={busyId === listing.listing_id}>Delete permanently</Button></div>
          </div>
        </div>
      </Card>;
    })}</div>}
  </div>;
}