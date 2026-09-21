import { useState, useCallback } from 'react';
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

function App() {
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>('home');
  const [result, setResult] = useState<SensitivityResult | null>(loadResult());

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

  if (loading) {
    return <LoadingScreen onComplete={() => setLoading(false)} />;
  }

  return (
    <div className="relative min-h-screen">
      <ParticleBackground />
      <div className="relative z-10">
        <Navbar onNavigate={handleNavigate} />

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
