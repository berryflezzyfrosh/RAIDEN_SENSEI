import { Zap, Crosshair, Activity, Monitor, Smartphone, ArrowRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Logo } from '@/components/Logo';

interface Props {
  onGenerate: () => void;
  onRedeem: () => void;
  onDevice: () => void;
}

export function HomePage({ onGenerate, onRedeem, onDevice }: Props) {
  return (
    <div className="animate-fade-in">
      <section className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 pt-16 pb-12">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-6 flex justify-center"><div className="animate-float"><Logo size={88} /></div></div>
          <h1 className="font-display text-3xl font-black tracking-wider text-raiden-text sm:text-4xl md:text-5xl lg:text-6xl">
            RΛIDΞN <span className="text-raiden-magenta">亗</span> SENSEI
          </h1>
          <p className="mt-3 font-display text-base font-semibold tracking-wide text-raiden-text sm:text-lg md:text-xl">Your Device. Your Sensitivity. Your Game.</p>
          <p className="mx-auto mt-5 max-w-xl font-body text-sm leading-relaxed text-raiden-muted sm:text-base">
            A device-specific Free Fire sensitivity engine that analyzes your hardware and generates optimized recommendations for camera, scopes, drag control, and fire configuration.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <button onClick={onGenerate} className="btn-primary w-full sm:w-auto"><Zap size={18} />Generate My Sensei</button>
            <button onClick={onRedeem} className="btn-secondary w-full sm:w-auto"><Crosshair size={18} />Check Redeem Codes</button>
          </div>
          <div className="mx-auto mt-12 max-w-2xl"><AnimatedParams /></div>
        </div>
      </section>

      <section className="px-4 py-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="section-title text-center">Features</h2>
          <p className="section-subtitle text-center">Everything you need to optimize your Free Fire experience</p>
          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard icon={Monitor} title="Device Analysis" desc="Automatic detection of screen, touch, CPU, and performance tier." color="#00e5ff" onClick={onDevice} />
            <FeatureCard icon={Crosshair} title="Custom Sensei" desc="A real engine that calculates values from hardware and play style." color="#ff2e7e" onClick={onGenerate} />
            <FeatureCard icon={Zap} title="Image Generator" desc="Download a shareable PNG of your sensitivity configuration." color="#00ff9d" onClick={onGenerate} />
            <FeatureCard icon={Smartphone} title="Mobile Optimized" desc="Built mobile-first for Android, iPhone, tablet, and desktop." color="#ffb800" onClick={onDevice} />
          </div>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, desc, color, onClick }: { icon: typeof Zap; title: string; desc: string; color: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="group rounded-xl border border-raiden-border bg-raiden-surface p-5 text-left transition-all duration-200 hover:border-[rgba(0,229,255,0.25)]">
      <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-110" style={{ background: `${color}12`, border: `1px solid ${color}30` }}>
        <Icon size={20} style={{ color }} />
      </div>
      <h3 className="mb-1 font-display text-sm font-bold tracking-wide text-raiden-text">{title}</h3>
      <p className="font-body text-xs leading-relaxed text-raiden-muted">{desc}</p>
      <div className="mt-3 flex items-center gap-1 font-display text-[10px] font-bold tracking-wider text-raiden-dim transition-colors group-hover:text-raiden-neon">OPEN <ArrowRight size={12} /></div>
    </button>
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
      setValues(targets.map((t, i) => Math.round(t * Math.min(frame / (25 + i * 4), 1))));
      if (frame > 45) clearInterval(interval);
    }, 40);
    return () => clearInterval(interval);
  }, []);
  return (
    <div className="rounded-xl border border-raiden-border bg-raiden-surface/60 p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="font-display text-[10px] font-bold tracking-widest text-raiden-muted">LIVE PARAMETER SIMULATION</span>
        <span className="flex items-center gap-1.5 font-mono text-[10px] text-raiden-green"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-raiden-green" />CALCULATING</span>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {params.map((p, i) => (
          <div key={p.label} className="rounded-lg border border-raiden-border bg-raiden-card p-2.5">
            <div className="mb-1.5 flex items-center gap-1.5"><p.icon size={12} style={{ color: p.color }} /><span className="font-display text-[9px] font-bold tracking-wider text-raiden-muted">{p.label}</span></div>
            <div className="font-mono text-xl font-bold" style={{ color: p.color }}>{values[i]}</div>
            <div className="mt-1.5 stat-bar h-1"><div className="stat-bar-fill" style={{ width: `${values[i]}%`, background: p.color }} /></div>
          </div>
        ))}
      </div>
    </div>
  );
}
