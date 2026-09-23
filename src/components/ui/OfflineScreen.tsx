import { Logo } from '@/components/Logo';
import { RefreshCw, WifiOff } from 'lucide-react';

export function OfflineScreen({ onRetry, isRetrying }: { onRetry: () => void; isRetrying: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#07070d] px-4">
      <Logo size={80} />
      <h1 className="mt-6 mb-8 font-display text-xl font-bold tracking-wider text-[#00e5ff]">RΛIDΞN 亗 SENSEI</h1>
      <div className="relative mb-4 flex h-16 w-16 items-center justify-center">
        <div className={`absolute inset-0 rounded-full border-2 ${isRetrying ? 'animate-spin border-[#00e5ff] border-t-transparent' : 'border-[#ff3b5c]/30'}`} />
        <WifiOff size={24} className={isRetrying ? 'text-[#00e5ff]' : 'text-[#ff3b5c]'} />
      </div>
      <h2 className="mb-2 font-display text-lg font-bold tracking-wide text-[#e8e8f0]">Connection Required</h2>
      <p className="max-w-xs text-center font-body text-sm leading-relaxed text-[#8a8aa0]">
        You're currently offline. Connect to the internet to access the RΛIDΞN Sensei engine and redeem code services.
      </p>
      <button onClick={onRetry} disabled={isRetrying} className="mt-6 inline-flex items-center gap-2 rounded-lg border border-[#00e5ff]/40 bg-[#00e5ff]/10 px-6 py-3 font-display text-sm font-semibold uppercase tracking-wider text-[#00e5ff] transition-all hover:bg-[#00e5ff]/20 disabled:opacity-50">
        <RefreshCw size={16} className={isRetrying ? 'animate-spin' : ''} />
        {isRetrying ? 'Checking...' : 'Retry Connection'}
      </button>
      <p className="mt-8 font-body text-xs text-[#5a5a70]">RΛIDΞN 亗 Sensei requires an internet connection for data-dependent features.</p>
    </div>
  );
}
