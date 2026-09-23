import { useState, useEffect } from 'react';
import { ChevronRight, Cpu, TouchpadIcon, Monitor, Zap, Settings, CheckCircle, Smartphone } from 'lucide-react';
import type { DeviceInfo, UserInputs, SensitivityResult } from '@/lib/types';
import { PLAY_STYLES, GRAPHICS_OPTIONS, FPS_OPTIONS } from '@/lib/types';
import { getDevicePerformanceTier } from '@/lib/deviceDetection';
import { generateSensitivity } from '@/lib/sensitivityEngine';

interface Props {
  device: DeviceInfo | null;
  savedInputs: UserInputs | null;
  onComplete: (result: SensitivityResult) => void;
  onSaveInputs: (inputs: UserInputs) => void;
}

const ANIMATION_STAGES = [
  { label: 'ANALYZING DEVICE', icon: Cpu },
  { label: 'ANALYZING DISPLAY', icon: Monitor },
  { label: 'ANALYZING TOUCH', icon: TouchpadIcon },
  { label: 'ANALYZING PERFORMANCE', icon: Zap },
  { label: 'ANALYZING PLAY STYLE', icon: Settings },
  { label: 'CALCULATING CONFIGURATION', icon: Settings },
  { label: 'FINALIZING SENSEI', icon: CheckCircle },
];

const EMPTY_INPUTS: UserInputs = {
  phoneBrand: '', phoneModel: '', ram: '', storage: '', refreshRate: '', dpi: '',
  osVersion: '', graphicsSetting: '', fpsSetting: '', currentSensitivity: '', playStyle: 'balanced',
};

