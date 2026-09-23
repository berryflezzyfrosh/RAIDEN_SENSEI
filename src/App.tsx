import { useState, useCallback } from 'react';
import { Navbar } from '@/components/Navbar';
import { BottomNav } from '@/components/ui/BottomNav';
import { ToastContainer } from '@/components/ui/ToastContainer';
import { OfflineScreen } from '@/components/ui/OfflineScreen';
import { HomePage } from '@/pages/HomePage';
import { GeneratorPage } from '@/pages/GeneratorPage';
import { ResultPage } from '@/pages/ResultPage';
import { DevicePage } from '@/pages/DevicePage';
import { RedeemPage } from '@/pages/RedeemPage';
import { AboutPage } from '@/pages/AboutPage';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useDevice } from '@/hooks/useDevice';
import { useToast } from '@/hooks/useToast';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import type { SensitivityResult } from '@/lib/types';

type View = 'home' | 'generator' | 'result' | 'redeem' | 'device' | 'about';

function App() {
  const { status, isChecking, retry } = useOnlineStatus();
  const device = useDevice();
  const { toasts, success, error, info, dismiss } = useToast();
  const { result, inputs, saveResult, saveInputs, saveConfig } = useLocalStorage();
  const [view, setView] = useState<View>('home');

  const navigate = useCallback((id: string) => {
    if (id === 'generator') {
      setView(result ? 'result' : 'generator');
    } else {
      setView(id as View);
    }
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 50);
  }, [result]);

  const handleGenerate = useCallback(() => {
    setView('generator');
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 50);
  }, []);

  const handleResult = useCallback((res: SensitivityResult) => {
    saveResult(res);
    setView('result');
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 50);
  }, [saveResult]);

  const handleRegenerate = useCallback(() => {
    setView('generator');
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 50);
  }, []);

  const handleSave = useCallback(() => {
    if (result) saveConfig(result);
  }, [result, saveConfig]);

  if (status === 'offline') {
    return <OfflineScreen onRetry={retry} isRetrying={isChecking} />;
  }

  if (status === 'checking') {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#07070d]">
        <div className="animate-float"><LogoSmall /></div>
        <p className="mt-6 font-display text-sm font-bold tracking-wider text-raiden-neon animate-pulse-glow">INITIALIZING RΛIDΞN ENGINE...</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      <Navbar onNavigate={navigate} currentView={view} />

      <main className="pt-16">
        {view === 'home' && (
          <HomePage onGenerate={handleGenerate} onRedeem={() => navigate('redeem')} onDevice={() => navigate('device')} />
        )}
        {view === 'generator' && (
          <GeneratorPage device={device} savedInputs={inputs} onComplete={handleResult} onSaveInputs={saveInputs} />
        )}
        {view === 'result' && result && (
          <ResultPage result={result} onRegenerate={handleRegenerate} onSave={handleSave} onToast={(t, m) => t === 'success' ? success(m) : t === 'error' ? error(m) : info(m)} />
        )}
        {view === 'result' && !result && (
          <div className="px-4 py-20 text-center">
            <p className="font-body text-sm text-raiden-muted">No configuration found. Generate one to see results.</p>
            <button onClick={handleGenerate} className="btn-primary mt-4">Generate My Sensei</button>
          </div>
        )}
        {view === 'redeem' && <RedeemPage onToast={(t, m) => t === 'success' ? success(m) : t === 'error' ? error(m) : info(m)} />}
        {view === 'device' && <DevicePage device={device} onGenerate={handleGenerate} />}
        {view === 'about' && <AboutPage />}
      </main>

      <BottomNav current={view} onNavigate={navigate} />
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}

function LogoSmall() {
  return (
    <svg width="60" height="60" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="raiden-init-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#00e5ff" />
          <stop offset="50%" stopColor="#ff2e7e" />
          <stop offset="100%" stopColor="#ffb800" />
        </linearGradient>
      </defs>
      <polygon points="60,8 104,32 104,88 60,112 16,88 16,32" fill="none" stroke="url(#raiden-init-grad)" strokeWidth="3" />
    </svg>
  );
}

export default App;
