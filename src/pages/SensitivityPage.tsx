import { useEffect, useMemo, useState } from 'react';
import { Crosshair, Copy, Download, Save, RefreshCw, Crown, CheckCircle2, Info, Eye } from 'lucide-react';
import { Card, Button, Badge } from '@/components/ui';
import { PremiumLock, PremiumBadge } from '@/components/PremiumLock';
import { FREE_PRESETS, PREMIUM_PRESETS, ALL_PRESETS, isPremiumPreset } from '@/lib/presets';
import { detectDevice, deviceSummary } from '@/utils/device';
import { generateSensitivity, sensitivityToText } from '@/utils/sensitivity';
import { useAuth } from '@/hooks/useAuth';
import { navigate } from '@/hooks/useRouter';
import { supabase } from '@/lib/supabase';
import { renderSensitivityCard } from '@/utils/sensitivityImage';
import type { DeviceInfo, Preset, SensitivityValues } from '@/types';

export function SensitivityPage() {
  const { user, isPremium } = useAuth();
  const [device, setDevice] = useState<DeviceInfo | null>(null);
  const [preset, setPreset] = useState<Preset>('balanced');
  const [result, setResult] = useState<{
    values: SensitivityValues; confidence: number; notes: string[];
  } | null>(null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showImage, setShowImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    setDevice(detectDevice());
  }, []);

  const presetLocked = isPremiumPreset(preset) && !isPremium;

  const generate = () => {
    if (!device) return;
    setGenerating(true);
    setSaved(false);
    setCopied(false);
    // Slight delay for animation
    setTimeout(() => {
      const r = generateSensitivity(preset, device, isPremium && !presetLocked);
      setResult(r);
      setGenerating(false);
    }, 450);
  };

  useEffect(() => {
    if (device && !result) generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [device]);

  const copy = async () => {
    if (!result || !device) return;
    const text = sensitivityToText(result.values, preset, device);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };

  const save = async () => {
    if (!result || !device || !user) {
      navigate('login');
      return;
    }
    setSaveError('');
    const { error } = await supabase.from('saved_sensitivities').insert({
      name: `${preset} — ${new Date().toLocaleDateString()}`,
      device: device as unknown as Record<string, unknown>,
      preset,
      values: result.values,
      confidence: result.confidence,
      is_premium: isPremium,
    });
    if (error) {
      if (error.code === '42501' || error.message.includes('row-level security')) {
        setSaveError('Free accounts can save up to 3 profiles. Upgrade to Premium for unlimited saves.');
      } else {
        setSaveError(error.message);
      }
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  const generateImage = () => {
    if (!result || !device) return;
    const canvas = renderSensitivityCard({
      values: result.values,
      preset: ALL_PRESETS.find((p) => p.id === preset)?.label ?? preset,
      confidence: result.confidence,
      device: deviceSummary(device),
      username: user?.email ?? 'Guest',
      isPremium,
    });
    setImagePreview(canvas.toDataURL('image/png'));
    setShowImage(true);
  };

  const downloadImage = () => {
    if (!imagePreview) {
      generateImage();
      return;
    }
    const a = document.createElement('a');
    a.href = imagePreview;
    a.download = `ff-sensitivity-${preset}-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const shareImage = async () => {
    if (!imagePreview) return;
    try {
      const res = await fetch(imagePreview);
      const blob = await res.blob();
      const file = new File([blob], 'ff-sensitivity.png', { type: 'image/png' });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'My Free Fire Sensitivity' });
      } else {
        downloadImage();
      }
    } catch {
      downloadImage();
    }
  };

  const rows: { key: keyof SensitivityValues; label: string }[] = useMemo(() => ([
    { key: 'general', label: 'General' },
    { key: 'red_dot', label: 'Red Dot' },
    { key: 'scope_2x', label: '2x Scope' },
    { key: 'scope_4x', label: '4x Scope' },
    { key: 'sniper_scope', label: 'Sniper Scope' },
    { key: 'free_look', label: 'Free Look' },
  ]), []);

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
      <header className="text-center mb-8 animate-fade-up">
        <Badge color="orange">Sensitivity Generator</Badge>
        <h1 className="mt-3 font-display text-3xl sm:text-4xl font-bold text-neutral-900">
          Generate your <span className="text-gradient-orange">perfect sensitivity</span>
        </h1>
        <p className="mt-2 text-neutral-500 max-w-xl mx-auto text-sm">
          Choose a preset. Our engine uses your device fingerprint to produce tuned values — not random numbers.
        </p>
      </header>

      <div className="grid lg:grid-cols-5 gap-5">
        {/* Presets */}
        <Card className="p-5 lg:col-span-2 animate-fade-up">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-bold text-neutral-900">Presets</h2>
            {!isPremium && <Badge color="neutral">4 free • 9 premium</Badge>}
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {FREE_PRESETS.map((p) => (
              <PresetButton key={p.id} label={p.label} desc={p.description} selected={preset === p.id} locked={false} onClick={() => setPreset(p.id)} />
            ))}
            {PREMIUM_PRESETS.map((p) => (
              <PresetButton
                key={p.id}
                label={p.label}
                desc={p.description}
                selected={preset === p.id}
                locked={!isPremium}
                onClick={() => setPreset(p.id)}
              />
            ))}
          </div>

          <div className="mt-4 flex items-start gap-2 text-xs text-neutral-500 bg-neutral-50 rounded-lg p-3">
            <Info size={14} className="mt-0.5 text-orange-500 flex-shrink-0" />
            <span>Presets tune the base profile. Premium presets add pro-grade drag-shot and headshot sub-tuning.</span>
          </div>

          <Button full className="mt-4" onClick={generate} loading={generating}>
            <RefreshCw size={16} /> {generating ? 'Generating...' : 'Generate Sensitivity'}
          </Button>
        </Card>

        {/* Output */}
        <div className="lg:col-span-3 space-y-5">
          {presetLocked ? (
            <PremiumLock
              title="Premium preset"
              description={`The "${ALL_PRESETS.find((p) => p.id === preset)?.label}" preset is a premium preset.`}
              features={['Pro-grade drag-shot tuning', 'Headshot optimization', 'Custom sensitivity adjustments', 'Unlimited saved profiles']}
            />
          ) : (
            <>
              <Card className="p-6 animate-fade-up">
                <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 text-white">
                      <Crosshair size={20} />
                    </span>
                    <div>
                      <h2 className="font-display font-bold text-neutral-900">Your sensitivity</h2>
                      <p className="text-xs text-neutral-500">
                        {device ? deviceSummary(device) : 'Detecting device...'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isPremium && <PremiumBadge />}
                    <Badge color="green">
                      <CheckCircle2 size={12} /> {result?.confidence ?? 0}% confidence
                    </Badge>
                  </div>
                </div>

                <div className="space-y-3">
                  {rows.map((r) => {
                    const v = result?.values[r.key] ?? 0;
                    return (
                      <div key={r.key}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="font-medium text-neutral-700">{r.label}</span>
                          <span className="font-bold text-neutral-900 tabular-nums">{v}</span>
                        </div>
                        <div className="h-2.5 rounded-full bg-neutral-100 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-orange-400 to-orange-600 transition-all duration-500"
                            style={{ width: `${Math.min(100, v / 2)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {result?.notes && result.notes.length > 0 && (
                  <div className="mt-4 rounded-lg bg-orange-50 border border-orange-100 p-3 space-y-1.5">
                    {result.notes.map((n) => (
                      <div key={n} className="flex items-start gap-2 text-xs text-orange-800">
                        <Info size={12} className="mt-0.5 flex-shrink-0" /> {n}
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <Button variant="outline" size="sm" onClick={generate} loading={generating}>
                    <RefreshCw size={14} /> Again
                  </Button>
                  <Button variant="outline" size="sm" onClick={copy}>
                    {copied ? <><CheckCircle2 size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
                  </Button>
                  <Button variant="outline" size="sm" onClick={save}>
                    {saved ? <><CheckCircle2 size={14} /> Saved</> : <><Save size={14} /> Save</>}
                  </Button>
                  <Button variant="outline" size="sm" onClick={generateImage}>
                    <Download size={14} /> Image
                  </Button>
                </div>

                {saveError && (
                  <div className="mt-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-2.5">
                    {saveError}{' '}
                    <button onClick={() => navigate('premium')} className="font-semibold underline">Unlock Premium</button>
                  </div>
                )}
              </Card>

              {showImage && imagePreview && (
                <Card className="p-5 animate-scale-in">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-display font-bold text-neutral-900 flex items-center gap-2">
                      <Eye size={16} /> Sensitivity card
                    </h3>
                    <Button variant="ghost" size="sm" onClick={() => setShowImage(false)}>Close</Button>
                  </div>
                  <div className="rounded-xl overflow-hidden border border-neutral-200 bg-neutral-50">
                    <img src={imagePreview} alt="Sensitivity card" className="w-full" />
                  </div>
                  <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <Button variant="primary" size="sm" onClick={downloadImage}><Download size={14} /> Download PNG</Button>
                    <Button variant="outline" size="sm" onClick={shareImage}>Share</Button>
                    <Button variant="outline" size="sm" onClick={copy}><Copy size={14} /> Copy settings</Button>
                  </div>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function PresetButton({
  label, desc, selected, locked, onClick,
}: {
  label: string; desc: string; selected: boolean; locked: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative text-left rounded-xl border p-3 transition btn-press ${
        selected
          ? 'border-orange-500 bg-orange-50 ring-2 ring-orange-200'
          : 'border-neutral-200 bg-white hover:border-orange-300'
      }`}
    >
      {locked && (
        <span className="absolute top-2 right-2 inline-flex items-center gap-0.5 text-amber-600">
          <Crown size={12} />
        </span>
      )}
      <div className={`font-semibold text-sm ${selected ? 'text-orange-700' : 'text-neutral-900'}`}>{label}</div>
      <div className="text-[11px] text-neutral-500 mt-0.5 leading-snug">{desc}</div>
    </button>
  );
}