export function GeneratorPage({ device, savedInputs, onComplete, onSaveInputs }: Props) {
  const [inputs, setInputs] = useState<UserInputs>(savedInputs ? { ...EMPTY_INPUTS, ...savedInputs } : EMPTY_INPUTS);
  const [generating, setGenerating] = useState(false);
  const [stageIndex, setStageIndex] = useState(0);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    if (savedInputs) setInputs({ ...EMPTY_INPUTS, ...savedInputs });
  }, [savedInputs]);

  const handleGenerate = () => {
    if (!device) return;
    setGenerating(true);
    setStageIndex(0);
    onSaveInputs(inputs);
    const stageDuration = 280;
    const interval = setInterval(() => {
      setStageIndex((p) => {
        if (p >= ANIMATION_STAGES.length - 1) { clearInterval(interval); return p; }
        return p + 1;
      });
    }, stageDuration);
    setTimeout(() => {
      const result = generateSensitivity(device, inputs);
      setGenerating(false);
      onComplete(result);
    }, ANIMATION_STAGES.length * stageDuration + 200);
  };

  const update = (key: keyof UserInputs, value: string) => setInputs((p) => ({ ...p, [key]: value }));

  if (generating) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4 animate-fade-in">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center">
              <div className="relative">
                <div className="absolute inset-0 animate-spin-slow rounded-full border-2 border-raiden-neon border-t-transparent" />
                <Zap size={28} className="absolute inset-0 m-auto text-raiden-neon" />
              </div>
            </div>
            <h3 className="font-display text-xl font-bold tracking-wider text-raiden-neon">GENERATING</h3>
          </div>
          <div className="space-y-1.5">
            {ANIMATION_STAGES.map((stage, i) => (
              <div key={stage.label} className={`flex items-center gap-3 rounded-lg p-2.5 transition-all duration-300 ${i <= stageIndex ? 'border border-raiden-neon/20 bg-raiden-surface/60 opacity-100' : 'opacity-20'}`}>
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all ${i < stageIndex ? 'bg-raiden-green/20 text-raiden-green' : i === stageIndex ? 'bg-raiden-neon/20 text-raiden-neon animate-pulse-glow' : 'bg-raiden-card text-raiden-muted'}`}>
                  {i < stageIndex ? <CheckCircle size={16} /> : <stage.icon size={16} />}
                </div>
                <span className={`font-display text-xs font-semibold tracking-wider ${i <= stageIndex ? 'text-raiden-text' : 'text-raiden-muted'}`}>{stage.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in px-4 py-8 pb-20 md:py-12">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8">
          <h2 className="section-title">Sensei Generator</h2>
          <p className="section-subtitle">Enter optional details for a more precise calculation, or generate with detected data</p>
        </div>

        {device && (
          <div className="mb-4 rounded-xl border border-raiden-border bg-raiden-surface p-4">
            <div className="mb-1 flex items-center gap-2">
              <Cpu size={14} className="text-raiden-neon" />
              <span className="font-display text-[10px] font-bold tracking-widest text-raiden-muted">DETECTED: {device.deviceName} · {device.os} · {getDevicePerformanceTier(device)} Performance</span>
            </div>
            <p className="font-body text-xs text-raiden-muted">
              Screen {device.screenWidth}×{device.screenHeight} · Pixel Ratio {device.pixelRatio.toFixed(1)} · {device.touchSupported ? 'Touch Supported' : 'No Touch'}{device.hardwareConcurrency ? ` · ${device.hardwareConcurrency} cores` : ''}
            </p>
          </div>
        )}

        {/* Play style */}
        <div className="mb-4 rounded-xl border border-raiden-border bg-raiden-surface p-4">
          <label className="mb-3 block font-display text-xs font-bold tracking-wider text-raiden-neon">PLAY STYLE</label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {PLAY_STYLES.map((s) => (
              <button key={s.value} onClick={() => update('playStyle', s.value)}
                className={`rounded-lg p-2.5 text-center transition-all duration-200 ${inputs.playStyle === s.value ? 'border border-raiden-neon/50 bg-raiden-neon/10 text-raiden-neon' : 'border border-raiden-border bg-raiden-card text-raiden-muted hover:border-raiden-neon/30'}`}>
                <span className="block font-display text-xs font-bold tracking-wider">{s.label}</span>
              </button>
            ))}
          </div>
          <p className="mt-2 font-body text-xs text-raiden-muted">{PLAY_STYLES.find((s) => s.value === inputs.playStyle)?.description}</p>
        </div>

        {/* Optional inputs */}
        <div className="mb-4 rounded-xl border border-raiden-border bg-raiden-surface p-4">
          <label className="mb-3 block font-display text-xs font-bold tracking-wider text-raiden-neon">OPTIONAL DEVICE DETAILS</label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input className="input-field" placeholder="Phone Brand (e.g. Samsung)" value={inputs.phoneBrand} onChange={(e) => update('phoneBrand', e.target.value)} />
            <input className="input-field" placeholder="Phone Model (e.g. Galaxy S23)" value={inputs.phoneModel} onChange={(e) => update('phoneModel', e.target.value)} />
            <select className="input-field" value={inputs.ram} onChange={(e) => update('ram', e.target.value)}>
              <option value="">RAM (auto-detected)</option>
              {[2,3,4,6,8,12,16].map((r) => <option key={r} value={r}>{r} GB</option>)}
            </select>
            <select className="input-field" value={inputs.refreshRate} onChange={(e) => update('refreshRate', e.target.value)}>
              <option value="">Refresh Rate (auto)</option>
              {[60,90,120,144].map((r) => <option key={r} value={r}>{r} Hz</option>)}
            </select>
            <input className="input-field" type="number" placeholder="DPI (e.g. 400)" value={inputs.dpi} onChange={(e) => update('dpi', e.target.value)} />
            <select className="input-field" value={inputs.fpsSetting} onChange={(e) => update('fpsSetting', e.target.value)}>
              <option value="">FPS Setting (auto)</option>
              {FPS_OPTIONS.map((f) => <option key={f} value={f}>{f} FPS</option>)}
            </select>
          </div>
        </div>

        {/* Advanced toggle */}
        <button onClick={() => setShowAdvanced(!showAdvanced)} className="mb-3 flex w-full items-center justify-between rounded-xl border border-raiden-border bg-raiden-card/50 p-3.5 font-display text-xs font-bold tracking-wider text-raiden-muted transition-colors hover:text-raiden-neon">
          <span>ADVANCED OPTIONS</span>
          <ChevronRight size={16} className={`transition-transform ${showAdvanced ? 'rotate-90' : ''}`} />
        </button>

        {showAdvanced && (
          <div className="mb-4 rounded-xl border border-raiden-border bg-raiden-surface p-4 animate-fade-in">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <input className="input-field" placeholder="Storage (e.g. 128GB)" value={inputs.storage} onChange={(e) => update('storage', e.target.value)} />
              <input className="input-field" placeholder="OS Version (e.g. Android 14)" value={inputs.osVersion} onChange={(e) => update('osVersion', e.target.value)} />
              <select className="input-field" value={inputs.graphicsSetting} onChange={(e) => update('graphicsSetting', e.target.value)}>
                <option value="">Graphics Setting (auto)</option>
                {GRAPHICS_OPTIONS.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
              <input className="input-field" type="number" placeholder="Current Sensitivity (e.g. 95)" value={inputs.currentSensitivity} onChange={(e) => update('currentSensitivity', e.target.value)} />
            </div>
          </div>
        )}

        <button onClick={handleGenerate} disabled={!device} className="btn-primary w-full py-3.5 text-base disabled:opacity-50">
          <Zap size={20} />Generate My Sensei
        </button>
        {!device && <p className="mt-3 text-center font-body text-xs text-raiden-muted"><Smartphone size={12} className="inline mr-1" />Detecting device information...</p>}
      </div>
    </div>
  );
}
