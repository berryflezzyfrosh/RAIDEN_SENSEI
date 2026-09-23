import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import { Logo } from './Logo';

const NAV_LINKS = [
  { id: 'home', label: 'HOME' },
  { id: 'generator', label: 'SENSEI' },
  { id: 'redeem', label: 'CODES' },
  { id: 'device', label: 'DEVICE' },
  { id: 'about', label: 'ABOUT' },
];

interface Props {
  onNavigate: (id: string) => void;
  currentView: string;
}

export function Navbar({ onNavigate, currentView }: Props) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const handleNav = (id: string) => {
    onNavigate(id);
    setOpen(false);
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
        scrolled ? 'border-b border-raiden-border bg-[#0d0d18]/95 backdrop-blur-lg shadow-lg shadow-black/50' : 'bg-transparent'
      }`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <button onClick={() => handleNav('home')} className="flex items-center gap-2" aria-label="Go to home">
            <Logo size={32} />
            <span className="font-display text-sm font-bold tracking-wider text-raiden-neon sm:text-base">RΛIDΞN 亗 SENSEI</span>
          </button>

          {/* Desktop nav */}
          <div className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map((link) => {
              const active = currentView === link.id || (link.id === 'generator' && currentView === 'result');
              return (
                <button
                  key={link.id}
                  onClick={() => handleNav(link.id)}
                  className={`rounded-md px-3 py-2 font-display text-xs font-semibold tracking-wider transition-colors ${
                    active ? 'text-raiden-neon' : 'text-raiden-muted hover:text-raiden-neon'
                  }`}
                  aria-current={active ? 'page' : undefined}
                >
                  {link.label}
                </button>
              );
            })}
          </div>

          {/* Mobile toggle */}
          <button onClick={() => setOpen(!open)} className="rounded-md p-2 text-raiden-neon md:hidden" aria-label="Toggle menu" aria-expanded={open}>
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="border-t border-raiden-border bg-[#0d0d18]/95 backdrop-blur-lg md:hidden">
          <div className="space-y-1 px-4 py-4">
            {NAV_LINKS.map((link) => {
              const active = currentView === link.id || (link.id === 'generator' && currentView === 'result');
              return (
                <button
                  key={link.id}
                  onClick={() => handleNav(link.id)}
                  className={`block w-full rounded-lg px-4 py-3 text-left font-display text-sm font-semibold tracking-wider transition-colors ${
                    active ? 'bg-raiden-neon/10 text-raiden-neon' : 'text-raiden-muted hover:bg-raiden-card hover:text-raiden-neon'
                  }`}
                  aria-current={active ? 'page' : undefined}
                >
                  {link.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </nav>
  );
}
