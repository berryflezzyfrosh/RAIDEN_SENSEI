import type { DeviceInfo, UserInputs, SensitivityResult, PlayStyle, PerformanceTier } from './types';
import { getDevicePerformanceTier } from './deviceDetection';

function clamp(v: number, min: number, max: number): number {
  return Math.round(Math.max(min, Math.min(max, v)));
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function playStyleMultiplier(style: PlayStyle): {
  general: number;
  scope: number;
  sniper: number;
  freeLook: number;
  fire: number;
} {
  switch (style) {
    case 'aggressive': return { general: 1.15, scope: 1.05, sniper: 0.9, freeLook: 1.2, fire: 1.1 };
    case 'headshot':   return { general: 0.95, scope: 0.9, sniper: 0.85, freeLook: 1.0, fire: 0.95 };
    case 'dragshot':   return { general: 1.1, scope: 1.0, sniper: 0.95, freeLook: 1.15, fire: 1.05 };
    case 'closerange': return { general: 1.2, scope: 0.95, sniper: 0.8, freeLook: 1.1, fire: 1.15 };
    case 'longrange':  return { general: 0.9, scope: 0.85, sniper: 0.95, freeLook: 0.9, fire: 0.9 };
    case 'sniper':     return { general: 0.85, scope: 0.8, sniper: 0.7, freeLook: 0.85, fire: 0.85 };
    case 'custom':     return { general: 1.0, scope: 1.0, sniper: 1.0, freeLook: 1.0, fire: 1.0 };
    default:           return { general: 1.0, scope: 1.0, sniper: 1.0, freeLook: 1.0, fire: 1.0 };
  }
}

export function generateSensitivity(
  device: DeviceInfo,
  inputs: UserInputs
): SensitivityResult {
  const tier = getDevicePerformanceTier(device);
  const styleMul = playStyleMultiplier(inputs.playStyle);

  // Base sensitivity from device characteristics
  const screenDiagonal = Math.sqrt(
    device.screenWidth ** 2 + device.screenHeight ** 2
  );
  const pixelDensity = (device.pixelRatio * 160) / 3.0; // approx DPI estimate
  const touchFactor = device.touchSupported ? 1.0 : 0.85;

  // Performance-based base
  const tierBase: Record<PerformanceTier, number> = {
    Low: 85,
    Mid: 90,
    High: 95,
    Ultra: 98,
  };

  // Seed from device identity for consistency
  const seed = hashString(
    device.deviceName + device.os + device.screenWidth + device.screenHeight + device.pixelRatio
  );
  const seedNoise = ((seed % 100) / 100 - 0.5) * 6; // ±3 noise

  // Screen size factor: larger screens → slightly lower general sens
  const screenFactor = Math.max(0.92, Math.min(1.08, 1080 / Math.max(device.screenWidth, 400)));

  // Refresh rate factor
  let refreshRate = device.refreshRate;
  if (!refreshRate && inputs.refreshRate) {
    refreshRate = parseInt(inputs.refreshRate, 10) || null;
  }
  const refreshFactor = refreshRate && refreshRate >= 90 ? 1.03 : refreshRate && refreshRate >= 60 ? 1.0 : 0.97;

  // DPI factor
  let userDpi = 0;
  if (inputs.dpi) userDpi = parseInt(inputs.dpi, 10) || 0;
  const effectiveDpi = userDpi || Math.round(pixelDensity * device.pixelRatio);
  const dpiFactor = Math.max(0.9, Math.min(1.1, 400 / Math.max(effectiveDpi, 200)));

  // RAM factor
  let ramFactor = 1.0;
  if (inputs.ram) {
    const ram = parseInt(inputs.ram, 10) || 0;
    if (ram >= 8) ramFactor = 1.03;
    else if (ram >= 4) ramFactor = 1.0;
    else if (ram >= 2) ramFactor = 0.95;
    else ramFactor = 0.9;
  }

  // FPS factor
  let fpsFactor = 1.0;
  if (inputs.fpsSetting) {
    const fps = parseInt(inputs.fpsSetting, 10) || 0;
    if (fps >= 90) fpsFactor = 1.05;
    else if (fps >= 60) fpsFactor = 1.02;
    else if (fps >= 40) fpsFactor = 1.0;
    else fpsFactor = 0.95;
  }

  const base = tierBase[tier];
  const composite = base * screenFactor * refreshFactor * dpiFactor * ramFactor * fpsFactor * touchFactor;

  const general = clamp(composite * styleMul.general + seedNoise, 50, 100);
  const redDot = clamp(composite * 0.88 * styleMul.scope + seedNoise * 0.5, 40, 100);
  const scope2x = clamp(composite * 0.82 * styleMul.scope + seedNoise * 0.4, 35, 100);
  const scope4x = clamp(composite * 0.72 * styleMul.scope + seedNoise * 0.3, 30, 95);
  const sniper = clamp(composite * 0.55 * styleMul.sniper + seedNoise * 0.2, 20, 90);
  const freeLook = clamp(composite * 1.05 * styleMul.freeLook + seedNoise * 0.6, 50, 100);

  // Fire button size
  const fireBase = device.touchSupported ? 55 : 45;
  const fireButtonSize = clamp(fireBase * styleMul.fire + seedNoise * 0.3, 30, 100);

  // DPI recommendation
  const dpiRec = device.touchSupported
    ? clamp(Math.round(effectiveDpi * 0.9), 280, 620)
    : clamp(Math.round(effectiveDpi * 0.8), 240, 480);

  // FPS recommendation
  const fpsRec = tier === 'Ultra' ? 90 : tier === 'High' ? 65 : tier === 'Mid' ? 45 : 30;

  // Graphics recommendation
  const graphicsRec =
    tier === 'Ultra' ? 'Ultra' :
    tier === 'High' ? 'Standard' :
    tier === 'Mid' ? 'Smooth' : 'Smooth';

  // Aim and drag style
  const aimStyle =
    inputs.playStyle === 'sniper' ? 'Precision Tap' :
    inputs.playStyle === 'headshot' ? 'Micro-Flick' :
    inputs.playStyle === 'dragshot' ? 'Drag-Flick' :
    inputs.playStyle === 'aggressive' ? 'Fast-Flick' :
    inputs.playStyle === 'closerange' ? 'Hip-Fire Drag' :
    'Steady Aim';

  const dragStyle =
    inputs.playStyle === 'dragshot' ? 'One-Finger Drag' :
    inputs.playStyle === 'headshot' ? 'Two-Finger Drag' :
    inputs.playStyle === 'aggressive' ? 'Quick Drag' :
    inputs.playStyle === 'sniper' ? 'Slow Precision Drag' :
    'Controlled Drag';

  // Confidence score
  let confidence = 75;
  if (device.hardwareConcurrency) confidence += 5;
  if (device.deviceMemory) confidence += 5;
  if (device.touchSupported) confidence += 4;
  if (inputs.phoneBrand) confidence += 3;
  if (inputs.ram) confidence += 3;
  if (inputs.refreshRate) confidence += 3;
  if (inputs.dpi) confidence += 3;
  if (inputs.playStyle !== 'balanced') confidence += 2;
  confidence = clamp(confidence, 50, 99);

  const touchProfile =
    device.maxTouchPoints >= 10 ? 'Fast' :
    device.maxTouchPoints >= 5 ? 'Standard' :
    device.maxTouchPoints >= 1 ? 'Basic' : 'N/A';

  const recommendedStyle =
    inputs.playStyle === 'sniper' ? 'Sniper Precision' :
    inputs.playStyle === 'dragshot' ? 'Drag Headshot' :
    inputs.playStyle === 'headshot' ? 'Headshot Aim' :
    inputs.playStyle === 'aggressive' ? 'Aggressive Rush' :
    inputs.playStyle === 'closerange' ? 'Close Combat' :
    inputs.playStyle === 'longrange' ? 'Long Range' :
    'Balanced';

  return {
    deviceName: inputs.phoneModel || device.deviceName,
    profile: tier,
    general,
    redDot,
    scope2x,
    scope4x,
    sniper,
    freeLook,
    fireButtonSize,
    dpiRecommendation: dpiRec,
    fpsRecommendation: fpsRec,
    graphicsRecommendation: graphicsRec,
    aimStyle,
    dragStyle,
    confidence,
    performanceProfile: tier,
    touchProfile,
    recommendedStyle,
  };
}
