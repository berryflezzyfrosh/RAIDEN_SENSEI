import { useEffect, useState } from 'react';
import { Smartphone, Monitor, Tablet, Cpu, MemoryStick, Touchpad, RotateCw, Wifi, Globe, CheckCircle2 } from 'lucide-react';
import { Card, Badge, Button } from '@/components/ui';
import { PremiumLock } from '@/components/PremiumLock';
import { detectDevice, deviceSummary, recommendedPlayStyle } from '@/utils/device';
import { useAuth } from '@/hooks/useAuth';
import { navigate } from '@/hooks/useRouter';
import type { DeviceInfo } from '@/types';

export function DevicePage() {
  const { isPremium } = useAuth();
  const [device, setDevice] = useState<DeviceInfo | null>(null);

  useEffect(() => {
    setDevice(detectDevice());
  }, []);

  if (!device) return null;

  const DeviceIcon = device.deviceType === 'Mobile' ? Smartphone : device.deviceType === 'Tablet' ? Tablet : Monitor;

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10">
      <header className="text-center mb-8 animate-fade-up">
        <Badge color="orange">Device Analysis</Badge>
        <h1 className="mt-3 font-display text-3xl sm:text-4xl font-bold text-neutral-900">
          Your <span className="text-gradient-orange">device profile</span>
        </h1>
        <p className="mt-2 text-neutral-500 max-w-xl mx-auto text-sm">
          Real information read from your browser. We don't invent specs — only what your device actually exposes.
        </p>
      </header>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Summary card */}
        <Card className="p-6 lg:col-span-1 animate-fade-up">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/30">
              <DeviceIcon size={26} />
            </span>
            <div>
              <div className="font-display font-bold text-neutral-900 text-lg">{device.deviceType}</div>
              <div className="text-xs text-neutral-500">{device.os}</div>
            </div>
          </div>
          <dl className="mt-5 space-y-3 text-sm">
            <Row label="Browser" value={device.browser} />
            <Row label="Platform" value={device.platform || '—'} />
            <Row label="Language" value={device.language} />
            <Row label="Online" value={device.online ? 'Yes' : 'No'} />
          </dl>
          <div className="mt-5 pt-5 border-t border-neutral-100">
            <div className="text-xs uppercase tracking-wide text-neutral-400 font-semibold">Summary</div>
            <div className="mt-1 text-sm text-neutral-700">{deviceSummary(device)}</div>
          </div>
        </Card>

        {/* Technical details */}
        <Card className="p-6 lg:col-span-2 animate-fade-up" >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-neutral-900">Technical details</h2>
            <Badge color="green"><CheckCircle2 size={12} /> Real data</Badge>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Metric icon={<Monitor size={16} />} label="Screen" value={`${device.screenWidth} × ${device.screenHeight} px`} />
            <Metric icon={<Smartphone size={16} />} label="Pixel ratio" value={`${device.pixelRatio}x`} />
            <Metric icon={<RotateCw size={16} />} label="Orientation" value={device.orientation} />
            <Metric icon={<Touchpad size={16} />} label="Touch support" value={device.touchSupport ? 'Yes' : 'No'} />
            <Metric icon={<Touchpad size={16} />} label="Max touch points" value={String(device.maxTouchPoints)} />
            <Metric icon={<Cpu size={16} />} label="CPU logical cores" value={device.cpuCores != null ? String(device.cpuCores) : 'Not available'} />
            <Metric icon={<MemoryStick size={16} />} label="Device memory" value={device.memory != null ? `${device.memory} GB` : 'Not available'} />
            <Metric icon={<Wifi size={16} />} label="Connection" value={device.online ? 'Online' : 'Offline'} />
          </div>
          <div className="mt-5 rounded-xl bg-neutral-50 border border-neutral-100 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-neutral-500 uppercase tracking-wide">
              <Globe size={14} /> User-Agent
            </div>
            <p className="mt-1.5 text-xs text-neutral-600 break-all font-mono leading-relaxed">{device.userAgent}</p>
          </div>
        </Card>

        {/* Recommendations */}
        <Card className="p-6 lg:col-span-3 animate-fade-up">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="font-display font-bold text-neutral-900">Recommended play style</h2>
              <p className="text-sm text-neutral-500 mt-0.5">Based on your device type and screen.</p>
            </div>
            <Badge color="orange">{recommendedPlayStyle(device)}</Badge>
          </div>

          {isPremium ? (
            <div className="mt-5 grid sm:grid-cols-3 gap-4">
              <RecCard title="Sensitivity profile" body="A balanced-to-aggressive profile suits your device — tuned further in the generator." />
              <RecCard title="Frame budget" body={device.cpuCores && device.cpuCores >= 8 ? 'High-core CPU detected — high-precision scopes can run smoother.' : 'Mid-range CPU — avoid max graphics for stable FPS.'} />
              <RecCard title="Touch handling" body={device.touchSupport ? 'Touch acceleration is factored into your sensitivity values.' : 'Mouse/trackpad detected — precision-biased scope tuning applied.'} />
            </div>
          ) : (
            <div className="mt-5">
              <PremiumLock
                title="Advanced device recommendations"
                description="Premium device analysis gives detailed sensitivity, frame-budget, and play-style recommendations tailored to your hardware."
                features={[
                  'Recommended sensitivity profile for your device',
                  'Frame-budget and performance recommendations',
                  'Touch/mouse tuning strategy',
                  'Detailed confidence score',
                ]}
              />
            </div>
          )}
        </Card>

        <div className="lg:col-span-3 flex justify-center">
          <Button variant="primary" onClick={() => navigate('sensitivity')}>
            Use this device to generate sensitivity
          </Button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-neutral-500">{label}</dt>
      <dd className="font-medium text-neutral-900 text-right">{value}</dd>
    </div>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-3.5">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-500 uppercase tracking-wide">
        {icon} {label}
      </div>
      <div className="mt-1 text-sm font-semibold text-neutral-900">{value}</div>
    </div>
  );
}

function RecCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl bg-gradient-to-br from-orange-50 to-white border border-orange-100 p-4">
      <div className="font-semibold text-neutral-900 text-sm">{title}</div>
      <p className="mt-1 text-xs text-neutral-600 leading-relaxed">{body}</p>
    </div>
  );
}
