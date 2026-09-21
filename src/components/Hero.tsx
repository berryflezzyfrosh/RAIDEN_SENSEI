import { Zap, Crosshair, Activity, Monitor, Smartphone } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Logo } from './Logo';

export function Hero({ onGenerate, onRedeem }: { onGenerate: () => void; onRedeem: () => void }) {
  return (
    <section id="home" className="relative min-h-screen flex items-center justify-center px-4 pt-16">
      <div className="mx-auto max-w-5xl text-center">
        {/* Logo */}
        <div className="mb-6 flex justify-center animate-float">
          <div className="relative">
            <div className="absolute inset-0 animate-pulse-glow">
              <Logo size={100} />
            </div>
            <Logo size={100} />
          </div>
        </div>

        {/* Title */}
        <h1 className="font-display text-4xl font-black tracking-wider text-raiden-neon neon-text sm:text-5xl md:text-6xl lg:text-7xl">
          RΛIDΞN <span className="text-raiden-magenta">亗</span> SENSEI
        </h1>

        {/* Tagline */}
        <p className="mt-4 font-display text-lg font-semibold tracking-wide text-raiden-text sm:text-xl md:text-2xl">
          Your Device. Your Sensitivity. Your Game.
        </p>

        {/* Subtitle */}
        <p className="mx-auto mt-6 max-w-2xl font-body text-sm text-raiden-muted sm:text-base md:text-lg">
          A device-specific Free Fire sensitivity engine that analyzes your hardware and generates
          optimized recommendations for camera, scopes, drag control, and fire configuration.
        </p>

        {/* Buttons */}
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <button onClick={onGenerate} className="btn-primary w-full sm:w-auto">
            <Zap size={18} />
            Generate My Sensei
          </button>
          <button onClick={onRedeem} className="btn-secondary w-full sm:w-auto">
            <Crosshair size={18} />
            Check Redeem Codes
          </button>
        </div>

        {/* Animated parameter display */}
        <div className="mx-auto mt-16 max-w-3xl">
          <AnimatedParams />
        </div>
      </div>
    </section>
  );
}

function AnimatedParams() {
  const params = [
    { label: 'GENERAL', icon: Activity, color: '#00e5ff' },
    { label: 'RED DOT', icon: Crosshair, color: '#ff2e7e' },
    { label: '2X SCOPE', icon: Zap, color: '#00ff9d' },
    { label: '4X SCOPE', icon: Monitor, color: '#ffb800' },
    { label: 'SNIPER', icon: Smartphone, color: '#ff3b5c' },
  ];

  const [values, setValues] = useState<number[]>([0, 0, 0, 0, 0]);

  useEffect(() => {
    const targets = [92, 88, 82, 74, 55];
    let frame = 0;
    const interval = setInterval(() => {
      frame++;
      setValues(targets.map((t, i) => {
        const progress = Math.min(frame / (30 + i * 5), 1);
        return Math.round(t * progress);
      }));
      if (frame > 50) clearInterval(interval);
    }, 40);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="glass rounded-2xl p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <span className="font-display text-xs font-bold tracking-widest text-raiden-muted">
          LIVE PARAMETER SIMULATION
        </span>
        <span className="flex items-center gap-1.5 font-mono text-xs text-raiden-green">
          <span className="h-2 w-2 animate-pulse rounded-full bg-raiden-green" />
          CALCULATING
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {params.map((p, i) => (
          <div key={p.label} className="rounded-xl border border-raiden-border bg-raiden-card p-3">
            <div className="mb-2 flex items-center gap-2">
              <p.icon size={14} style={{ color: p.color }} />
              <span className="font-display text-[10px] font-bold tracking-wider text-raiden-muted">
                {p.label}
              </span>
            </div>
            <div className="font-mono text-2xl font-bold" style={{ color: p.color }}>
              {values[i]}
            </div>
            <div className="mt-2 stat-bar h-1">
              <div
                className="stat-bar-fill"
                style={{ width: `${values[i]}%`, background: p.color }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
