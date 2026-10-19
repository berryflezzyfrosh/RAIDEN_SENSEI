import { Crosshair, Cpu, Crown, Zap, Shield, Smartphone, ChevronRight, Activity, Target } from 'lucide-react';
import { Button } from '@/components/ui';
import { navigate } from '@/hooks/useRouter';
import { useAuth } from '@/hooks/useAuth';

export function HomePage() {
  const { isPremium } = useAuth();
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden hero-grid">
        <div className="absolute inset-0 bg-gradient-to-b from-orange-50/50 via-white to-white" />
        <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-gradient-to-br from-orange-300/30 to-amber-200/10 blur-3xl" />
        <div className="absolute top-40 -left-24 h-72 w-72 rounded-full bg-gradient-to-br from-orange-200/30 to-transparent blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 pt-16 pb-20 sm:pt-24 sm:pb-28">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="animate-fade-up">
              <span className="inline-flex items-center gap-2 rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700 ring-1 ring-orange-200">
                <Zap size={12} /> AI-Powered Sensitivity Engine
              </span>
              <h1 className="mt-5 font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-neutral-900 leading-[1.05]">
                AI Free Fire<br />
                <span className="text-gradient-orange">Sensitivity Generator</span>
              </h1>
              <p className="mt-5 text-lg sm:text-xl text-neutral-600 font-medium">
                Your Device. Your Sensitivity. Your Game.
              </p>
              <p className="mt-3 text-sm text-neutral-500 max-w-lg">
                Device-aware sensitivity tuning, real device analysis, and a premium esports-grade
                engine — built for serious Free Fire players.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Button size="lg" onClick={() => navigate('sensitivity')}>
                  <Crosshair size={18} /> Generate Sensitivity
                </Button>
                <Button size="lg" variant="outline" onClick={() => navigate('device')}>
                  <Smartphone size={18} /> Analyze My Device
                </Button>
                {!isPremium && (
                  <Button size="lg" variant="premium" onClick={() => navigate('premium')}>
                    <Crown size={18} /> Unlock Premium
                  </Button>
                )}
              </div>

              <div className="mt-8 flex items-center gap-6 text-xs text-neutral-500">
                <div className="flex items-center gap-1.5"><Shield size={14} className="text-emerald-600" /> Secure auth</div>
                <div className="flex items-center gap-1.5"><Cpu size={14} className="text-orange-600" /> Device-aware</div>
                <div className="flex items-center gap-1.5"><Target size={14} className="text-blue-600" /> Preset tuned</div>
              </div>
            </div>

            {/* Visual */}
            <div className="relative animate-fade-up" style={{ animationDelay: '120ms' }}>
              <HeroVisual />
            </div>
          </div>
        </div>
      </section>

      {/* Feature grid */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 py-16 sm:py-20">
        <div className="text-center mb-12">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-neutral-900">
            Everything you need to <span className="text-gradient-orange">level up</span>
          </h2>
          <p className="mt-3 text-neutral-500">From free device analysis to a premium pro-tuning engine.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <FeatureCard
            icon={<Crosshair />}
            title="Sensitivity Generator"
            desc="Device + play-style tuned sensitivity with confidence scoring and instant copy."
            onClick={() => navigate('sensitivity')}
          />
          <FeatureCard
            icon={<Cpu />}
            title="Device Analysis"
            desc="Real browser-accessible device fingerprinting — screen, OS, touch, CPU, memory."
            onClick={() => navigate('device')}
          />
          <FeatureCard
            icon={<Activity />}
            title="Face & Camera Analysis"
            desc="Camera-based face alignment and framing checks with privacy-first processing."
            onClick={() => navigate('face')}
          />
          <FeatureCard
            icon={<Crown />}
            title="Premium Engine"
            desc="Pro presets, drag-shot tuning, sniper optimization, and a poster image generator."
            onClick={() => navigate('premium')}
            premium
          />
          <FeatureCard
            icon={<Shield />}
            title="Secure & Verified"
            desc="Premium access is server-verified. No frontend tricks. Receipt review by admin."
            onClick={() => navigate('premium')}
          />
          <FeatureCard
            icon={<Target />}
            title="Save & Share"
            desc="Save profiles, download PNG sensitivity cards, and share via Web Share API."
            onClick={() => navigate('sensitivity')}
          />
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 pb-20">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 p-8 sm:p-14 text-center">
          <div className="absolute -top-16 -right-16 h-64 w-64 rounded-full bg-orange-500/20 blur-3xl" />
          <div className="absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl" />
          <div className="relative">
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-white">
              Ready to find <span className="text-gradient-orange">your perfect sensitivity?</span>
            </h2>
            <p className="mt-3 text-neutral-300 max-w-xl mx-auto">
              Free to start. Upgrade when you're ready for the pro engine.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Button size="lg" onClick={() => navigate('sensitivity')}>
                <Crosshair size={18} /> Generate Now
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate('signup')} className="bg-white">
                Create Free Account <ChevronRight size={16} />
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({
  icon, title, desc, onClick, premium,
}: {
  icon: React.ReactNode; title: string; desc: string; onClick: () => void; premium?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="text-left bg-white rounded-2xl border border-neutral-200/80 p-6 card-hover group relative overflow-hidden"
    >
      {premium && (
        <span className="absolute top-4 right-4 text-xs font-bold text-amber-600">PRO</span>
      )}
      <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50 text-orange-600 group-hover:bg-orange-500 group-hover:text-white transition-colors">
        {icon}
      </div>
      <h3 className="mt-4 font-display font-bold text-neutral-900 text-lg">{title}</h3>
      <p className="mt-1.5 text-sm text-neutral-500">{desc}</p>
      <div className="mt-3 text-sm font-semibold text-orange-600 inline-flex items-center gap-1">
        Open <ChevronRight size={14} className="group-hover:translate-x-0.5 transition" />
      </div>
    </button>
  );
}

function HeroVisual() {
  const rows = [
    { label: 'General', value: 95, color: 'bg-orange-500' },
    { label: 'Red Dot', value: 90, color: 'bg-orange-400' },
    { label: '2x Scope', value: 85, color: 'bg-amber-400' },
    { label: '4x Scope', value: 75, color: 'bg-amber-300' },
    { label: 'Sniper', value: 55, color: 'bg-orange-300' },
    { label: 'Free Look', value: 80, color: 'bg-amber-400' },
  ];
  return (
    <div className="relative mx-auto max-w-md">
      <div className="absolute inset-0 -m-6 rounded-3xl bg-gradient-to-br from-red-500/30 to-orange-200/20 blur-2xl" />
      <div className="relative overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-2xl shadow-red-900/20 animate-float">
        <img
          src="/images/102bfd31ff9706eb9b66b53cfe0b5413~tplv-tiktokx-cropcenter_1080_1080.jpeg"
          alt="RΛIDΞN 亗 esports artwork"
          className="h-64 w-full object-cover object-center"
        />
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/60 to-transparent" />
        <div className="absolute left-5 top-5 text-white">
          <div className="font-display text-sm font-extrabold tracking-[0.18em]">RΛIDΞN 亗</div>
          <div className="mt-1 text-[10px] uppercase tracking-[0.24em] text-red-200">Esports sensitivity lab</div>
        </div>
        <div className="relative p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 text-white">
              <Crosshair size={20} />
            </span>
            <div>
              <div className="font-display font-bold text-neutral-900 text-sm">Sensitivity Card</div>
              <div className="text-[11px] text-neutral-500">Balanced preset</div>
            </div>
          </div>
          <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
            92% conf.
          </span>
        </div>
        <div className="space-y-3">
          {rows.map((r) => (
            <div key={r.label}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-medium text-neutral-700">{r.label}</span>
                <span className="font-bold text-neutral-900">{r.value}</span>
              </div>
              <div className="h-2 rounded-full bg-neutral-100 overflow-hidden">
                <div className={`h-full rounded-full ${r.color}`} style={{ width: `${r.value / 2}%` }} />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-5 flex items-center justify-between text-xs">
          <span className="text-neutral-400">Mobile • Android • Chrome</span>
          <span className="text-orange-600 font-semibold">RΛIDΞN 亗</span>
        </div>
        </div>
      </div>
    </div>
  );
}
