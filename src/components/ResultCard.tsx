import { useState } from 'react';
import { Copy, Download, RefreshCw, Share2, Check, Crosshair, Zap, Monitor, Cpu, Activity, Settings } from 'lucide-react';
import type { SensitivityResult } from '@/lib/types';
import { Logo } from './Logo';
import { generateSensitivityImage } from '@/lib/imageGenerator';

interface Props {
  result: SensitivityResult;
  onRegenerate: () => void;
}

export function ResultCard({ result, onRegenerate }: Props) {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [shareStatus, setShareStatus] = useState('');

  const sensValues: { label: string; value: number; color: string }[] = [
    { label: 'GENERAL', value: result.general, color: '#00e5ff' },
    { label: 'RED DOT', value: result.redDot, color: '#ff2e7e' },
    { label: '2X SCOPE', value: result.scope2x, color: '#00ff9d' },
    { label: '4X SCOPE', value: result.scope4x, color: '#ffb800' },
    { label: 'SNIPER SCOPE', value: result.sniper, color: '#ff3b5c' },
    { label: 'FREE LOOK', value: result.freeLook, color: '#00e5ff' },
  ];

  const handleCopy = () => {
    const text = `RΛIDΞN 亗 SENSEI - Sensitivity Configuration
Device: ${result.deviceName}
Profile: ${result.profile} Performance

GENERAL: ${result.general}
RED DOT: ${result.redDot}
2X SCOPE: ${result.scope2x}
4X SCOPE: ${result.scope4x}
SNIPER SCOPE: ${result.sniper}
FREE LOOK: ${result.freeLook}

FIRE BUTTON: ${result.fireButtonSize}%
DPI: ${result.dpiRecommendation}
FPS: ${result.fpsRecommendation}
GRAPHICS: ${result.graphicsRecommendation}
AIM STYLE: ${result.aimStyle}
DRAG STYLE: ${result.dragStyle}

Confidence: ${result.confidence}%
These are recommendations based on device info. Not affiliated with Garena.`;

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const dataUrl = await generateSensitivityImage(result);
      const link = document.createElement('a');
      link.download = `raiden-sensei-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch {
      setShareStatus('Image generation failed');
      setTimeout(() => setShareStatus(''), 3000);
    }
    setDownloading(false);
  };

  const handleShare = async () => {
    const shareText = `My RΛIDΞN 亗 SENSEI sensitivity: General ${result.general} | Red Dot ${result.redDot} | 2X ${result.scope2x} | 4X ${result.scope4x} | Sniper ${result.sniper} | Free Look ${result.freeLook}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'RΛIDΞN 亗 SENSEI',
          text: shareText,
          url: window.location.href,
        });
      } catch {
        // user cancelled
      }
    } else {
      navigator.clipboard.writeText(`${shareText}\n${window.location.href}`).then(() => {
        setShareStatus('Link copied');
        setTimeout(() => setShareStatus(''), 2000);
      });
    }
  };

  return (
    <section id="generator" className="relative px-4 py-20">
      <div className="mx-auto max-w-2xl">
        {/* Card */}
        <div className="glass-strong card-glow rounded-2xl overflow-hidden">
          {/* Header */}
          <div className="relative border-b border-raiden-border bg-gradient-to-r from-raiden-neon/10 to-raiden-magenta/10 p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Logo size={44} />
                <div>
                  <h3 className="font-display text-base font-bold tracking-wider text-raiden-neon neon-text">
                    RΛIDΞN 亗 SENSEI
                  </h3>
                  <p className="font-mono text-xs text-raiden-muted">
                    Configuration Generated
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-display text-[10px] font-bold tracking-widest text-raiden-muted">
                  CONFIDENCE
                </p>
                <p className="font-mono text-xl font-bold text-raiden-green">
                  {result.confidence}%
                </p>
              </div>
            </div>
          </div>

          {/* Device + Profile */}
          <div className="grid grid-cols-2 gap-px bg-raiden-border">
            <div className="bg-raiden-card p-4">
              <p className="font-display text-[10px] font-bold tracking-widest text-raiden-muted">DEVICE</p>
              <p className="mt-1 truncate font-body text-sm text-raiden-text">{result.deviceName}</p>
            </div>
            <div className="bg-raiden-card p-4">
              <p className="font-display text-[10px] font-bold tracking-widest text-raiden-muted">PROFILE</p>
              <p className="mt-1 font-body text-sm text-raiden-green">{result.profile} Performance</p>
            </div>
          </div>

          {/* Sensitivity values */}
          <div className="p-5">
            <div className="mb-4 flex items-center gap-2">
              <Crosshair size={16} className="text-raiden-neon" />
              <span className="font-display text-xs font-bold tracking-widest text-raiden-neon">
                SENSITIVITY
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {sensValues.map((s) => (
                <div key={s.label} className="rounded-xl border border-raiden-border bg-raiden-card p-3">
                  <p className="font-display text-[10px] font-bold tracking-wider text-raiden-muted">
                    {s.label}
                  </p>
                  <p className="mt-1 font-mono text-2xl font-bold" style={{ color: s.color }}>
                    {s.value}
                  </p>
                  <div className="mt-2 stat-bar h-1">
                    <div className="stat-bar-fill" style={{ width: `${s.value}%`, background: s.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Additional config */}
          <div className="border-t border-raiden-border p-5">
            <div className="mb-4 flex items-center gap-2">
              <Settings size={16} className="text-raiden-magenta" />
              <span className="font-display text-xs font-bold tracking-widest text-raiden-magenta">
                ADDITIONAL CONFIG
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <ConfigRow icon={Zap} label="FIRE BUTTON" value={`${result.fireButtonSize}%`} color="#00e5ff" />
              <ConfigRow icon={Activity} label="DPI" value={`${result.dpiRecommendation}`} color="#ff2e7e" />
              <ConfigRow icon={Monitor} label="FPS" value={`${result.fpsRecommendation}`} color="#00ff9d" />
              <ConfigRow icon={Cpu} label="GRAPHICS" value={result.graphicsRecommendation} color="#ffb800" />
              <ConfigRow icon={Crosshair} label="AIM STYLE" value={result.aimStyle} color="#00e5ff" />
              <ConfigRow icon={Activity} label="DRAG STYLE" value={result.dragStyle} color="#ff2e7e" />
            </div>
          </div>

          {/* Confidence analysis */}
          <div className="border-t border-raiden-border p-5">
            <div className="mb-3 flex items-center gap-2">
              <Activity size={16} className="text-raiden-green" />
              <span className="font-display text-xs font-bold tracking-widest text-raiden-green">
                CONFIGURATION ANALYSIS
              </span>
            </div>
            <div className="space-y-2">
              <AnalysisRow label="DEVICE MATCH" value={`${result.confidence}%`} />
              <AnalysisRow label="PERFORMANCE PROFILE" value={result.performanceProfile} />
              <AnalysisRow label="TOUCH PROFILE" value={result.touchProfile} />
              <AnalysisRow label="RECOMMENDED STYLE" value={result.recommendedStyle} />
            </div>
          </div>

          {/* Disclaimer */}
          <div className="border-t border-raiden-border bg-raiden-bg/50 p-4">
            <p className="font-body text-xs leading-relaxed text-raiden-muted">
              These settings are recommendations based on available device information.
              No setting guarantees headshots. Not affiliated with or endorsed by Garena or Free Fire.
            </p>
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-4">
            <button onClick={handleCopy} className="btn-ghost">
              {copied ? <Check size={16} className="text-raiden-green" /> : <Copy size={16} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button onClick={handleDownload} disabled={downloading} className="btn-ghost">
              {downloading ? <RefreshCw size={16} className="animate-spin" /> : <Download size={16} />}
              {downloading ? '...' : 'Image'}
            </button>
            <button onClick={handleShare} className="btn-ghost">
              <Share2 size={16} />
              Share
            </button>
            <button onClick={onRegenerate} className="btn-ghost">
              <RefreshCw size={16} />
              Again
            </button>
          </div>
          {shareStatus && (
            <div className="px-4 pb-3 text-center font-body text-xs text-raiden-green">
              {shareStatus}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function ConfigRow({ icon: Icon, label, value, color }: { icon: typeof Zap; label: string; value: string; color: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-raiden-border bg-raiden-card p-2.5">
      <Icon size={14} style={{ color }} />
      <div className="min-w-0">
        <p className="font-display text-[9px] font-bold tracking-wider text-raiden-muted">{label}</p>
        <p className="truncate font-body text-xs text-raiden-text">{value}</p>
      </div>
    </div>
  );
}

function AnalysisRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-raiden-card/50 px-3 py-2">
      <span className="font-display text-[10px] font-bold tracking-wider text-raiden-muted">{label}</span>
      <span className="font-body text-xs text-raiden-neon">{value}</span>
    </div>
  );
}


