import { useEffect, useState } from 'react';
import { Gift, RefreshCw, AlertCircle, CheckCircle, XCircle, Clock, ExternalLink } from 'lucide-react';
import type { RedeemCode } from '@/lib/types';
import { fetchRedeemCodes } from '@/lib/redeemCodes';

export function RedeemCodes() {
  const [codes, setCodes] = useState<RedeemCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [lastUpdated, setLastUpdated] = useState('');

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await fetchRedeemCodes();
      setCodes(data);
      if (data.length > 0) {
        const latest = data.reduce((max, c) => {
          const t = new Date(c.retrievedAt).getTime();
          return t > max ? t : max;
        }, 0);
        setLastUpdated(new Date(latest).toLocaleString());
      }
    } catch {
      setError(true);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const statusConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
    new: { label: 'NEW', color: '#00ff9d', icon: CheckCircle },
    active: { label: 'ACTIVE', color: '#00e5ff', icon: CheckCircle },
    expired: { label: 'EXPIRED', color: '#ff3b5c', icon: XCircle },
    unknown: { label: 'UNKNOWN', color: '#ffb800', icon: Clock },
  };

  return (
    <section id="redeem" className="relative px-4 py-20">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 text-center">
          <h2 className="section-title">Free Fire Redeem Codes</h2>
          <p className="mt-3 font-body text-sm text-raiden-muted sm:text-base">
            Codes aggregated from legitimate public sources — never fabricated
          </p>
        </div>

        {/* Info banner */}
        <div className="glass mb-6 flex items-start gap-3 rounded-xl p-4">
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0 text-raiden-gold" />
          <p className="font-body text-xs leading-relaxed text-raiden-muted">
            Status is based on the latest available source data, not real-time verification against
            Garena's servers. Codes may expire without notice. Redeem at{' '}
            <a
              href="https://reward.ff.garena.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-raiden-neon hover:underline"
            >
              reward.ff.garena.com
            </a>
            .
          </p>
        </div>

        {/* Refresh */}
        <div className="mb-4 flex items-center justify-between">
          {lastUpdated && (
            <span className="font-mono text-xs text-raiden-muted">
              Updated: {lastUpdated}
            </span>
          )}
          <button
            onClick={load}
            disabled={loading}
            className="btn-ghost ml-auto"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <RefreshCw size={28} className="animate-spin text-raiden-neon" />
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="glass rounded-xl p-6 text-center">
            <AlertCircle size={32} className="mx-auto mb-3 text-raiden-red" />
            <p className="font-body text-sm text-raiden-text">
              Redeem-code information is temporarily unavailable. Please try again later.
            </p>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && codes.length === 0 && (
          <div className="glass rounded-xl p-6 text-center">
            <Gift size={32} className="mx-auto mb-3 text-raiden-muted" />
            <p className="font-body text-sm text-raiden-muted">
              No redeem codes are currently available. Codes are updated automatically when new
              legitimate codes appear in approved sources.
            </p>
          </div>
        )}

        {/* Codes list */}
        {!loading && !error && codes.length > 0 && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {codes.map((code) => {
              const status = statusConfig[code.status] || statusConfig.unknown;
              return (
                <div
                  key={code.code}
                  className="glass card-glow rounded-xl p-4"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-display text-[10px] font-bold tracking-wider"
                      style={{
                        background: `${status.color}15`,
                        color: status.color,
                        border: `1px solid ${status.color}40`,
                      }}
                    >
                      <status.icon size={10} />
                      {status.label}
                    </span>
                    <Gift size={16} className="text-raiden-muted" />
                  </div>
                  <p className="font-mono text-lg font-bold tracking-wider text-raiden-text">
                    {code.code}
                  </p>
                  <p className="mt-1 font-body text-xs text-raiden-muted">
                    {code.reward}
                  </p>
                  <div className="mt-3 flex items-center justify-between border-t border-raiden-border pt-2">
                    <span className="font-body text-[10px] text-raiden-muted">
                      Source: {code.source}
                    </span>
                    {code.sourceUrl && (
                      <a
                        href={code.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-raiden-neon hover:underline"
                      >
                        <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                  {code.expiresAt && (
                    <p className="mt-1 font-body text-[10px] text-raiden-muted">
                      Expires: {new Date(code.expiresAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
