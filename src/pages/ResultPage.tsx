import { useState } from 'react';
import { Copy, Download, RefreshCw, Share2, Check, Crosshair, Zap, Monitor, Cpu, Activity, Settings, Save, Info } from 'lucide-react';
import type { SensitivityResult } from '@/lib/types';
import { Logo } from '@/components/Logo';
import { generateSensitivityImage } from '@/lib/imageGenerator';

interface Props {
  result: SensitivityResult;
  onRegenerate: () => void;
  onSave: () => void;
  onToast: (type: 'success' | 'error' | 'info', msg: string) => void;
}

export function ResultPage({ result, onRegenerate, onSave, onToast }: Props) {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [saved, setSaved] = useState(false);

  const sensValues: { label: string; value: number; color: string }[] = [
    { label: 'GENERAL', value: result.general, color: '#00e5ff' },
    { label: 'RED DOT', value: result.redDot, color: '#ff2e7e' },
    { label: '2X SCOPE', value: result.scope2x, color: '#00ff9d' },
    { label: '4X SCOPE', value: result.scope4x, color: '#ffb800' },
    { label: 'SNIPER SCOPE', value: result.sniper, color: '#ff3b5c' },
    { label: 'FREE LOOK', value: result.freeLook, color: '#00e5ff' },
  ];

  const handleCopy = () => {
    const text = `RΛIDΞN 亗 SENSEI - Sensitivity Configuration\nDevice: ${result.deviceName}\nProfile: ${result.profile} Performance\n\nGENERAL: ${result.general}\nRED DOT: ${result.redDot}\n2X SCOPE: ${result.scope2x}\n4X SCOPE: ${result.scope4x}\nSNIPER SCOPE: ${result.sniper}\nFREE LOOK: ${result.freeLook}\n\nFIRE BUTTON: ${result.fireButtonSize}%\nDPI: ${result.dpiRecommendation}\nFPS: ${result.fpsRecommendation}\nGRAPHICS: ${result.graphicsRecommendation}\nAIM STYLE: ${result.aimStyle}\nDRAG STYLE: ${result.dragStyle}\n\nConfidence: ${result.confidence}%\nRecommendations based on device info. Not affiliated with Garena.`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      onToast('success', 'Settings copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => onToast('error', 'Failed to copy'));
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const dataUrl = await generateSensitivityImage(result);
      const link = document.createElement('a');
      link.download = `raiden-sensei-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
      onToast('success', 'Image downloaded');
    } catch {
      onToast('error', 'Image generation failed');
    }
    setDownloading(false);
  };

  const handleShare = async () => {
    const shareText = `My RΛIDΞN 亗 SENSEI sensitivity: General ${result.general} | Red Dot ${result.redDot} | 2X ${result.scope2x} | 4X ${result.scope4x} | Sniper ${result.sniper} | Free Look ${result.freeLook}`;
    if (navigator.share) {
      try { await navigator.share({ title: 'RΛIDΞN 亗 SENSEI', text: shareText, url: window.location.href }); }
      catch { /* cancelled */ }
    } else {
      navigator.clipboard.writeText(`${shareText}\n${window.location.href}`).then(() => onToast('info', 'Link copied')).catch(() => onToast('error', 'Share unavailable'));
    }
  };

  const handleSave = () => {
    onSave();
    setSaved(true);
    onToast('success', 'Configuration saved');
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="animate-fade-in px-4 py-8 pb-20 md:py-12">
      <div className="mx-auto max-w-2xl">
        <div className="overflow-hidden rounded-2xl border border-raiden-border bg-raiden-surface">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-raiden-border bg-gradient-to-r from-raiden-neon/5 to-raiden-magenta/5 p-5">
            <div className="flex items-center gap-3">
              <Logo size={40} />
              <div>
                <h3 className="font-display text-sm font-bold tracking-wider text-raiden-neon">RΛIDΞN 亗 SENSEI</h3>
                <p className="font-mono text-[10px] text-raiden-muted">Configuration Generated</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-display text-[10px] font-bold tracking-widest text-raiden-muted">CONFIDENCE</p>
              <p className="font-mono text-xl font-bold text-raiden-green">{result.confidence}%</p>
            </div>
          </div>

          {/* Device + Profile */}
          <div className="grid grid-cols-2 gap-px bg-raiden-border">
            <div className="bg-raiden-card p-4"><p className="font-display text-[10px] font-bold tracking-widest text-raiden-muted">DEVICE</p><p className="mt-1 truncate font-body text-sm text-raiden-text">{result.deviceName}</p></div>
            <div className="bg-raiden-card p-4"><p className="font-display text-[10px] font-bold tracking-widest text-raiden-muted">PROFILE</p><p className="mt-1 font-body text-sm text-raiden-green">{result.profile} Performance</p></div>
          </div>

          {/* Sensitivity */}
          <div className="p-5">
            <div className="mb-3 flex items-center gap-2"><Crosshair size={14} className="text-raiden-neon" /><span className="font-display text-xs font-bold tracking-widest text-raiden-neon">SENSITIVITY</span></div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {sensValues.map((s) => (
                <div key={s.label} className="rounded-lg border border-raiden-border bg-raiden-card p-2.5">
                  <p className="font-display text-[10px] font-bold tracking-wider text-raiden-muted">{s.label}</p>
                  <p className="mt-1 font-mono text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
                  <div className="mt-1.5 stat-bar h-1"><div className="stat-bar-fill" style={{ width: `${s.value}%`, background: s.color }} /></div>
                </div>
              ))}
            </div>
          </div>

          {/* Additional config */}
          <div className="border-t border-raiden-border p-5">
            <div className="mb-3 flex items-center gap-2"><Settings size={14} className="text-raiden-magenta" /><span className="font-display text-xs font-bold tracking-widest text-raiden-magenta">ADDITIONAL CONFIG</span></div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <ConfigRow icon={Zap} label="FIRE BUTTON" value={`${result.fireButtonSize}%`} color="#00e5ff" />
              <ConfigRow icon={Activity} label="DPI" value={`${result.dpiRecommendation}`} color="#ff2e7e" />
              <ConfigRow icon={Monitor} label="FPS" value={`${result.fpsRecommendation}`} color="#00ff9d" />
              <ConfigRow icon={Cpu} label="GRAPHICS" value={result.graphicsRecommendation} color="#ffb800" />
              <ConfigRow icon={Crosshair} label="AIM STYLE" value={result.aimStyle} color="#00e5ff" />
              <ConfigRow icon={Activity} label="DRAG STYLE" value={result.dragStyle} color="#ff2e7e" />
            </div>
          </div>

          {/* Configuration analysis */}
          <div className="border-t border-raiden-border p-5">
            <div className="mb-3 flex items-center gap-2"><Activity size={14} className="text-raiden-green" /><span className="font-display text-xs font-bold tracking-widest text-raiden-green">CONFIGURATION ANALYSIS</span></div>
            <div className="space-y-1.5">
              <AnalysisRow label="DEVICE MATCH" value={`${result.confidence}%`} />
              <AnalysisRow label="PERFORMANCE PROFILE" value={result.performanceProfile} />
              <AnalysisRow label="TOUCH PROFILE" value={result.touchProfile} />
              <AnalysisRow label="RECOMMENDED STYLE" value={result.recommendedStyle} />
            </div>
            {result.factors.length > 0 && (
              <div className="mt-3 rounded-lg border border-raiden-border bg-raiden-card/50 p-3">
                <div className="mb-2 flex items-center gap-1.5"><Info size={12} className="text-raiden-neon" /><span className="font-display text-[10px] font-bold tracking-wider text-raiden-muted">FACTORS ANALYZED</span></div>
                <div className="flex flex-wrap gap-1.5">
                  {result.factors.map((f) => (
                    <span key={f.name} className="badge" style={{ background: f.impact === 'high' ? 'rgba(0,229,255,0.08)' : 'rgba(30,30,48,0.6)', color: f.impact === 'high' ? '#00e5ff' : '#8a8aa0', border: `1px solid ${f.impact === 'high' ? 'rgba(0,229,255,0.2)' : 'rgba(30,30,48,0.8)'}` }}>
                      {f.name}
                    </span>
                  ))}
                </div>
                <p className="mt-2 font-body text-xs leading-relaxed text-raiden-muted">{result.explanation}</p>
              </div>
            )}
          </div>

          {/* Disclaimer */}
          <div className="border-t border-raiden-border bg-raiden-bg/50 p-4">
            <p className="font-body text-xs leading-relaxed text-raiden-muted">These settings are recommendations based on available device information. No setting guarantees headshots. Not affiliated with or endorsed by Garena or Free Fire.</p>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-3 gap-2 p-4 sm:grid-cols-5">
            <button onClick={handleCopy} className="btn-ghost flex-col gap-1 py-2.5">
              {copied ? <Check size={16} className="text-raiden-green" /> : <Copy size={16} />}
              <span className="text-[10px]">{copied ? 'Copied' : 'Copy'}</span>
            </button>
            <button onClick={handleDownload} disabled={downloading} className="btn-ghost flex-col gap-1 py-2.5">
              {downloading ? <RefreshCw size={16} className="animate-spin" /> : <Download size={16} />}
              <span className="text-[10px]">{downloading ? '...' : 'Image'}</span>
            </button>
            <button onClick={handleShare} className="btn-ghost flex-col gap-1 py-2.5">
              <Share2 size={16} /><span className="text-[10px]">Share</span>
            </button>
            <button onClick={handleSave} className="btn-ghost flex-col gap-1 py-2.5">
              {saved ? <Check size={16} className="text-raiden-green" /> : <Save size={16} />}
              <span className="text-[10px]">{saved ? 'Saved' : 'Save'}</span>
            </button>
            <button onClick={onRegenerate} className="btn-ghost flex-col gap-1 py-2.5">
              <RefreshCw size={16} /><span className="text-[10px]">Again</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ConfigRow({ icon: Icon, label, value, color }: { icon: typeof Zap; label: string; value: string; color: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-raiden-border bg-raiden-card p-2">
      <Icon size={12} style={{ color }} />
      <div className="min-w-0"><p className="font-display text-[9px] font-bold tracking-wider text-raiden-muted">{label}</p><p className="truncate font-body text-xs text-raiden-text">{value}</p></div>
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
