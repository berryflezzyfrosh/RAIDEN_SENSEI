import { Trash2, Heart } from 'lucide-react';
import { Logo } from './Logo';
import { clearAllData, hasStoredData } from '@/lib/storage';
import { useState } from 'react';

interface Props {
  onNavigate: (id: string) => void;
}

export function Footer({ onNavigate }: Props) {
  const [dataCleared, setDataCleared] = useState(false);

  const handleClearData = () => {
    clearAllData();
    setDataCleared(true);
    setTimeout(() => setDataCleared(false), 2000);
  };

  const links = [
    { id: 'home', label: 'Home' },
    { id: 'generator', label: 'Sensei Generator' },
    { id: 'redeem', label: 'Redeem Codes' },
    { id: 'about', label: 'About' },
  ];

  return (
    <footer className="relative border-t border-raiden-border bg-raiden-surface/50 px-4 py-12">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="mb-3 flex items-center gap-2">
              <Logo size={36} />
              <span className="font-display text-sm font-bold tracking-wider text-raiden-neon neon-text">
                RΛIDΞN 亗 SENSEI
              </span>
            </div>
            <p className="mb-4 font-body text-sm text-raiden-muted">
              Your Device. Your Sensitivity. Your Game.
            </p>
            <p className="font-body text-xs text-raiden-muted">
              A community gaming utility for Free Fire sensitivity optimization.
              Not affiliated with Garena or Free Fire.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="mb-3 font-display text-xs font-bold tracking-widest text-raiden-neon">
              NAVIGATION
            </h4>
            <ul className="space-y-2">
              {links.map((link) => (
                <li key={link.id}>
                  <button
                    onClick={() => onNavigate(link.id)}
                    className="font-body text-sm text-raiden-muted transition-colors hover:text-raiden-neon"
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal + Data */}
          <div>
            <h4 className="mb-3 font-display text-xs font-bold tracking-widest text-raiden-neon">
              LEGAL
            </h4>
            <ul className="space-y-2">
              <li><span className="font-body text-sm text-raiden-muted">Privacy Policy</span></li>
              <li><span className="font-body text-sm text-raiden-muted">Terms of Use</span></li>
              <li>
                {hasStoredData() && (
                  <button
                    onClick={handleClearData}
                    className="flex items-center gap-1.5 font-body text-sm text-raiden-red transition-colors hover:text-raiden-magenta"
                  >
                    <Trash2 size={14} />
                    {dataCleared ? 'Data Cleared' : 'Clear My Data'}
                  </button>
                )}
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-raiden-border pt-6 sm:flex-row">
          <p className="font-body text-xs text-raiden-muted">
            © 2026 RΛIDΞN 亗 SENSEI · Not affiliated with Garena or Free Fire
          </p>
          <p className="flex items-center gap-1.5 font-body text-xs text-raiden-muted">
            Built with <Heart size={12} className="text-raiden-magenta" /> for the Free Fire community
          </p>
        </div>
      </div>
    </footer>
  );
}
