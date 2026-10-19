import { Crosshair } from 'lucide-react';
import { navigate } from '@/hooks/useRouter';

export function Logo({ size = 36, withText = true }: { size?: number; withText?: boolean }) {
  return (
    <button
      onClick={() => navigate('home')}
      className="flex items-center gap-2 btn-press group"
      aria-label="RΛIDΞN 亗 home"
    >
      <span
        className="relative inline-flex items-center justify-center rounded-xl text-white shadow-md shadow-orange-500/30"
        style={{
          width: size,
          height: size,
          background: 'linear-gradient(135deg, #ff6a00 0%, #ff9a3a 100%)',
        }}
      >
        <Crosshair size={size * 0.6} strokeWidth={2.4} />
        <span className="absolute inset-0 rounded-xl ring-1 ring-white/30" />
      </span>
      {withText && (
        <span className="font-display font-extrabold tracking-tight text-neutral-900 text-lg leading-none">
          RΛIDΞN <span className="text-gradient-orange">亗</span>
        </span>
      )}
    </button>
  );
}
