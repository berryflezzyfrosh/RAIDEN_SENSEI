import { Smartphone, Crosshair, Gift, Image, Shield, Cpu } from 'lucide-react';

const FEATURES = [
  {
    icon: Smartphone,
    title: 'Device Analysis',
    description: 'Automatic detection of your device specs, screen, touch capability, and performance tier.',
    color: '#00e5ff',
  },
  {
    icon: Crosshair,
    title: 'Custom Sensei',
    description: 'A real sensitivity engine that calculates values from your hardware and play style.',
    color: '#ff2e7e',
  },
  {
    icon: Gift,
    title: 'Redeem Codes',
    description: 'Curated Free Fire redeem codes from legitimate public sources with status tracking.',
    color: '#00ff9d',
  },
  {
    icon: Image,
    title: 'Image Generator',
    description: 'Download a professional esports-style PNG of your generated sensitivity configuration.',
    color: '#ffb800',
  },
  {
    icon: Cpu,
    title: 'Mobile Optimized',
    description: 'Built mobile-first with responsive layouts for Android, iPhone, tablet, and desktop.',
    color: '#ff3b5c',
  },
  {
    icon: Shield,
    title: 'Security First',
    description: 'No tracking, no exposed keys, no fake data. Your settings stay in your browser.',
    color: '#00e5ff',
  },
];

export function Features() {
  return (
    <section className="relative px-4 py-20">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 text-center">
          <h2 className="section-title">Features</h2>
          <p className="mt-3 font-body text-sm text-raiden-muted sm:text-base">
            Everything you need to optimize your Free Fire experience
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              className="card-glow glass group rounded-2xl p-6 transition-all duration-300 hover:border-opacity-50"
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <div
                className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110"
                style={{
                  background: `${f.color}15`,
                  border: `1px solid ${f.color}40`,
                }}
              >
                <f.icon size={24} style={{ color: f.color }} />
              </div>
              <h3 className="mb-2 font-display text-lg font-bold tracking-wide text-raiden-text">
                {f.title}
              </h3>
              <p className="font-body text-sm leading-relaxed text-raiden-muted">
                {f.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
