import { type ReactNode, useState } from 'react';
import { Menu, X, LogOut, LayoutDashboard, User as UserIcon, Shield } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { useAuth } from '@/hooks/useAuth';
import { navigate, type Route } from '@/hooks/useRouter';
import { Button } from '@/components/ui';
import { PremiumBadge } from '@/components/PremiumLock';

const NAV: { label: string; route: Route['name']; }[] = [
  { label: 'Home', route: 'home' },
  { label: 'Sensitivity', route: 'sensitivity' },
  { label: 'Device Analysis', route: 'device' },
  { label: 'Face Analysis', route: 'face' },
  { label: 'Premium', route: 'premium' },
];

const MOBILE_BOTTOM: { label: string; route: Route['name']; icon: typeof Menu }[] = [
  { label: 'Home', route: 'home', icon: Menu },
  { label: 'Sens', route: 'sensitivity', icon: Menu },
  { label: 'Device', route: 'device', icon: Menu },
  { label: 'Face', route: 'face', icon: Menu },
  { label: 'Premium', route: 'premium', icon: Menu },
];

export function Layout({
  children,
  current,
}: {
  children: ReactNode;
  current: Route['name'];
}) {
  const { user, profile, isAdmin, isPremium, signOut } = useAuth();
  const [open, setOpen] = useState(false);

  const isActive = (r: Route['name']) => current === r;

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-neutral-200/70">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex h-16 items-center justify-between">
            <Logo />

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-1">
              {NAV.map((item) => (
                <button
                  key={item.route}
                  onClick={() => navigate(item.route)}
                  className={`px-3.5 py-2 rounded-lg text-sm font-medium transition ${
                    isActive(item.route)
                      ? 'bg-orange-50 text-orange-700'
                      : 'text-neutral-700 hover:bg-neutral-100'
                  }`}
                >
                  {item.label}
                </button>
              ))}
              {user && (
                <button
                  onClick={() => navigate('dashboard')}
                  className={`px-3.5 py-2 rounded-lg text-sm font-medium transition ${
                    isActive('dashboard')
                      ? 'bg-orange-50 text-orange-700'
                      : 'text-neutral-700 hover:bg-neutral-100'
                  }`}
                >
                  Dashboard
                </button>
              )}
              {isAdmin && (
                <button
                  onClick={() => navigate('admin')}
                  className={`px-3.5 py-2 rounded-lg text-sm font-medium transition inline-flex items-center gap-1.5 ${
                    isActive('admin')
                      ? 'bg-neutral-900 text-white'
                      : 'text-neutral-700 hover:bg-neutral-100'
                  }`}
                >
                  <Shield size={14} /> Admin
                </button>
              )}
            </nav>

            {/* Right actions */}
            <div className="hidden md:flex items-center gap-2">
              {user ? (
                <>
                  {isPremium && <PremiumBadge />}
                  <button
                    onClick={() => navigate('profile')}
                    className="flex items-center gap-2 rounded-full border border-neutral-200 bg-white pl-1 pr-3 py-1 text-sm font-medium hover:border-orange-300 transition"
                  >
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-orange-100 text-orange-700 text-xs font-bold">
                      {(profile?.display_name || user.email || '?').slice(0, 1).toUpperCase()}
                    </span>
                    <span className="max-w-[120px] truncate">
                      {profile?.display_name || user.email}
                    </span>
                  </button>
                  <Button variant="ghost" size="sm" onClick={signOut}>
                    <LogOut size={16} /> Logout
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" size="sm" onClick={() => navigate('login')}>
                    Log in
                  </Button>
                  <Button size="sm" onClick={() => navigate('signup')}>
                    Sign up
                  </Button>
                </>
              )}
            </div>

            {/* Mobile menu button */}
            <button
              className="md:hidden inline-flex items-center justify-center rounded-lg p-2 text-neutral-700 hover:bg-neutral-100"
              onClick={() => setOpen((o) => !o)}
              aria-label="Menu"
            >
              {open ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile drawer */}
        {open && (
          <div className="md:hidden border-t border-neutral-200 bg-white animate-fade-in">
            <nav className="px-4 py-3 space-y-1">
              {NAV.map((item) => (
                <button
                  key={item.route}
                  onClick={() => {
                    navigate(item.route);
                    setOpen(false);
                  }}
                  className={`block w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium ${
                    isActive(item.route)
                      ? 'bg-orange-50 text-orange-700'
                      : 'text-neutral-800 hover:bg-neutral-100'
                  }`}
                >
                  {item.label}
                </button>
              ))}
              {user && (
                <button
                  onClick={() => { navigate('dashboard'); setOpen(false); }}
                  className="block w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium inline-flex items-center gap-2 text-neutral-800 hover:bg-neutral-100"
                >
                  <LayoutDashboard size={16} /> Dashboard
                </button>
              )}
              {user && (
                <button
                  onClick={() => { navigate('profile'); setOpen(false); }}
                  className="block w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium inline-flex items-center gap-2 text-neutral-800 hover:bg-neutral-100"
                >
                  <UserIcon size={16} /> Profile
                </button>
              )}
              {isAdmin && (
                <button
                  onClick={() => { navigate('admin'); setOpen(false); }}
                  className="block w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium inline-flex items-center gap-2 text-neutral-900 hover:bg-neutral-100"
                >
                  <Shield size={16} /> Admin Dashboard
                </button>
              )}
              <div className="pt-2 border-t border-neutral-100 mt-2 space-y-2">
                {user ? (
                  <>
                    {isPremium && <div className="px-3"><PremiumBadge /></div>}
                    <Button variant="outline" full size="sm" onClick={() => { signOut(); setOpen(false); }}>
                      <LogOut size={16} /> Logout
                    </Button>
                  </>
                ) : (
                  <div className="flex gap-2">
                    <Button variant="outline" full size="sm" onClick={() => { navigate('login'); setOpen(false); }}>
                      Log in
                    </Button>
                    <Button full size="sm" onClick={() => { navigate('signup'); setOpen(false); }}>
                      Sign up
                    </Button>
                  </div>
                )}
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* Main */}
      <main className="flex-1 pb-24 md:pb-0">{children}</main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 glass border-t border-neutral-200/70">
        <div className="grid grid-cols-5">
          {MOBILE_BOTTOM.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.route);
            return (
              <button
                key={item.route}
                onClick={() => navigate(item.route)}
                className={`flex flex-col items-center justify-center py-2.5 text-[11px] font-medium transition ${
                  active ? 'text-orange-600' : 'text-neutral-500'
                }`}
              >
                <Icon size={18} className={active ? 'text-orange-600' : 'text-neutral-400'} />
                {item.label}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <footer className="hidden md:block border-t border-neutral-200 bg-neutral-50">
        <div className="mx-auto max-w-7xl px-6 py-8 text-sm text-neutral-500">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Logo size={28} withText={false} />
              <span>RΛIDΞN 亗 — <em>Your Device. Your Sensitivity. Your Game.</em></span>
            </div>
            <div className="text-xs text-neutral-400">
              © {new Date().getFullYear()} RΛIDΞN 亗. Not affiliated with Garena.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
