import { useEffect, useState } from 'react';
import { Logo } from './Logo';

export function LoadingScreen({ onComplete }: { onComplete: () => void }) {
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('INITIALIZING ENGINE');

  const stages = [
    { at: 15, text: 'LOADING MODULES' },
    { at: 30, text: 'CALIBRATING SENSORS' },
    { at: 50, text: 'DETECTING DEVICE' },
    { at: 70, text: 'OPTIMIZING CONFIG' },
    { at: 90, text: 'FINALIZING' },
    { at: 100, text: 'READY' },
  ];

  useEffect(() => {
    let current = 0;
    const interval = setInterval(() => {
      current += 2;
      if (current >= 100) {
        current = 100;
        clearInterval(interval);
        setTimeout(onComplete, 400);
      }
      setProgress(current);
      const stage = [...stages].reverse().find((s) => current >= s.at);
      if (stage) setStatusText(stage.text);
    }, 30);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-raiden-bg">
      <div className="relative">
        <div className="absolute inset-0 animate-pulse-glow">
          <Logo size={120} />
        </div>
        <div className="opacity-0">
          <Logo size={120} />
        </div>
      </div>

      <h1 className="mt-8 font-display text-2xl font-bold tracking-widest text-raiden-neon neon-text">
        RΛIDΞN 亗 SENSEI
      </h1>

      <div className="mt-8 w-64 max-w-[80vw]">
        <div className="stat-bar h-1.5">
          <div
            className="stat-bar-fill"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-3 flex justify-between font-mono text-xs text-raiden-muted">
          <span>{statusText}</span>
          <span>{progress}%</span>
        </div>
      </div>
    </div>
  );
}
