import { useState, useEffect } from 'react';
import { ChevronRight, Cpu, TouchpadIcon, Monitor, Zap, Settings, CheckCircle } from 'lucide-react';
import type { DeviceInfo, UserInputs, SensitivityResult } from '@/lib/types';
import { PLAY_STYLES, GRAPHICS_OPTIONS, FPS_OPTIONS } from '@/lib/types';
import { detectDevice, getDevicePerformanceTier } from '@/lib/deviceDetection';
import { generateSensitivity } from '@/lib/sensitivityEngine';
import { saveResult, saveInputs, loadInputs } from '@/lib/storage';

interface Props {
  onComplete: (result: SensitivityResult) => void;
}

const ANIMATION_STAGES = [
  { label: 'ANALYZING DEVICE', icon: Cpu },
  { label: 'ANALYZING TOUCH PROFILE', icon: TouchpadIcon },
  { label: 'CALCULATING SCREEN PARAMETERS', icon: Monitor },
  { label: 'OPTIMIZING SENSITIVITY', icon: Zap },
  { label: 'BUILDING CONFIGURATION', icon: Settings },
  { label: 'RΛIDΞN ENGINE COMPLETE', icon: CheckCircle },
];

const EMPTY_INPUTS: UserInputs = {
  phoneBrand: '',
  phoneModel: '',
  ram: '',
  storage: '',
  refreshRate: '',
  dpi: '',
  osVersion: '',
  graphicsSetting: '',
  fpsSetting: '',
  currentSensitivity: '',
  playStyle: 'balanced',
};

