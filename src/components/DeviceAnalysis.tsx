import { useEffect, useState } from 'react';
import { Cpu, Smartphone, Monitor, Zap, TouchpadIcon, RefreshCw, Info } from 'lucide-react';
import type { DeviceInfo } from '@/lib/types';
import { detectDevice, getDevicePerformanceTier } from '@/lib/deviceDetection';

export function DeviceAnalysis({ onGenerate }: { onGenerate: () => void }) {
  const [device, setDevice] = useState<DeviceInfo | null>(null);

  useEffect(() => {
    setDevice(detectDevice());
  }, []);

  if (!device) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="animate-spin text-raiden-neon" size={32} />
      </div>
    );
  }

  const tier = getDevicePerformanceTier(device);
  const tierColor =
    tier === 'Ultra' ? '#00ff9d' :
    tier === 'High' ? '#00e5ff' :
    tier === 'Mid' ? '#ffb800' : '#ff3b5c';

  const rows: { label: string; value: string; available: boolean; icon: typeof Cpu }[] = [
    { label: 'Device', value: device.deviceName, available: device.deviceName !== 'Unknown Device', icon: Smartphone },
    { label: 'Operating System', value: `${device.os} ${device.osVersion}`.trim(), available: device.os !== 'Unknown', icon: Cpu },
    { label: 'Browser', value: `${device.browser} ${device.browserVersion}`.trim(), available: device.browser !== 'Unknown', icon: Monitor },
    { label: 'Screen Resolution', value: `${device.screenWidth} × ${device.screenHeight}`, available: true, icon: Monitor },
    { label: 'Pixel Ratio', value: device.pixelRatio.toFixed(1), available: true, icon: Zap },
    { label: 'Color Depth', value: `${device.colorDepth}-bit`, available: true, icon: Monitor },
    { label: 'Touch Support', value: device.touchSupported ? `Supported (${device.maxTouchPoints} points)` : 'Not Supported', available: true, icon: TouchpadIcon },
    { label: 'CPU Cores', value: device.hardwareConcurrency ? `${device.hardwareConcurrency} cores` : 'Not exposed by browser', available: device.hardwareConcurrency !== null, icon: Cpu },
    { label: 'Device Memory', value: device.deviceMemory ? `${device.deviceMemory} GB` : 'Not exposed by browser', available: device.deviceMemory !== null, icon: Cpu },
    { label: 'Orientation', value: device.orientation, available: true, icon: Smartphone },
    { label: 'Refresh Rate', value: device.refreshRate ? `${device.refreshRate} Hz` : 'Not exposed by browser', available: device.refreshRate !== null, icon: RefreshCw },
    { label: 'Connection', value: device.connection, available: device.connection !== 'unknown', icon: Zap },
  ];

  return (
    <section id="device" className="relative px-4 py-20">
      <div className="mx-auto max-w-4xl">
        <div className="mb-12 text-center">
          <h2 className="section-title">Device Analysis</h2>
          <p className="mt-3 font-body text-sm text-raiden-muted sm:text-base">
            Automatically detected from your browser — no personal data collected
          </p>
        </div>

        {/* Profile banner */}
        <div className="glass-strong mb-6 rounded-2xl p-6">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div>
              <p className="font-display text-xs font-bold tracking-widest text-raiden-muted">
                RECOMMENDED PROFILE
              </p>
              <p className="mt-1 font-display text-2xl font-black tracking-wider" style={{ color: tierColor }}>
                {tier} Performance
              </p>
            </div>
            <div
              className="flex h-16 w-16 items-center justify-center rounded-2xl"
              style={{ background: `${tierColor}15`, border: `1px solid ${tierColor}40` }}
            >
              <Zap size={32} style={{ color: tierColor }} />
            </div>
          </div>
        </div>

        {/* Device info grid */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {rows.map((row) => (
            <div
              key={row.label}
              className="glass flex items-center gap-3 rounded-xl p-4"
            >
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-raiden-card">
                <row.icon size={18} className="text-raiden-neon" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-display text-[10px] font-bold tracking-widest text-raiden-muted">
                  {row.label.toUpperCase()}
                </p>
                <p className={`truncate font-body text-sm ${row.available ? 'text-raiden-text' : 'text-raiden-muted italic'}`}>
                  {row.value}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Info note */}
        <div className="mt-6 flex items-start gap-3 rounded-xl border border-raiden-border bg-raiden-card/50 p-4">
          <Info size={16} className="mt-0.5 flex-shrink-0 text-raiden-neon" />
          <p className="font-body text-xs leading-relaxed text-raiden-muted">
            Some device information isn't available through your browser for privacy reasons.
            You can enter the missing information manually in the generator for a more precise calculation.
          </p>
        </div>

        {/* Generate button */}
        <div className="mt-8 text-center">
          <button onClick={onGenerate} className="btn-primary">
            <Zap size={18} />
            Generate My Sensei
          </button>
        </div>
      </div>
    </section>
  );
}
