import { type ReactNode } from 'react';
import { Lock, Crown } from 'lucide-react';
import { Button } from '@/components/ui';
import { navigate } from '@/hooks/useRouter';

export function PremiumLock({
  title = 'Premium Feature',
  description = 'This feature is available with Premium access.',
  features,
}: {
  title?: string;
  description?: string;
  features?: string[];
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-8 text-center">
      <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-gradient-to-br from-amber-300/30 to-orange-400/20 blur-2xl" />
      <div className="relative">
        <div className="mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-600 text-white shadow-lg shadow-amber-500/30">
          <Lock size={28} strokeWidth={2.4} />
        </div>
        <h3 className="font-display text-xl font-bold text-neutral-900 flex items-center justify-center gap-2">
          <Lock size={18} className="text-amber-600" /> {title}
        </h3>
        <p className="mt-2 text-sm text-neutral-600 max-w-md mx-auto">{description}</p>
        {features && features.length > 0 && (
          <ul className="mt-5 mx-auto max-w-sm space-y-2 text-left">
            {features.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-neutral-700">
                <Crown size={16} className="mt-0.5 text-amber-600 flex-shrink-0" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button variant="premium" onClick={() => navigate('premium')}>
            <Crown size={16} /> Unlock Premium
          </Button>
          <Button variant="outline" onClick={() => navigate('premium')}>
            View Premium Features
          </Button>
        </div>
      </div>
    </div>
  );
}

export function PremiumBadge({ children }: { children?: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-orange-600 px-2.5 py-1 text-xs font-bold text-white shadow-sm">
      <Crown size={12} /> {children ?? 'PREMIUM'}
    </span>
  );
}
