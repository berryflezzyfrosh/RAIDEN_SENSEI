import { Home, Crosshair, Gift, Smartphone, Info } from 'lucide-react';

const ITEMS = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'generator', label: 'Sensei', icon: Crosshair },
  { id: 'redeem', label: 'Codes', icon: Gift },
  { id: 'device', label: 'Device', icon: Smartphone },
  { id: 'about', label: 'About', icon: Info },
];

export function BottomNav({ current, onNavigate }: { current: string; onNavigate: (id: string) => void }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#1e1e30] bg-[#0d0d18]/95 backdrop-blur-lg md:hidden" aria-label="Mobile navigation">
      <div className="flex items-stretch justify-around px-2 py-1.5">
        {ITEMS.map((item) => {
          const active = current === item.id;
          return (
            <button key={item.id} onClick={() => onNavigate(item.id)} className="flex flex-1 flex-col items-center gap-1 rounded-lg py-2 transition-colors" aria-label={item.label} aria-current={active ? 'page' : undefined}>
              <item.icon size={20} className={active ? 'text-[#00e5ff]' : 'text-[#5a5a70]'} style={active ? { filter: 'drop-shadow(0 0 4px rgba(0,229,255,0.4))' } : undefined} />
              <span className={`font-display text-[10px] font-semibold tracking-wide ${active ? 'text-[#00e5ff]' : 'text-[#5a5a70]'}`}>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