export function Generator({ onComplete }: Props) {
  const [device, setDevice] = useState<DeviceInfo | null>(null);
  const [inputs, setInputs] = useState<UserInputs>(EMPTY_INPUTS);
  const [generating, setGenerating] = useState(false);
  const [stageIndex, setStageIndex] = useState(0);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    setDevice(detectDevice());
    const saved = loadInputs();
    if (saved) setInputs({ ...EMPTY_INPUTS, ...saved });
  }, []);

  const handleGenerate = () => {
    if (!device) return;
    setGenerating(true);
    setStageIndex(0);
    saveInputs(inputs);

    const stageDuration = 350;
    const totalDuration = ANIMATION_STAGES.length * stageDuration;

    const stageInterval = setInterval(() => {
      setStageIndex((prev) => {
        if (prev >= ANIMATION_STAGES.length - 1) {
          clearInterval(stageInterval);
          return prev;
        }
        return prev + 1;
      });
    }, stageDuration);

    setTimeout(() => {
      const result = generateSensitivity(device, inputs);
      saveResult(result);
      setGenerating(false);
      onComplete(result);
    }, totalDuration + 200);
  };

  const update = (key: keyof UserInputs, value: string) => {
    setInputs((prev) => ({ ...prev, [key]: value }));
  };

  if (generating) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center">
              <div className="relative">
                <div className="absolute inset-0 animate-spin-slow rounded-full border-2 border-raiden-neon border-t-transparent" />
                <div className="absolute inset-2 animate-pulse-glow rounded-full border border-raiden-magenta/30" />
                <Zap size={28} className="absolute inset-0 m-auto text-raiden-neon" />
              </div>
            </div>
            <h3 className="font-display text-xl font-bold tracking-wider text-raiden-neon neon-text">
              GENERATING
            </h3>
          </div>

          <div className="space-y-2">
            {ANIMATION_STAGES.map((stage, i) => (
              <div
                key={stage.label}
                className={`flex items-center gap-3 rounded-lg p-2.5 transition-all duration-300 ${
                  i <= stageIndex
                    ? 'glass border-raiden-neon/30 opacity-100'
                    : 'opacity-20'
                }`}
              >
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all ${
                    i < stageIndex
                      ? 'bg-raiden-green/20 text-raiden-green'
                      : i === stageIndex
                      ? 'bg-raiden-neon/20 text-raiden-neon animate-pulse-glow'
                      : 'bg-raiden-card text-raiden-muted'
                  }`}
                >
                  {i < stageIndex ? (
                    <CheckCircle size={16} />
                  ) : (
                    <stage.icon size={16} />
                  )}
                </div>
                <span
                  className={`font-display text-xs font-semibold tracking-wider ${
                    i <= stageIndex ? 'text-raiden-text' : 'text-raiden-muted'
                  }`}
                >
                  {stage.label}
                </span>
                {i < stageIndex && <ChevronRight size={14} className="ml-auto text-raiden-green" />}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <section id="generator" className="relative px-4 py-20">
      <div className="mx-auto max-w-3xl">
        <div className="mb-12 text-center">
          <h2 className="section-title">Sensei Generator</h2>
          <p className="mt-3 font-body text-sm text-raiden-muted sm:text-base">
            Enter optional details for a more precise calculation, or generate with detected data
          </p>
        </div>

        {/* Detected device summary */}
        {device && (
          <div className="glass mb-6 rounded-xl p-4">
            <div className="mb-2 flex items-center gap-2">
              <Cpu size={16} className="text-raiden-neon" />
              <span className="font-display text-xs font-bold tracking-widest text-raiden-muted">
                DETECTED: {device.deviceName} · {device.os} · {getDevicePerformanceTier(device)} Performance
              </span>
            </div>
            <p className="font-body text-xs text-raiden-muted">
              Screen {device.screenWidth}×{device.screenHeight} · Pixel Ratio {device.pixelRatio.toFixed(1)} ·
              {device.touchSupported ? ' Touch Supported' : ' No Touch'} ·
              {device.hardwareConcurrency ? ` ${device.hardwareConcurrency} cores` : ''}
            </p>
          </div>
        )}

        {/* Play style selector */}
        <div className="glass mb-6 rounded-2xl p-5">
          <label className="mb-3 block font-display text-sm font-bold tracking-wider text-raiden-neon">
            PLAY STYLE
          </label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {PLAY_STYLES.map((style) => (
              <button
                key={style.value}
                onClick={() => update('playStyle', style.value)}
                className={`rounded-lg p-3 text-center transition-all duration-200 ${
                  inputs.playStyle === style.value
                    ? 'bg-raiden-neon/15 border border-raiden-neon/50 text-raiden-neon neon-border'
                    : 'bg-raiden-card border border-raiden-border text-raiden-muted hover:border-raiden-neon/30'
                }`}
              >
                <span className="block font-display text-xs font-bold tracking-wider">
                  {style.label}
                </span>
              </button>
            ))}
          </div>
          <p className="mt-3 font-body text-xs text-raiden-muted">
            {PLAY_STYLES.find((s) => s.value === inputs.playStyle)?.description}
          </p>
        </div>

        {/* Basic optional inputs */}
        <div className="glass mb-6 rounded-2xl p-5">
          <label className="mb-3 block font-display text-sm font-bold tracking-wider text-raiden-neon">
            OPTIONAL DEVICE DETAILS
          </label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input
              className="input-field"
              placeholder="Phone Brand (e.g. Samsung)"
              value={inputs.phoneBrand}
              onChange={(e) => update('phoneBrand', e.target.value)}
            />
            <input
              className="input-field"
              placeholder="Phone Model (e.g. Galaxy S23)"
              value={inputs.phoneModel}
              onChange={(e) => update('phoneModel', e.target.value)}
            />
            <select
              className="input-field"
              value={inputs.ram}
              onChange={(e) => update('ram', e.target.value)}
            >
              <option value="">RAM (auto-detected)</option>
              <option value="2">2 GB</option>
              <option value="3">3 GB</option>
              <option value="4">4 GB</option>
              <option value="6">6 GB</option>
              <option value="8">8 GB</option>
              <option value="12">12 GB</option>
              <option value="16">16 GB</option>
            </select>
            <select
              className="input-field"
              value={inputs.refreshRate}
              onChange={(e) => update('refreshRate', e.target.value)}
            >
              <option value="">Refresh Rate (auto)</option>
              <option value="60">60 Hz</option>
              <option value="90">90 Hz</option>
              <option value="120">120 Hz</option>
              <option value="144">144 Hz</option>
            </select>
            <input
              className="input-field"
              type="number"
              placeholder="DPI (e.g. 400)"
              value={inputs.dpi}
              onChange={(e) => update('dpi', e.target.value)}
            />
            <select
              className="input-field"
              value={inputs.fpsSetting}
              onChange={(e) => update('fpsSetting', e.target.value)}
            >
              <option value="">FPS Setting (auto)</option>
              {FPS_OPTIONS.map((f) => (
                <option key={f} value={f}>{f} FPS</option>
              ))}
            </select>
          </div>
        </div>

        {/* Advanced toggle */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="mb-4 flex w-full items-center justify-between rounded-xl border border-raiden-border bg-raiden-card/50 p-4 font-display text-xs font-bold tracking-wider text-raiden-muted transition-colors hover:text-raiden-neon"
        >
          <span>ADVANCED OPTIONS</span>
          <ChevronRight
            size={16}
            className={`transition-transform ${showAdvanced ? 'rotate-90' : ''}`}
          />
        </button>

        {/* Advanced inputs */}
        {showAdvanced && (
          <div className="glass mb-6 rounded-2xl p-5 animate-fade-in">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <input
                className="input-field"
                placeholder="Storage (e.g. 128GB)"
                value={inputs.storage}
                onChange={(e) => update('storage', e.target.value)}
              />
              <input
                className="input-field"
                placeholder="OS Version (e.g. Android 14)"
                value={inputs.osVersion}
                onChange={(e) => update('osVersion', e.target.value)}
              />
              <select
                className="input-field"
                value={inputs.graphicsSetting}
                onChange={(e) => update('graphicsSetting', e.target.value)}
              >
                <option value="">Graphics Setting (auto)</option>
                {GRAPHICS_OPTIONS.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
              <input
                className="input-field"
                type="number"
                placeholder="Current Sensitivity (e.g. 95)"
                value={inputs.currentSensitivity}
                onChange={(e) => update('currentSensitivity', e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Generate button */}
        <button
          onClick={handleGenerate}
          className="btn-primary w-full text-base py-4"
        >
          <Zap size={20} />
          Generate My Sensei
        </button>
      </div>
    </section>
  );
}
