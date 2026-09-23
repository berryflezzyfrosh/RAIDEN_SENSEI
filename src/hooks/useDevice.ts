import { useState, useEffect } from 'react';
import type { DeviceInfo } from '@/lib/types';
import { detectDevice } from '@/lib/deviceDetection';

export function useDevice(): DeviceInfo | null {
  const [device, setDevice] = useState<DeviceInfo | null>(null);
  useEffect(() => {
    setDevice(detectDevice());
    const h = () => setDevice(detectDevice());
    window.addEventListener('orientationchange', h);
    return () => window.removeEventListener('orientationchange', h);
  }, []);
  return device;
}
