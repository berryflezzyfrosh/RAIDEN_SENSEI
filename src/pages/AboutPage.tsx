import { Shield, Cpu, Code, AlertTriangle } from 'lucide-react';
import { Logo } from '@/components/Logo';

export function AboutPage() {
  return (
    <div className="animate-fade-in px-4 py-8 pb-20 md:py-12">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8"><h2 className="section-title">About</h2></div>

        <div className="rounded-2xl border border-raiden-border bg-raiden-surface p-6 sm:p-8">
          <div className="mb-5 flex justify-center"><Logo size={56} /></div>
          <h3 className="mb-4 text-center font-display text-lg font-bold tracking-wider text-raiden-neon">RΛIDΞN 亗 SENSEI</h3>
          <p className="mb-4 font-body text-sm leading-relaxed text-raiden-text">
            RΛIDΞN 亗 Sensei is a community gaming utility designed to help Free Fire players create personalized sensitivity configurations. The engine analyzes your device characteristics — screen size, pixel density, touch capability, CPU, memory, and more — then calculates optimized recommendations for general sensitivity, scopes, fire button size, DPI, and FPS settings.
          </p>
          <p className="mb-5 font-body text-sm leading-relaxed text-raiden-muted">
            Unlike generic sensitivity copiers, RΛIDΞN 亗 Sensei uses a real mathematical engine that normalizes multiple device factors to produce device-specific values. Two different devices will receive different recommendations, and the same device will produce consistent results with the same inputs.
          </p>

          <div className="mb-5 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            <Highlight icon={Shield} title="Privacy First" desc="No tracking, no accounts, no data collection" color="#00e5ff" />
            <Highlight icon={Cpu} title="Real Engine" desc="Mathematical calculation, not random numbers" color="#ff2e7e" />
            <Highlight icon={Code} title="Open Source" desc="Deployable to GitHub Pages, fully transparent" color="#00ff9d" />
          </div>

          <div className="rounded-lg border border-raiden-gold/30 bg-raiden-gold/5 p-4">
            <div className="mb-2 flex items-center gap-2"><AlertTriangle size={14} className="text-raiden-gold" /><span className="font-display text-xs font-bold tracking-wider text-raiden-gold">DISCLAIMER</span></div>
            <p className="font-body text-xs leading-relaxed text-raiden-muted">
              RΛIDΞN 亗 Sensei is not affiliated with or endorsed by Garena or Free Fire. All generated settings are recommendations based on available device information. No sensitivity setting guarantees headshots. Free Fire and all related trademarks belong to Garena. Always adjust settings to your personal preference.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Highlight({ icon: Icon, title, desc, color }: { icon: typeof Shield; title: string; desc: string; color: string }) {
  return (
    <div className="rounded-lg border border-raiden-border bg-raiden-card p-3.5 text-center">
      <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: `${color}12`, border: `1px solid ${color}30` }}>
        <Icon size={16} style={{ color }} />
      </div>
      <p className="font-display text-xs font-bold tracking-wider text-raiden-text">{title}</p>
      <p className="mt-1 font-body text-[11px] text-raiden-muted">{desc}</p>
    </div>
  );
}
