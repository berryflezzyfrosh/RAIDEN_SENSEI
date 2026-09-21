import type { DeviceInfo } from './types';

function parseOS(ua: string): { os: string; version: string } {
  if (/Windows NT 10/.test(ua)) return { os: 'Windows', version: '10/11' };
  if (/Windows NT/.test(ua)) return { os: 'Windows', version: '' };
  if (/Android ([\d.]+)/.test(ua)) {
    const m = ua.match(/Android ([\d.]+)/);
    return { os: 'Android', version: m ? m[1] : '' };
  }
  if (/iPhone|iPad|iPod/.test(ua)) {
    const m = ua.match(/OS (\d+[_]\d+)?/);
    return { os: 'iOS', version: m ? m[1].replace(/_/g, '.') : '' };
  }
  if (/Mac OS X ([\d_]+)/.test(ua)) {
    const m = ua.match(/Mac OS X ([\d_]+)/);
    return { os: 'macOS', version: m ? m[1].replace(/_/g, '.') : '' };
  }
  if (/Linux/.test(ua)) return { os: 'Linux', version: '' };
  if (/CrOS/.test(ua)) return { os: 'ChromeOS', version: '' };
  return { os: 'Unknown', version: '' };
}

function parseBrowser(ua: string): { browser: string; version: string } {
  if (/Edg\/([\d.]+)/.test(ua)) {
    const m = ua.match(/Edg\/([\d.]+)/);
    return { browser: 'Edge', version: m ? m[1].split('.')[0] : '' };
  }
  if (/OPR\/([\d.]+)/.test(ua)) {
    const m = ua.match(/OPR\/([\d.]+)/);
    return { browser: 'Opera', version: m ? m[1].split('.')[0] : '' };
  }
  if (/Chrome\/([\d.]+)/.test(ua) && !/Edg/.test(ua)) {
    const m = ua.match(/Chrome\/([\d.]+)/);
    return { browser: 'Chrome', version: m ? m[1].split('.')[0] : '' };
  }
  if (/Firefox\/([\d.]+)/.test(ua)) {
    const m = ua.match(/Firefox\/([\d.]+)/);
    return { browser: 'Firefox', version: m ? m[1].split('.')[0] : '' };
  }
  if (/Safari\/([\d.]+)/.test(ua) && !/Chrome/.test(ua)) {
    const m = ua.match(/Version\/([\d.]+)/);
    return { browser: 'Safari', version: m ? m[1].split('.')[0] : '' };
  }
  return { browser: 'Unknown', version: '' };
}

function detectDeviceName(ua: string): string {
  const androidModel = ua.match(/Android; [\w\s]*;?\s*([\w\s]+)\s*Build/i);
  if (androidModel && androidModel[1]) {
    return androidModel[1].trim();
  }
  if (/iPhone/.test(ua)) return 'iPhone';
  if (/iPad/.test(ua)) return 'iPad';
  if (/Macintosh/.test(ua)) return 'Mac';
  if (/Windows/.test(ua)) return 'Windows PC';
  if (/Linux/.test(ua)) return 'Linux PC';
  if (/CrOS/.test(ua)) return 'Chromebook';
  return 'Unknown Device';
}

function detectDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  const ua = navigator.userAgent;
  if (/iPad|Tablet/.test(ua) || (/Android/.test(ua) && !/Mobile/.test(ua))) return 'tablet';
  if (/iPhone|Android.*Mobile|Mobile/.test(ua)) return 'mobile';
  return 'desktop';
}

export function detectDevice(): DeviceInfo {
  const ua = navigator.userAgent;
  const osInfo = parseOS(ua);
  const browserInfo = parseBrowser(ua);
  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { effectiveType?: string };
  };

  return {
    os: osInfo.os,
    osVersion: osInfo.version,
    browser: browserInfo.browser,
    browserVersion: browserInfo.version,
    deviceType: detectDeviceType(),
    deviceName: detectDeviceName(ua),
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    pixelRatio: window.devicePixelRatio || 1,
    touchSupported: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
    hardwareConcurrency: navigator.hardwareConcurrency || null,
    deviceMemory: nav.deviceMemory ?? null,
    orientation: window.screen.orientation?.type || (window.innerHeight > window.innerWidth ? 'portrait' : 'landscape'),
    refreshRate: null,
    colorDepth: window.screen.colorDepth || 24,
    maxTouchPoints: navigator.maxTouchPoints || 0,
    connection: nav.connection?.effectiveType || 'unknown',
    language: navigator.language || 'en',
    platform: navigator.platform || 'unknown',
    userAgent: ua,
  };
}

export function getDevicePerformanceTier(info: DeviceInfo): 'Low' | 'Mid' | 'High' | 'Ultra' {
  let score = 0;

  if (info.hardwareConcurrency) {
    if (info.hardwareConcurrency >= 8) score += 3;
    else if (info.hardwareConcurrency >= 4) score += 2;
    else if (info.hardwareConcurrency >= 2) score += 1;
  }

  if (info.deviceMemory) {
    if (info.deviceMemory >= 8) score += 3;
    else if (info.deviceMemory >= 4) score += 2;
    else if (info.deviceMemory >= 2) score += 1;
  }

  const totalPixels = info.screenWidth * info.screenHeight;
  if (totalPixels >= 2000000) score += 2;
  else if (totalPixels >= 1000000) score += 1;

  if (info.pixelRatio >= 3) score += 1;

  if (info.touchSupported) score += 1;

  if (info.connection === '4g') score += 1;

  if (score >= 8) return 'Ultra';
  if (score >= 5) return 'High';
  if (score >= 3) return 'Mid';
  return 'Low';
}
