import { useEffect, useState } from 'react';
import { Gift, RefreshCw, AlertCircle, CheckCircle, XCircle, Clock, ExternalLink, Globe } from 'lucide-react';
import { fetchRedeemCodes } from '@/lib/redeemCodes';
import { CodeSkeleton } from '@/components/ui/Skeleton';
import type { RedeemCode } from '@/lib/types';

interface Props {
  onToast: (type: 'success' | 'error' | 'info', msg: string) => void;
}

export function RedeemPage({ onToast }: Props) {
  const [codes, setCodes] = useState<RedeemCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [fromCache, setFromCache] = useState(false);
  const [lastUpdated, setLastUpdated] = useState('');

  const load = async () => {
    setLoading(true);
    setError(false);
    const result = await fetchRedeemCodes();
    setCodes(result.codes);
    setFromCache(result.fromCache);
    setError(result.error);
    if (result.lastUpdated) setLastUpdated(new Date(result.lastUpdated).toLocaleString());
    setLoading(false);
    if (result.error) onToast('error', 'Failed to load redeem codes');
    else if (result.fromCache) onToast('info', 'Showing cached codes — offline mode');
  };

  useEffect(() => { load(); }, []);

  const statusConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
    new: { label: 'NEW', color: '#00ff9d', icon: CheckCircle },
    active: { label: 'ACTIVE', color: '#00e5ff', icon: CheckCircle },
    expired: { label: 'EXPIRED', color: '#ff3b5c', icon: XCircle },
    unknown: { label: 'UNKNOWN', color: '#ffb800', icon: Clock },
  };

  return (
    <div className="animate-fade-in px-4 py-8 pb-20 md:py-12">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <h2 className="section-title">Free Fire Redeem Codes</h2>
          <p className="section-subtitle">Codes aggregated from legitimate public sources — never fabricated</p>
        </div>

        {/* Info banner */}
        <div className="mb-4 flex items-start gap-3 rounded-lg border border-raiden-border bg-raiden-surface p-3.5">
          <AlertCircle size={14} className="mt-0.5 flex-shrink-0 text-raiden-gold" />
          <p className="font-body text-xs leading-relaxed text-raiden-muted">
            Status is based on the latest available source data, not real-time verification against Garena's servers. Codes may expire without notice. Redeem at{' '}
            <a href="https://reward.ff.garena.com" target="_blank" rel="noopener noreferrer" className="text-raiden-neon hover:underline">reward.ff.garena.com</a>.
          </p>
        </div>

        {/* Status bar */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {lastUpdated && <span className="font-mono text-[10px] text-raiden-muted">Updated: {lastUpdated}</span>}
            {fromCache && <span className="badge" style={{ background: 'rgba(255,184,0,0.1)', color: '#ffb800', border: '1px solid rgba(255,184,0,0.3)' }}>CACHED</span>}
          </div>
          <button onClick={load} disabled={loading} className="btn-ghost"><RefreshCw size={14} className={loading ? 'animate-spin' : ''} />Refresh</button>
        </div>

        {/* Loading */}
        {loading && <CodeSkeleton />}

        {/* Error */}
        {error && !loading && (
          <div className="rounded-xl border border-raiden-border bg-raiden-surface p-6 text-center">
            <AlertCircle size={28} className="mx-auto mb-3 text-raiden-red" />
            <p className="font-body text-sm text-raiden-text">Redeem-code information is temporarily unavailable. Please try again later.</p>
            <button onClick={load} className="btn-ghost mt-4">Retry</button>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && codes.length === 0 && (
          <div className="rounded-xl border border-raiden-border bg-raiden-surface p-6 text-center">
            <Gift size={28} className="mx-auto mb-3 text-raiden-muted" />
            <p className="font-body text-sm text-raiden-muted">No redeem codes are currently available. Codes are updated automatically when new legitimate codes appear in approved sources.</p>
          </div>
        )}

        {/* Codes */}
        {!loading && !error && codes.length > 0 && (
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {codes.map((code) => {
              const status = statusConfig[code.status] || statusConfig.unknown;
              return (
                <div key={code.code} className="rounded-xl border border-raiden-border bg-raiden-surface p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="badge" style={{ background: `${status.color}12`, color: status.color, border: `1px solid ${status.color}40` }}>
                      <status.icon size={10} />{status.label}
                    </span>
                    {code.region && <span className="flex items-center gap-1 font-body text-[10px] text-raiden-muted"><Globe size={10} />{code.region}</span>}
                  </div>
                  <p className="font-mono text-base font-bold tracking-wider text-raiden-text">{code.code}</p>
                  <p className="mt-1 font-body text-xs text-raiden-muted">{code.reward}</p>
                  <div className="mt-2.5 flex items-center justify-between border-t border-raiden-border pt-2">
                    <span className="font-body text-[10px] text-raiden-muted">Source: {code.source}</span>
                    {code.sourceUrl && <a href={code.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-raiden-neon hover:underline"><ExternalLink size={11} /></a>}
                  </div>
                  {code.expiresAt && <p className="mt-1 font-body text-[10px] text-raiden-muted">Expires: {new Date(code.expiresAt).toLocaleDateString()}</p>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
