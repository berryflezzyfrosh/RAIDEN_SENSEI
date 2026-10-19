import type { DeviceInfo } from '@/types';

function parseBrowser(ua: string): string {
  if (/Edg\//.test(ua)) return 'Microsoft Edge';
  if (/OPR\//.test(ua) || /Opera/.test(ua)) return 'Opera';
  if (/SamsungBrowser/.test(ua)) return 'Samsung Internet';
  if (/Chrome\//.test(ua) && !/Chromium/.test(ua)) return 'Google Chrome';
  if (/Firefox\//.test(ua)) return 'Mozilla Firefox';
  if (/Safari\//.test(ua) && !/Chrome/.test(ua)) return 'Safari';
  return 'Unknown Browser';
}

function parseOS(ua: string, platform: string): string {
  if (/Windows NT 10/.test(ua)) return 'Windows 10/11';
  if (/Windows NT/.test(ua)) return 'Windows';
  if (/Android/.test(ua)) {
    const m = ua.match(/Android\s([\d.]+)/);
    return m ? `Android ${m[1]}` : 'Android';
  }
  if (/iPhone|iPad|iPod/.test(ua)) {
    const m = ua.match(/OS\s([\d_]+)/);
    return m ? `iOS ${m[1].replace(/_/g, '.')}` : 'iOS';
  }
  if (/Mac OS X/.test(ua)) return 'macOS';
  if (/Linux/.test(ua)) return 'Linux';
  if (platform && platform.toLowerCase().includes('mac')) return 'macOS';
  return platform || 'Unknown OS';
}

function parseDeviceType(ua: string): string {
  if (/iPad|Tablet/.test(ua)) return 'Tablet';
  if (/Mobi|Android|iPhone|iPod/.test(ua)) return 'Mobile';
  return 'Desktop';
}

export function detectDevice(): DeviceInfo {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const platform = typeof navigator !== 'undefined' ? navigator.platform : '';
  const nav = navigator as Navigator & {
    deviceMemory?: number;
    hardwareConcurrency?: number;
  };
  const screen = window.screen;
  const orientation =
    (screen?.orientation && (screen.orientation as ScreenOrientation).type) ||
    (window.matchMedia?.('(orientation: portrait)').matches ? 'portrait' : 'landscape');

  return {
    deviceType: parseDeviceType(ua),
    os: parseOS(ua, platform),
    browser: parseBrowser(ua),
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    pixelRatio: window.devicePixelRatio || 1,
    touchSupport:
      'ontouchstart' in window || (navigator.maxTouchPoints ?? 0) > 0,
    cpuCores: nav.hardwareConcurrency ?? null,
    memory: nav.deviceMemory ?? null,
    orientation: String(orientation),
    userAgent: ua,
    maxTouchPoints: navigator.maxTouchPoints ?? 0,
    platform,
    language: navigator.language,
    online: navigator.onLine,
  };
}

export function deviceSummary(d: DeviceInfo): string {
  const parts = [d.deviceType, d.os, d.browser];
  return parts.filter(Boolean).join(' • ');
}

export function recommendedPlayStyle(d: DeviceInfo): string {
  if (d.deviceType === 'Mobile') return 'Mobile rush / close combat';
  if (d.deviceType === 'Tablet') return 'Hybrid all-round';
  return 'Precision / long range';
}
