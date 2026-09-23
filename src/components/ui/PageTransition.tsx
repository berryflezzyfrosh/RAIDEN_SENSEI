import type { ReactNode } from 'react';

export function PageTransition({ children, show }: { children: ReactNode; show: boolean }) {
  return <div className={`transition-all duration-300 ease-out ${show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>{children}</div>;
}
