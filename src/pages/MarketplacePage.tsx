import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  AlertTriangle, Check, ChevronDown, CircleDollarSign, Download, Filter,
  ImagePlus, LoaderCircle, Pencil, Plus, Search, ShieldCheck, Store, Trash2, X,
} from 'lucide-react';
import { Badge, Button, Card } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useAppConfig } from '@/hooks/useAppConfig';
import { supabase } from '@/lib/supabase';

type Section = 'accounts' | 'huds';
type ListingStatus = 'active' | 'sold' | 'hidden';

interface AccountListing {
  id: string;
  seller_id: string;
  seller_name: string;
  seller_contact: string;
  title: string;
  description: string;
  asking_price: number;
  account_level: number;
  region_server: string;
  category: string;
  available_items: string;
  character_info: string;
  account_details: string;
  image_paths: string[];
  status: ListingStatus;
  created_at: string;
}

interface HudListing {
  id: string;
  seller_id: string;
  seller_name: string;
  title: string;
  description: string;
  asking_price: number;
  is_free: boolean;
  device_compatibility: string;
  hud_file_path: string;
  preview_path: string;
  category: string;
  status: 'active' | 'hidden';
  created_at: string;
}

const ACCOUNT_CATEGORIES = ['general', 'ranked', 'rare skins', 'veteran', 'collector'];
const HUD_CATEGORIES = ['general', 'two-finger', 'three-finger', 'four-finger', 'claw'];
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const fieldClass = 'w-full rounded-lg border border-neutral-300 bg-white px-3.5 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 focus:outline-none';
const areaClass = `${fieldClass} min-h-24 resize-y`;

function publicImage(path: string) {
  return supabase.storage.from('marketplace').getPublicUrl(path).data.publicUrl;
}

function safeExtension(file: File) {
  return file.name.split('.').pop()?.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8) || 'bin';
}

