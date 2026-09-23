import { Cpu, Smartphone, Monitor, Zap, TouchpadIcon, RefreshCw, Info, Globe } from 'lucide-react';
import type { DeviceInfo } from '@/lib/types';
import { getDevicePerformanceTier } from '@/lib/deviceDetection';
import { DeviceSkeleton } from '@/components/ui/Skeleton';

interface Props {
  device: DeviceInfo | null;
  onGenerate: () => void;
}

export function DevicePage({ device, onGenerate }: Props) {
  if (!device) return <div className="px-4 py-8"><DeviceSkeleton /></div>;

  const tier = getDevicePerformanceTier(device);
  const tierColor = tier === 'Ultra' ? '#00ff9d' : tier === 'High' ? '#00e5ff' : tier === 'Mid' ? '#ffb800' : '#ff3b5c';

  const rows: { label: string; value: string; available: boolean; icon: typeof Cpu }[] = [
    { label: 'Device', value: device.deviceName, available: device.deviceName !== 'Unknown Device', icon: Smartphone },
    { label: 'Operating System', value: `${device.os} ${device.osVersion}`.trim(), available: device.os !== 'Unknown', icon: Cpu },
    { label: 'Browser', value: `${device.browser} ${device.browserVersion}`.trim(), available: device.browser !== 'Unknown', icon: Monitor },
    { label: 'Screen Resolution', value: `${device.screenWidth} × ${device.screenHeight}`, available: true, icon: Monitor },
    { label: 'Pixel Ratio', value: device.pixelRatio.toFixed(1), available: true, icon: Zap },
    { label: 'Color Depth', value: `${device.colorDepth}-bit`, available: true, icon: Monitor },
    { label: 'Touch Support', value: device.touchSupported ? `Supported (${device.maxTouchPoints} points)` : 'Not Supported', available: true, icon: TouchpadIcon },
    { label: 'CPU Cores', value: device.hardwareConcurrency ? `${device.hardwareConcurrency} cores` : 'Not available', available: device.hardwareConcurrency !== null, icon: Cpu },
    { label: 'Device Memory', value: device.deviceMemory ? `${device.deviceMemory} GB` : 'Not available', available: device.deviceMemory !== null, icon: Cpu },
    { label: 'Orientation', value: device.orientation, available: true, icon: Smartphone },
    { label: 'Refresh Rate', value: device.refreshRate ? `${device.refreshRate} Hz` : 'Not available', available: device.refreshRate !== null, icon: RefreshCw },
    { label: 'Connection', value: device.connection, available: device.connection !== 'unknown', icon: Globe },
  ];

  return (
    <div className="animate-fade-in px-4 py-8 pb-20 md:py-12">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <h2 className="section-title">Device Analysis</h2>
          <p className="section-subtitle">Automatically detected from your browser — no personal data collected</p>
        </div>

        {/* Profile banner */}
        <div className="mb-4 rounded-xl border border-raiden-border bg-raiden-surface p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-display text-[10px] font-bold tracking-widest text-raiden-muted">RECOMMENDED PROFILE</p>
              <p className="mt-1 font-display text-2xl font-black tracking-wider" style={{ color: tierColor }}>{tier} Performance</p>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-xl" style={{ background: `${tierColor}12`, border: `1px solid ${tierColor}30` }}>
              <Zap size={28} style={{ color: tierColor }} />
            </div>
          </div>
        </div>

        {/* Info grid */}
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {rows.map((row) => (
            <div key={row.label} className="flex items-center gap-3 rounded-lg border border-raiden-border bg-raiden-surface p-3.5">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-raiden-card">
                <row.icon size={16} className="text-raiden-neon" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-display text-[10px] font-bold tracking-widest text-raiden-muted">{row.label.toUpperCase()}</p>
                <p className={`truncate font-body text-sm ${row.available ? 'text-raiden-text' : 'text-raiden-dim italic'}`}>{row.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Info note */}
        <div className="mt-4 flex items-start gap-3 rounded-lg border border-raiden-border bg-raiden-card/50 p-3.5">
          <Info size={14} className="mt-0.5 flex-shrink-0 text-raiden-neon" />
          <p className="font-body text-xs leading-relaxed text-raiden-muted">Some device information isn't available through your browser for privacy reasons. You can enter the missing information manually in the generator for a more precise calculation.</p>
        </div>

        <div className="mt-6">
          <button onClick={onGenerate} className="btn-primary"><Zap size={18} />Generate My Sensei</button>
        </div>
      </div>
    </div>
  );
}
