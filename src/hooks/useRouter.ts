import { useEffect, useState } from 'react';

export type Route =
  | { name: 'home' }
  | { name: 'sensitivity' }
  | { name: 'device' }
  | { name: 'face' }
  | { name: 'premium' }
  | { name: 'dashboard' }
  | { name: 'profile' }
  | { name: 'login' }
  | { name: 'signup' }
  | { name: 'admin' }
  | { name: 'admin-login' };

const ROUTE_NAMES = [
  'home', 'sensitivity', 'device', 'face', 'premium',
  'dashboard', 'profile', 'login', 'signup', 'admin', 'admin-login',
] as const;

function parseHash(): Route {
  const h = window.location.hash.replace(/^#\/?/, '').split('?')[0] || 'home';
  const name = ROUTE_NAMES.find((r) => r === h) ?? 'home';
  return { name } as Route;
}

export function navigate(name: Route['name']) {
  window.location.hash = `/${name}`;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

export function useRouter() {
  const [route, setRoute] = useState<Route>(parseHash());
  useEffect(() => {
    const onChange = () => setRoute(parseHash());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}