async function uploadAsset(bucket: string, userId: string, file: File, contentType = file.type || 'text/plain') {
  const path = `${userId}/${crypto.randomUUID()}.${safeExtension(file)}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    upsert: false,
    contentType,
  });
  if (error) throw error;
  return path;
}

export function MarketplacePage() {
  const { user } = useAuth();
  const { config } = useAppConfig();
  const [section, setSection] = useState<Section>('accounts');
  const [accounts, setAccounts] = useState<AccountListing[]>([]);
  const [huds, setHuds] = useState<HudListing[]>([]);
  const [purchasedHudIds, setPurchasedHudIds] = useState<string[]>([]);
  const [pendingHudIds, setPendingHudIds] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [mineOnly, setMineOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<AccountListing | null>(null);
  const [editingHud, setEditingHud] = useState<HudListing | null>(null);
  const [buyingHud, setBuyingHud] = useState<HudListing | null>(null);

  const loadListings = useCallback(async () => {
    setLoading(true);
    setError('');
    const [accountResult, hudResult] = await Promise.all([
      supabase.from('free_fire_account_listings').select('*').order('created_at', { ascending: false }),
      supabase.from('free_fire_hud_listings').select('*').order('created_at', { ascending: false }),
    ]);
    if (accountResult.error || hudResult.error) {
      setError(accountResult.error?.message ?? hudResult.error?.message ?? 'Unable to load marketplace listings.');
    } else {
      setAccounts((accountResult.data ?? []) as AccountListing[]);
      setHuds((hudResult.data ?? []) as HudListing[]);
    }

    if (user) {
      const [purchaseResult, paymentResult] = await Promise.all([
        supabase.from('hud_purchases').select('hud_listing_id'),
        supabase.from('payments').select('hud_listing_id, status').eq('purpose', 'hud'),
      ]);
      setPurchasedHudIds((purchaseResult.data ?? []).map((row) => row.hud_listing_id));
      setPendingHudIds((paymentResult.data ?? [])
        .filter((row) => row.status === 'pending' || row.status === 'under_review')
        .map((row) => row.hud_listing_id)
        .filter((id): id is string => Boolean(id)));
    } else {
      setPurchasedHudIds([]);
      setPendingHudIds([]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { void loadListings(); }, [loadListings]);

  const filteredAccounts = useMemo(() => accounts.filter((listing) => {
    const text = [listing.title, listing.description, listing.region_server, listing.available_items,
      listing.character_info, listing.account_details, listing.seller_name].join(' ').toLowerCase();
    return (!mineOnly || listing.seller_id === user?.id)
      && (category === 'all' || listing.category === category)
      && text.includes(query.trim().toLowerCase());
  }), [accounts, category, mineOnly, query, user?.id]);

  const filteredHuds = useMemo(() => huds.filter((listing) => {
    const text = [listing.title, listing.description, listing.device_compatibility,
      listing.category, listing.seller_name].join(' ').toLowerCase();
    return (!mineOnly || listing.seller_id === user?.id)
      && (category === 'all' || listing.category === category)
      && text.includes(query.trim().toLowerCase());
  }), [category, huds, mineOnly, query, user?.id]);

  const closeForm = () => {
    setFormOpen(false);
    setEditingAccount(null);
    setEditingHud(null);
  };

  const onSaved = async () => {
    closeForm();
    setNotice('Listing saved.');
    await loadListings();
  };

  const changeStatus = async (kind: Section, id: string, status: ListingStatus | 'hidden') => {
    const table = kind === 'accounts' ? 'free_fire_account_listings' : 'free_fire_hud_listings';
    const { error: updateError } = await supabase.from(table).update({ status }).eq('id', id).eq('seller_id', user?.id);
    if (updateError) setError(updateError.message);
    else await loadListings();
  };

  const deleteListing = async (kind: Section, id: string) => {
    if (!user || !window.confirm('Delete this listing? This cannot be undone.')) return;
    const table = kind === 'accounts' ? 'free_fire_account_listings' : 'free_fire_hud_listings';
    const { error: deleteError } = await supabase.from(table).delete().eq('id', id).eq('seller_id', user.id);
    if (deleteError) setError(deleteError.message);
    else {
      setNotice('Listing deleted.');
      await loadListings();
    }
  };

  const categories = section === 'accounts' ? ACCOUNT_CATEGORIES : HUD_CATEGORIES;
  const entries = section === 'accounts' ? filteredAccounts.length : filteredHuds.length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between animate-fade-up">
        <div>
          <Badge color="orange"><Store size={12} /> Community marketplace</Badge>
          <h1 className="mt-3 font-display text-3xl font-bold text-neutral-900">Free Fire Marketplace</h1>
          <p className="mt-1 text-sm text-neutral-500">Browse player listings and HUD setups shared by the community.</p>
        </div>
        <Button onClick={() => { if (!user) { setError('Sign in to create a listing.'); return; } setFormOpen(true); }}>
          <Plus size={17} /> Create listing
        </Button>
      </header>

      {notice && <div className="mb-4 flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"><span>{notice}</span><button onClick={() => setNotice('')} aria-label="Dismiss"><X size={16} /></button></div>}
      {error && <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><AlertTriangle size={16} className="mt-0.5 shrink-0" />{error}<button className="ml-auto" onClick={() => setError('')} aria-label="Dismiss"><X size={16} /></button></div>}

      <div className="mb-5 flex items-center justify-between gap-3 border-b border-neutral-200">
        <div className="flex gap-1" role="tablist" aria-label="Marketplace category">
          {([
            { id: 'accounts', label: 'Free Fire accounts' },
            { id: 'huds', label: 'HUD layouts' },
          ] as { id: Section; label: string }[]).map((tab) => (
            <button key={tab.id} role="tab" aria-selected={section === tab.id} onClick={() => { setSection(tab.id); setCategory('all'); setFormOpen(false); }}
              className={`border-b-2 px-3 py-3 text-sm font-semibold transition ${section === tab.id ? 'border-orange-500 text-orange-700' : 'border-transparent text-neutral-500 hover:text-neutral-800'}`}>
              {tab.label}
            </button>
          ))}
        </div>
        {user && <label className="flex shrink-0 items-center gap-2 pb-2 text-xs font-medium text-neutral-600"><input type="checkbox" checked={mineOnly} onChange={(event) => setMineOnly(event.target.checked)} className="accent-orange-600" />My listings</label>}
      </div>

      {section === 'accounts' && <div className="mb-5 flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><AlertTriangle size={18} className="mt-0.5 shrink-0" /><p><strong>Account transfer warning:</strong> Account sales and transfers may violate Garena / Free Fire terms or current regional rules. Review the latest official rules before listing or buying. Transactions are between users; never share passwords or verification codes in a listing.</p></div>}

      <div className="mb-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px]">
        <label className="relative block"><Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" /><input className={`${fieldClass} pl-9`} value={query} onChange={(event) => setQuery(event.target.value)} placeholder={section === 'accounts' ? 'Search titles, items, characters, regions...' : 'Search HUDs, devices, layouts...'} /></label>
        <label className="relative block"><Filter size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" /><select className={`${fieldClass} appearance-none pl-9 pr-9 capitalize`} value={category} onChange={(event) => setCategory(event.target.value)}><option value="all">All categories</option>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select><ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400" /></label>
      </div>

      {formOpen && user && (
        <div className="mb-6">
          {section === 'accounts' && <AccountListingForm key={editingAccount?.id ?? 'new-account'} userId={user.id} listing={editingAccount} onSaved={onSaved} onCancel={closeForm} />}
          {section === 'huds' && <HudListingForm key={editingHud?.id ?? 'new-hud'} userId={user.id} listing={editingHud} onSaved={onSaved} onCancel={closeForm} />}
        </div>
      )}

      {loading ? <div className="py-16 text-center text-neutral-500"><LoaderCircle className="mx-auto animate-spin" /><p className="mt-2 text-sm">Loading listings...</p></div> : entries === 0 ? (
        <Card className="p-10 text-center"><Store size={30} className="mx-auto text-neutral-300" /><h2 className="mt-3 font-display font-bold text-neutral-800">No listings found</h2><p className="mt-1 text-sm text-neutral-500">Try another search or create the first listing in this category.</p></Card>
      ) : section === 'accounts' ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredAccounts.map((listing) => <AccountListingCard key={listing.id} listing={listing} isOwner={listing.seller_id === user?.id} onEdit={() => { setEditingAccount(listing); setEditingHud(null); setFormOpen(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }} onDelete={() => deleteListing('accounts', listing.id)} onStatus={(status) => changeStatus('accounts', listing.id, status)} />)}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredHuds.map((listing) => <HudListingCard key={listing.id} listing={listing} isOwner={listing.seller_id === user?.id} isPurchased={purchasedHudIds.includes(listing.id)} isPending={pendingHudIds.includes(listing.id)} onBuy={() => setBuyingHud(listing)} onEdit={() => { setEditingHud(listing); setEditingAccount(null); setFormOpen(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }} onDelete={() => deleteListing('huds', listing.id)} onStatus={(status) => changeStatus('huds', listing.id, status)} onDownload={() => downloadHudFile(listing.hud_file_path, setError)} />)}
        </div>
      )}

      {buyingHud && user && <HudPurchaseDialog listing={buyingHud} userId={user.id} config={config} onClose={() => setBuyingHud(null)} onSubmitted={async () => { setBuyingHud(null); setNotice('Payment submitted. HUD access will unlock after verification.'); await loadListings(); }} />}
    </div>
  );
}

function AccountListingForm({ userId, listing, onSaved, onCancel }: { userId: string; listing: AccountListing | null; onSaved: () => void; onCancel: () => void }) {
  const [title, setTitle] = useState(listing?.title ?? '');
  const [description, setDescription] = useState(listing?.description ?? '');
  const [price, setPrice] = useState(listing ? String(listing.asking_price) : '');
  const [level, setLevel] = useState(listing ? String(listing.account_level) : '');
  const [region, setRegion] = useState(listing?.region_server ?? '');
  const [category, setCategory] = useState(listing?.category ?? 'general');
  const [items, setItems] = useState(listing?.available_items ?? '');
  const [characters, setCharacters] = useState(listing?.character_info ?? '');
  const [details, setDetails] = useState(listing?.account_details ?? '');
  const [contact, setContact] = useState(listing?.seller_contact ?? '');
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    if ((!listing && !files.length) || files.length + (listing?.image_paths.length ?? 0) > 5) {
      setError('Add at least one screenshot and use no more than five images.');
      return;
    }
    if (files.some((file) => !IMAGE_TYPES.includes(file.type) || file.size > 10 * 1024 * 1024)) {
      setError('Images must be JPG, PNG, or WEBP and no larger than 10MB each.');
      return;
    }
    setSaving(true);
    const uploaded: string[] = [];
    try {
      for (const file of files) uploaded.push(await uploadAsset('marketplace', userId, file));
      const payload = {
        seller_id: userId, title: title.trim(), description: description.trim(),
        asking_price: Number(price), account_level: Number(level), region_server: region.trim(),
        category, available_items: items.trim(), character_info: characters.trim(),
        account_details: details.trim(), seller_contact: contact.trim(),
        image_paths: [...(listing?.image_paths ?? []), ...uploaded],
      };
      const result = listing
        ? await supabase.from('free_fire_account_listings').update(payload).eq('id', listing.id).eq('seller_id', userId)
        : await supabase.from('free_fire_account_listings').insert(payload);
      if (result.error) throw result.error;
      onSaved();
    } catch (err) {
      if (uploaded.length) await supabase.storage.from('marketplace').remove(uploaded);
      setError((err as Error).message || 'Could not save listing.');
    } finally {
      setSaving(false);
    }
  };

  return <Card className="p-5 sm:p-6"><form onSubmit={submit}>
    <FormHeading title={listing ? 'Edit account listing' : 'List a Free Fire account'} onCancel={onCancel} />
    <div className="mt-4 grid gap-4 sm:grid-cols-2">
      <Field label="Account title" value={title} onChange={setTitle} required minLength={4} maxLength={100} placeholder="e.g. Level 72 ranked account" />
      <Field label="Asking price (NGN)" value={price} onChange={setPrice} type="number" required min="1" placeholder="25000" />
      <Field label="Account level" value={level} onChange={setLevel} type="number" required min="1" max="100" placeholder="72" />
      <Field label="Region / server" value={region} onChange={setRegion} required placeholder="e.g. Middle East" />
      <SelectField label="Category" value={category} options={ACCOUNT_CATEGORIES} onChange={setCategory} />
      <Field label="Seller contact (optional)" value={contact} onChange={setContact} placeholder="Public contact handle" />
      <TextAreaField label="Description" value={description} onChange={setDescription} required minLength={20} maxLength={5000} placeholder="Describe the account and sale terms." className="sm:col-span-2" />
      <TextAreaField label="Available items / skins" value={items} onChange={setItems} placeholder="Notable skins, bundles, pets, emotes..." />
      <TextAreaField label="Character information" value={characters} onChange={setCharacters} placeholder="Unlocked characters and levels..." />
      <TextAreaField label="Other account details" value={details} onChange={setDetails} placeholder="Rank, linked platform, included extras..." className="sm:col-span-2" />
      <FileField label={`Screenshots (JPG, PNG, WEBP; up to 5 total${listing ? `, ${listing.image_paths.length} already attached` : ''})`} accept="image/jpeg,image/png,image/webp" multiple onChange={(value) => setFiles(value)} />
    </div>
    {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
    <div className="mt-5 flex flex-wrap gap-2"><Button type="submit" loading={saving}><Check size={16} />{listing ? 'Save changes' : 'Publish listing'}</Button><Button variant="ghost" onClick={onCancel}>Cancel</Button></div>
  </form></Card>;
}

function HudListingForm({ userId, listing, onSaved, onCancel }: { userId: string; listing: HudListing | null; onSaved: () => void; onCancel: () => void }) {
  const [title, setTitle] = useState(listing?.title ?? '');
  const [description, setDescription] = useState(listing?.description ?? '');
  const [category, setCategory] = useState(listing?.category ?? 'general');
  const [compatibility, setCompatibility] = useState(listing?.device_compatibility ?? '');
  const [isFree, setIsFree] = useState(listing?.is_free ?? true);
  const [price, setPrice] = useState(listing ? String(listing.asking_price) : '');
  const [hudFile, setHudFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    if ((!listing && (!hudFile || !preview)) || (hudFile && (!['json', 'txt', 'cfg'].includes(safeExtension(hudFile).toLowerCase()) || hudFile.size > 5 * 1024 * 1024))) {
      setError('Attach a HUD configuration (.json, .txt, or .cfg, max 5MB) and a preview image.');
      return;
    }
    if (preview && (!IMAGE_TYPES.includes(preview.type) || preview.size > 10 * 1024 * 1024)) {
      setError('Preview must be JPG, PNG, or WEBP and no larger than 10MB.');
      return;
    }
    setSaving(true);
    const uploadedFiles: string[] = [];
    const uploadedPreviews: string[] = [];
    try {
      const hudMime = hudFile && safeExtension(hudFile).toLowerCase() === 'json' ? 'application/json' : 'text/plain';
      const hudPath = hudFile ? await uploadAsset('hud-files', userId, hudFile, hudMime) : listing?.hud_file_path;
      if (hudFile && hudPath) uploadedFiles.push(hudPath);
      const previewPath = preview ? await uploadAsset('marketplace', userId, preview) : listing?.preview_path;
      if (preview && previewPath) uploadedPreviews.push(previewPath);
      const payload = {
        seller_id: userId, title: title.trim(), description: description.trim(), category,
        device_compatibility: compatibility.trim(), is_free: isFree,
        asking_price: isFree ? 0 : Number(price), hud_file_path: hudPath, preview_path: previewPath,
      };
      const result = listing
        ? await supabase.from('free_fire_hud_listings').update(payload).eq('id', listing.id).eq('seller_id', userId)
        : await supabase.from('free_fire_hud_listings').insert(payload);
      if (result.error) throw result.error;
      onSaved();
    } catch (err) {
      if (uploadedFiles.length) await supabase.storage.from('hud-files').remove(uploadedFiles);
      if (uploadedPreviews.length) await supabase.storage.from('marketplace').remove(uploadedPreviews);
      setError((err as Error).message || 'Could not save HUD listing.');
    } finally {
      setSaving(false);
    }
  };

  return <Card className="p-5 sm:p-6"><form onSubmit={submit}>
    <FormHeading title={listing ? 'Edit HUD listing' : 'Share a HUD layout'} onCancel={onCancel} />
    <div className="mt-4 grid gap-4 sm:grid-cols-2">
      <Field label="HUD name" value={title} onChange={setTitle} required minLength={4} maxLength={100} placeholder="e.g. Four-finger ranked HUD" />
      <SelectField label="Layout category" value={category} options={HUD_CATEGORIES} onChange={setCategory} />
      <TextAreaField label="Description" value={description} onChange={setDescription} required minLength={20} maxLength={5000} placeholder="Explain the layout and intended play style." className="sm:col-span-2" />
      <Field label="Device compatibility" value={compatibility} onChange={setCompatibility} placeholder="Android / iOS, screen size or model" />
      <div className="grid grid-cols-[auto_1fr] items-end gap-3"><label className="flex h-[42px] items-center gap-2 text-sm text-neutral-700"><input type="checkbox" checked={isFree} onChange={(event) => setIsFree(event.target.checked)} className="accent-orange-600" />Free</label>{!isFree && <Field label="Price (NGN)" value={price} onChange={setPrice} type="number" required min="1" placeholder="1500" />}</div>
      <FileField label={`HUD configuration${listing ? ' (leave empty to keep current file)' : ''}`} accept=".json,.txt,.cfg,application/json,text/plain" onChange={(value) => setHudFile(value[0] ?? null)} />
      <FileField label={`Preview image${listing ? ' (leave empty to keep current image)' : ''}`} accept="image/jpeg,image/png,image/webp" onChange={(value) => setPreview(value[0] ?? null)} />
    </div>
    {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
    <div className="mt-5 flex flex-wrap gap-2"><Button type="submit" loading={saving}><Check size={16} />{listing ? 'Save changes' : 'Publish HUD'}</Button><Button variant="ghost" onClick={onCancel}>Cancel</Button></div>
  </form></Card>;
}

function AccountListingCard({ listing, isOwner, onEdit, onDelete, onStatus }: { listing: AccountListing; isOwner: boolean; onEdit: () => void; onDelete: () => void; onStatus: (status: ListingStatus) => void }) {
  const [imageIndex, setImageIndex] = useState(0);
  const image = listing.image_paths[imageIndex];
  return <Card className="overflow-hidden">
    {image ? <div className="relative aspect-[16/10] bg-neutral-100"><img src={publicImage(image)} alt={`${listing.title} screenshot`} className="h-full w-full object-cover" loading="lazy" />{listing.image_paths.length > 1 && <div className="absolute inset-x-2 bottom-2 flex justify-between"><button onClick={() => setImageIndex((imageIndex + listing.image_paths.length - 1) % listing.image_paths.length)} className="rounded-full bg-black/60 p-2 text-white" aria-label="Previous screenshot"><ChevronDown className="rotate-90" size={16} /></button><span className="rounded-full bg-black/60 px-2 py-1 text-xs text-white">{imageIndex + 1}/{listing.image_paths.length}</span><button onClick={() => setImageIndex((imageIndex + 1) % listing.image_paths.length)} className="rounded-full bg-black/60 p-2 text-white" aria-label="Next screenshot"><ChevronDown className="-rotate-90" size={16} /></button></div>}</div> : <div className="flex aspect-[16/10] items-center justify-center bg-neutral-100 text-neutral-400"><ImagePlus size={30} /></div>}
    <div className="p-4">
      <div className="flex items-start justify-between gap-2"><div><h2 className="font-display text-lg font-bold text-neutral-900">{listing.title}</h2><p className="mt-1 text-xs text-neutral-500">Level {listing.account_level} · {listing.region_server}</p></div><Badge color={listing.status === 'active' ? 'green' : 'neutral'}>{listing.status}</Badge></div>
      <p className="mt-3 line-clamp-3 text-sm text-neutral-600">{listing.description}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">{listing.category && <Badge color="neutral">{listing.category}</Badge>}{listing.available_items && <Badge color="orange">Items listed</Badge>}</div>
      {(listing.available_items || listing.character_info || listing.account_details) && <details className="mt-3 border-t border-neutral-100 pt-3"><summary className="cursor-pointer text-sm font-semibold text-orange-700">Account details</summary><div className="mt-2 space-y-2 text-sm text-neutral-600">{listing.available_items && <p><strong className="text-neutral-800">Items / skins:</strong> {listing.available_items}</p>}{listing.character_info && <p><strong className="text-neutral-800">Characters:</strong> {listing.character_info}</p>}{listing.account_details && <p><strong className="text-neutral-800">Other details:</strong> {listing.account_details}</p>}</div></details>}
      <div className="mt-4 flex items-center justify-between border-t border-neutral-100 pt-3"><div className="font-display text-xl font-bold text-orange-700">₦{Number(listing.asking_price).toLocaleString()}</div><div className="text-right text-xs text-neutral-500">Seller<br /><span className="font-medium text-neutral-700">{listing.seller_name}</span></div></div>
      {listing.seller_contact && <p className="mt-2 break-all text-xs text-neutral-500">Contact: {listing.seller_contact}</p>}
      {isOwner && <OwnerActions status={listing.status} onEdit={onEdit} onDelete={onDelete} onStatus={onStatus} />}
    </div>
  </Card>;
}

function HudListingCard({ listing, isOwner, isPurchased, isPending, onBuy, onEdit, onDelete, onStatus, onDownload }: { listing: HudListing; isOwner: boolean; isPurchased: boolean; isPending: boolean; onBuy: () => void; onEdit: () => void; onDelete: () => void; onStatus: (status: ListingStatus) => void; onDownload: () => void }) {
  return <Card className="overflow-hidden">
    <img src={publicImage(listing.preview_path)} alt={`${listing.title} HUD preview`} className="aspect-[16/10] w-full bg-neutral-100 object-cover" loading="lazy" />
    <div className="p-4">
      <div className="flex items-start justify-between gap-2"><div><h2 className="font-display text-lg font-bold text-neutral-900">{listing.title}</h2><p className="mt-1 text-xs text-neutral-500">{listing.category} · {listing.device_compatibility || 'Device details not provided'}</p></div><Badge color={listing.status === 'active' ? 'green' : 'neutral'}>{listing.status}</Badge></div>
      <p className="mt-3 line-clamp-3 text-sm text-neutral-600">{listing.description}</p>
      <div className="mt-4 flex items-center justify-between border-t border-neutral-100 pt-3"><div className="font-display text-xl font-bold text-orange-700">{listing.is_free ? 'Free' : `₦${Number(listing.asking_price).toLocaleString()}`}</div><div className="text-right text-xs text-neutral-500">Shared by<br /><span className="font-medium text-neutral-700">{listing.seller_name}</span></div></div>
      {!isOwner && (listing.status === 'active' || isPurchased) && (listing.is_free || isPurchased ? <Button full className="mt-4" onClick={onDownload}><Download size={16} />Download HUD</Button> : isPending ? <Button full className="mt-4" variant="outline" disabled><ShieldCheck size={16} />Payment under review</Button> : <Button full className="mt-4" onClick={onBuy}><CircleDollarSign size={16} />Purchase HUD</Button>)}
      {isOwner && <OwnerActions status={listing.status} onEdit={onEdit} onDelete={onDelete} onStatus={(status) => onStatus(status === 'sold' ? 'hidden' : status)} />}
    </div>
  </Card>;
}

function OwnerActions({ status, onEdit, onDelete, onStatus }: { status: ListingStatus; onEdit: () => void; onDelete: () => void; onStatus: (status: ListingStatus) => void }) {
  return <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-neutral-100 pt-3">
    <Button size="sm" variant="outline" onClick={onEdit}><Pencil size={14} />Edit</Button>
    <select aria-label="Listing visibility" className="rounded-lg border border-neutral-200 bg-white px-2.5 py-2 text-xs" value={status} onChange={(event) => onStatus(event.target.value as ListingStatus)}><option value="active">Active</option><option value="hidden">Hidden</option>{status === 'sold' && <option value="sold">Sold</option>}</select>
    <button onClick={onDelete} className="ml-auto rounded-lg p-2 text-neutral-500 hover:bg-red-50 hover:text-red-600" title="Delete listing" aria-label="Delete listing"><Trash2 size={16} /></button>
  </div>;
}

function HudPurchaseDialog({ listing, userId, config, onClose, onSubmitted }: { listing: HudListing; userId: string; config: { opay_bank: string; opay_account_name: string; opay_account_number: string }; onClose: () => void; onSubmitted: () => void }) {
  const [reference, setReference] = useState('');
  const [receipt, setReceipt] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    if (!receipt || receipt.size > 5 * 1024 * 1024 || !['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(receipt.type)) {
      setError('Upload a JPG, PNG, WEBP, or PDF receipt no larger than 5MB.');
      return;
    }
    if (reference.trim().length < 4) { setError('Enter a valid transaction reference.'); return; }
    setSubmitting(true);
    let paymentId: string | null = null;
    let receiptPath: string | null = null;
    try {
      const { data: payment, error: paymentError } = await supabase.from('payments').insert({
        amount: listing.asking_price, purpose: 'hud', hud_listing_id: listing.id,
        transaction_reference: reference.trim(),
      }).select('id').single();
      if (paymentError) throw paymentError;
      paymentId = payment.id;
      receiptPath = await uploadAsset('receipts', userId, receipt);
      const { error: receiptError } = await supabase.from('payment_receipts').insert({
        payment_id: paymentId, storage_path: receiptPath, file_name: receipt.name,
        file_size: receipt.size, mime_type: receipt.type, ocr_text: '', ocr_confidence: 0,
        fraud_risk_score: 0, fraud_flags: ['scan_pending'],
      });
      if (receiptError) throw receiptError;
      const { error: reviewError } = await supabase.functions.invoke('receipt-review', { body: { paymentId } });
      if (reviewError) throw reviewError;
      onSubmitted();
    } catch (err) {
      setError((err as Error).message || 'Purchase submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4" onClick={onClose}>
    <div className="my-6 w-full max-w-lg" onClick={(event) => event.stopPropagation()}><Card className="p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3"><div><Badge color="amber"><CircleDollarSign size={12} /> Secure purchase</Badge><h2 className="mt-3 font-display text-xl font-bold text-neutral-900">{listing.title}</h2><p className="mt-1 font-semibold text-orange-700">₦{Number(listing.asking_price).toLocaleString()}</p></div><button onClick={onClose} className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100" aria-label="Close"><X size={18} /></button></div>
      <form onSubmit={submit} className="mt-4">
        <div className="rounded-lg border border-orange-100 bg-orange-50 p-4 text-sm"><p className="font-semibold text-orange-900">Transfer to complete purchase</p><p className="mt-2 text-neutral-700">{config.opay_bank} · {config.opay_account_name}<br /><span className="font-mono">{config.opay_account_number}</span><br />Amount: <strong>₦{Number(listing.asking_price).toLocaleString()}</strong></p></div>
        <p className="mt-3 text-xs text-neutral-500">The HUD file unlocks only after an admin confirms the payment. The seller does not receive your receipt or payment credentials.</p>
        <div className="mt-4 space-y-3"><label className="block text-sm font-medium text-neutral-700">Transaction reference<input className={`${fieldClass} mt-1.5`} value={reference} onChange={(event) => setReference(event.target.value)} minLength={4} required /></label><label className="block text-sm font-medium text-neutral-700">Transfer receipt<input className={`${fieldClass} mt-1.5`} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(event) => setReceipt(event.target.files?.[0] ?? null)} required /></label></div>
        {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
        <div className="mt-5 flex gap-2"><Button type="submit" loading={submitting} full><ShieldCheck size={16} />Submit payment</Button><Button variant="ghost" onClick={onClose}>Cancel</Button></div>
      </form>
    </Card></div>
  </div>;
}

async function downloadHudFile(path: string, reportError: (message: string) => void) {
  const { data, error } = await supabase.storage.from('hud-files').createSignedUrl(path, 60);
  if (error || !data?.signedUrl) {
    reportError(error?.message ?? 'You do not have access to this HUD file yet.');
    return;
  }
  window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
}

function FormHeading({ title, onCancel }: { title: string; onCancel: () => void }) {
  return <div className="flex items-center justify-between gap-3"><h2 className="font-display text-lg font-bold text-neutral-900">{title}</h2><button type="button" onClick={onCancel} className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100" aria-label="Close form"><X size={18} /></button></div>;
}

function Field({ label, value, onChange, ...props }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean; minLength?: number; maxLength?: number; min?: string; max?: string; placeholder?: string }) {
  return <label className="block text-sm font-medium text-neutral-700">{label}<input className={`${fieldClass} mt-1.5`} value={value} onChange={(event) => onChange(event.target.value)} {...props} /></label>;
}

function TextAreaField({ label, value, onChange, className = '', ...props }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; minLength?: number; maxLength?: number; placeholder?: string; className?: string }) {
  return <label className={`block text-sm font-medium text-neutral-700 ${className}`}>{label}<textarea className={`${areaClass} mt-1.5`} value={value} onChange={(event) => onChange(event.target.value)} {...props} /></label>;
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return <label className="block text-sm font-medium text-neutral-700">{label}<select className={`${fieldClass} mt-1.5 capitalize`} value={value} onChange={(event) => onChange(event.target.value)}>{options.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>;
}

function FileField({ label, accept, multiple = false, onChange }: { label: string; accept: string; multiple?: boolean; onChange: (files: File[]) => void }) {
  return <label className="block text-sm font-medium text-neutral-700">{label}<input className={`${fieldClass} mt-1.5`} type="file" accept={accept} multiple={multiple} onChange={(event) => onChange(Array.from(event.target.files ?? []))} /></label>;
}