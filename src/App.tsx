import { useEffect, useRef, useState } from 'react';
import { LoadingScreen } from '@/components/LoadingScreen';
import { Navbar } from '@/components/Navbar';
import { ParticleBackground } from '@/components/ParticleBackground';
import { Hero } from '@/components/Hero';
import { Features } from '@/components/Features';
import { DeviceAnalysis } from '@/components/DeviceAnalysis';
import { Generator } from '@/components/Generator';
import { ResultCard } from '@/components/ResultCard';
import { RedeemCodes } from '@/components/RedeemCodes';
import { About } from '@/components/About';
import { Footer } from '@/components/Footer';
import type { SensitivityResult } from '@/lib/types';
import { loadResult } from '@/lib/storage';

type View = 'home' | 'generator' | 'result' | 'redeem' | 'device' | 'about';

const VISITED_KEY = 'raiden-sensei-visited';
const ACCESS_KEY = 'raiden-sensei-access';
const ACCESS_CODE = '200909';
const DEVICE_VIEWS_KEY = 'raiden-sensei-device-views';

function App() {
  const [loading, setLoading] = useState(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem(VISITED_KEY) !== 'true';
  });
  const [isUnlocked, setIsUnlocked] = useState(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem(ACCESS_KEY) === ACCESS_CODE;
  });
  const [entryCode, setEntryCode] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [copyMessage, setCopyMessage] = useState('');
  const [deviceViews, setDeviceViews] = useState<number>(() => {
    if (typeof window === 'undefined') return 0;
    const saved = Number(localStorage.getItem(DEVICE_VIEWS_KEY) ?? '0');
    return Number.isFinite(saved) && saved >= 0 ? saved : 0;
  });
  const [view, setView] = useState<View>('home');
  const [result, setResult] = useState<SensitivityResult | null>(loadResult());
  const hasTrackedView = useRef(false);

  useEffect(() => {
    if (hasTrackedView.current || typeof window === 'undefined') return;
    hasTrackedView.current = true;

    const syncViewCount = async () => {
      try {
        const response = await fetch('https://api.countapi.xyz/hit/raiden-sensei-website/visits');
        if (!response.ok) throw new Error('Failed to increment remote counter');

        const data = await response.json();
        const count = Number(data?.value ?? 0);

        localStorage.setItem(DEVICE_VIEWS_KEY, String(count));
        setDeviceViews(count);
      } catch {
        const saved = Number(localStorage.getItem(DEVICE_VIEWS_KEY) ?? '0');
        const currentCount = Number.isFinite(saved) && saved >= 0 ? saved : 0;
        localStorage.setItem(DEVICE_VIEWS_KEY, String(currentCount));
        setDeviceViews(currentCount);
      }
    };

    syncViewCount();
  }, []);

  const handleNavigate = (id: string) => {
    if (id === 'home') setView('home');
    else if (id === 'generator') setView(result ? 'result' : 'generator');
    else if (id === 'redeem') setView('redeem');
    else if (id === 'device') setView('device');
    else if (id === 'about') setView('about');
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 50);
  };

  const handleGenerate = () => {
    setResult(null);
    setView('generator');
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 50);
  };

  const handleResult = (res: SensitivityResult) => {
    setResult(res);
    setView('result');
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 50);
  };

  const handleRegenerate = () => {
    setView('generator');
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 50);
  };

  const handleLoadingComplete = () => {
    localStorage.setItem(VISITED_KEY, 'true');
    setLoading(false);
  };

  const handleAccessSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (entryCode.trim() === ACCESS_CODE) {
      localStorage.setItem(ACCESS_KEY, ACCESS_CODE);
      setIsUnlocked(true);
      setErrorMessage('');
      return;
    }

    setErrorMessage('Invalid code. Please try again.');
  };

  const handleCopy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopyMessage(`${value} copied`);
      setTimeout(() => setCopyMessage(''), 1400);
    } catch {
      setCopyMessage('Copy failed');
      setTimeout(() => setCopyMessage(''), 1400);
    }
  };

  if (loading) {
    return <LoadingScreen onComplete={handleLoadingComplete} />;
  }

  if (!isUnlocked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050816] px-4 py-8 text-white">
        <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0b1220]/90 p-6 shadow-2xl shadow-cyan-500/10 backdrop-blur-sm">
          <div className="mb-6 text-center">
            <p className="font-mono text-[10px] uppercase tracking-[0.45em] text-cyan-300">Access Required</p>
            <h1 className="mt-4 font-display text-3xl font-bold text-white">Enter code</h1>
            <div className="mt-3 inline-flex items-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 font-mono text-xs text-cyan-200 shadow-lg shadow-cyan-500/10">
              <span className="flex h-6 w-6 items-center justify-center rounded-md border border-cyan-400/50 bg-slate-950/80" aria-hidden="true">
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </span>
              <span>Views: {deviceViews}</span>
            </div>
          </div>

          <div className="mb-6 rounded-xl border border-cyan-500/30 bg-slate-950/60 p-4 text-sm text-slate-200">
            <p className="mb-3 font-display text-base font-semibold text-cyan-300">Payment Details</p>
            <p className="mb-3 rounded-lg border border-cyan-400/30 bg-cyan-500/10 px-3 py-2 font-mono text-xs text-cyan-200">
              Amount: ₦2,000
            </p>

            <div className="space-y-2 font-mono text-[11px]">
              <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-slate-900/70 px-3 py-2">
                <span className="min-w-0 flex-1 text-slate-400">Account Number:</span>
                <div className="flex items-center gap-2">
                  <span className="text-right text-white">8033240323</span>
                  <button
                    type="button"
                    onClick={() => handleCopy('8033240323')}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-cyan-400/40 bg-cyan-500/10 text-cyan-300 transition hover:bg-cyan-500/20"
                    aria-label="Copy account number"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect x="9" y="9" width="11" height="11" rx="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-slate-900/70 px-3 py-2">
                <span className="text-slate-400">Bank:</span>
                <span className="text-white">Opay</span>
              </div>

              <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-slate-900/70 px-3 py-2">
                <span className="text-slate-400">Account Name:</span>
                <span className="text-white">Courage Barminas</span>
              </div>

              <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-slate-900/70 px-3 py-2">
                <span className="text-slate-400">Contact:</span>
                <span className="text-white">09027033883</span>
              </div>
            </div>
          </div>

          {copyMessage && (
            <p className="mb-4 text-center text-sm text-green-400">{copyMessage}</p>
          )}

          <form onSubmit={handleAccessSubmit} className="space-y-4">
            <input
              type="text"
              value={entryCode}
              onChange={(event) => setEntryCode(event.target.value)}
              placeholder="Enter access code"
              className="w-full rounded-xl border border-cyan-500/40 bg-slate-950/80 px-4 py-3 text-base text-white outline-none ring-0 placeholder:text-slate-400 focus:border-cyan-400"
            />

            {errorMessage && (
              <p className="text-sm text-red-400">{errorMessage}</p>
            )}

            <button
              type="submit"
              className="w-full rounded-xl bg-cyan-500 px-4 py-3 font-semibold text-slate-950 transition hover:bg-cyan-400"
            >
              Unlock Website
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      <ParticleBackground />
      <div className="relative z-10">
        <Navbar onNavigate={handleNavigate} />

        <div className="fixed bottom-4 left-1/2 z-30 -translate-x-1/2 inline-flex items-center gap-2 rounded-xl border border-cyan-500/30 bg-slate-950/80 px-3 py-2 text-sm text-cyan-200 shadow-lg shadow-cyan-500/10">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-cyan-400/50 bg-slate-900/80" aria-hidden="true">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </span>
          <span>{deviceViews}</span>
        </div>

        <main>
          {view === 'home' && (
            <>
              <Hero onGenerate={handleGenerate} onRedeem={() => handleNavigate('redeem')} />
              <Features />
              <DeviceAnalysis onGenerate={handleGenerate} />
              <RedeemCodes />
              <About />
            </>
          )}

          {view === 'generator' && (
            <Generator onComplete={handleResult} />
          )}

          {view === 'result' && result && (
            <ResultCard result={result} onRegenerate={handleRegenerate} />
          )}

          {view === 'redeem' && <RedeemCodes />}
          {view === 'device' && <DeviceAnalysis onGenerate={handleGenerate} />}
          {view === 'about' && <About />}
        </main>

        <Footer onNavigate={handleNavigate} />
      </div>
    </div>
  );
}

export default App;
