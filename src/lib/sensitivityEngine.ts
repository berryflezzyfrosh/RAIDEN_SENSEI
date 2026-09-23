import type { DeviceInfo, UserInputs, SensitivityResult, PlayStyle, PerformanceTier, ConfigFactor } from './types';
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

interface StyleProfile {
  general: number;
  scope: number;
  sniper: number;
  freeLook: number;
  fire: number;
  aimStyle: string;
  dragStyle: string;
  recommendedStyle: string;
}

function getStyleProfile(style: PlayStyle): StyleProfile {
  const profiles: Record<PlayStyle, StyleProfile> = {
    aggressive: { general: 1.15, scope: 1.05, sniper: 0.9, freeLook: 1.2, fire: 1.1, aimStyle: 'Fast-Flick', dragStyle: 'Quick Drag', recommendedStyle: 'Aggressive Rush' },
    headshot:   { general: 0.95, scope: 0.9, sniper: 0.85, freeLook: 1.0, fire: 0.95, aimStyle: 'Micro-Flick', dragStyle: 'Two-Finger Drag', recommendedStyle: 'Headshot Aim' },
    dragshot:   { general: 1.1, scope: 1.0, sniper: 0.95, freeLook: 1.15, fire: 1.05, aimStyle: 'Drag-Flick', dragStyle: 'One-Finger Drag', recommendedStyle: 'Drag Headshot' },
    closerange: { general: 1.2, scope: 0.95, sniper: 0.8, freeLook: 1.1, fire: 1.15, aimStyle: 'Hip-Fire Drag', dragStyle: 'Quick Drag', recommendedStyle: 'Close Combat' },
    longrange:  { general: 0.9, scope: 0.85, sniper: 0.95, freeLook: 0.9, fire: 0.9, aimStyle: 'Steady Aim', dragStyle: 'Controlled Drag', recommendedStyle: 'Long Range' },
    sniper:     { general: 0.85, scope: 0.8, sniper: 0.7, freeLook: 0.85, fire: 0.85, aimStyle: 'Precision Tap', dragStyle: 'Slow Precision Drag', recommendedStyle: 'Sniper Precision' },
    custom:     { general: 1.0, scope: 1.0, sniper: 1.0, freeLook: 1.0, fire: 1.0, aimStyle: 'Steady Aim', dragStyle: 'Controlled Drag', recommendedStyle: 'Custom' },
    balanced:   { general: 1.0, scope: 1.0, sniper: 1.0, freeLook: 1.0, fire: 1.0, aimStyle: 'Steady Aim', dragStyle: 'Controlled Drag', recommendedStyle: 'Balanced' },
  };
  return profiles[style];
}

export function generateSensitivity(
  device: DeviceInfo,
  inputs: UserInputs
): SensitivityResult {
  const tier = getDevicePerformanceTier(device);
  const style = getStyleProfile(inputs.playStyle);
  const factors: ConfigFactor[] = [];

  // --- Screen factor ---
  // Larger physical screens need slightly lower sensitivity for equivalent control.
  // We approximate screen size from resolution and pixel ratio.
  const screenDiagonalPx = Math.sqrt(device.screenWidth ** 2 + device.screenHeight ** 2);
  const approxPhysicalDiagonal = screenDiagonalPx / (device.pixelRatio * 160);
  const screenFactor = Math.max(0.92, Math.min(1.08, 5.5 / Math.max(approxPhysicalDiagonal, 3)));
  factors.push({
    name: 'Screen Size',
    value: `${device.screenWidth}×${device.screenHeight} (${approxPhysicalDiagonal.toFixed(1)}")`,
    impact: 'high',
  });

  // --- Pixel ratio / DPI factor ---
  let userDpi = 0;
  if (inputs.dpi) userDpi = parseInt(inputs.dpi, 10) || 0;
  const estimatedDpi = Math.round(device.pixelRatio * 160);
  const effectiveDpi = userDpi || estimatedDpi;
  const dpiFactor = Math.max(0.9, Math.min(1.1, 400 / Math.max(effectiveDpi, 200)));
  factors.push({
    name: 'Pixel Density',
    value: `${device.pixelRatio.toFixed(1)}x (~${effectiveDpi} DPI)`,
    impact: 'high',
  });

  // --- Touch factor ---
  const touchFactor = device.touchSupported ? 1.0 : 0.85;
  factors.push({
    name: 'Touch Support',
    value: device.touchSupported ? `Yes (${device.maxTouchPoints} points)` : 'No',
    impact: 'high',
  });

  // --- Refresh rate factor ---
  let refreshRate = device.refreshRate;
  if (!refreshRate && inputs.refreshRate) {
    refreshRate = parseInt(inputs.refreshRate, 10) || null;
  }
  const refreshFactor = refreshRate && refreshRate >= 90 ? 1.03 : refreshRate && refreshRate >= 60 ? 1.0 : 0.97;
  if (refreshRate) {
    factors.push({ name: 'Refresh Rate', value: `${refreshRate} Hz`, impact: 'medium' });
  }

  // --- Performance tier ---
  const tierBase: Record<PerformanceTier, number> = { Low: 85, Mid: 90, High: 95, Ultra: 98 };
  factors.push({
    name: 'Performance Tier',
    value: `${tier} (${device.hardwareConcurrency ?? '?'} cores, ${device.deviceMemory ?? '?'}GB)`,
    impact: 'high',
  });

  // --- RAM factor ---
  let ramFactor = 1.0;
  if (inputs.ram) {
    const ram = parseInt(inputs.ram, 10) || 0;
    if (ram >= 8) ramFactor = 1.03;
    else if (ram >= 4) ramFactor = 1.0;
    else if (ram >= 2) ramFactor = 0.95;
    else ramFactor = 0.9;
    factors.push({ name: 'RAM', value: `${ram} GB`, impact: 'medium' });
  }

  // --- FPS factor ---
  let fpsFactor = 1.0;
  if (inputs.fpsSetting) {
    const fps = parseInt(inputs.fpsSetting, 10) || 0;
    if (fps >= 90) fpsFactor = 1.05;
    else if (fps >= 60) fpsFactor = 1.02;
    else if (fps >= 40) fpsFactor = 1.0;
    else fpsFactor = 0.95;
    factors.push({ name: 'FPS Target', value: `${fps} FPS`, impact: 'medium' });
  }

  // --- Device seed for deterministic variation ---
  const seed = hashString(
    device.deviceName + device.os + device.screenWidth + 'x' + device.screenHeight + device.pixelRatio
  );
  const seedNoise = ((seed % 100) / 100 - 0.5) * 4;

  // --- Composite base ---
  const base = tierBase[tier];
  const composite = base * screenFactor * refreshFactor * dpiFactor * ramFactor * fpsFactor * touchFactor;

  // --- Sensitivity values ---
  const general = clamp(composite * style.general + seedNoise, 50, 100);
  const redDot = clamp(composite * 0.88 * style.scope + seedNoise * 0.5, 40, 100);
  const scope2x = clamp(composite * 0.82 * style.scope + seedNoise * 0.4, 35, 100);
  const scope4x = clamp(composite * 0.72 * style.scope + seedNoise * 0.3, 30, 95);
  const sniper = clamp(composite * 0.55 * style.sniper + seedNoise * 0.2, 20, 90);
  const freeLook = clamp(composite * 1.05 * style.freeLook + seedNoise * 0.6, 50, 100);

  // --- Fire button ---
  const fireBase = device.touchSupported ? 55 : 45;
  const fireButtonSize = clamp(fireBase * style.fire + seedNoise * 0.3, 30, 100);

  // --- DPI recommendation ---
  const dpiRec = device.touchSupported
    ? clamp(Math.round(effectiveDpi * 0.9), 280, 620)
    : clamp(Math.round(effectiveDpi * 0.8), 240, 480);

  // --- FPS recommendation ---
  const fpsRec = tier === 'Ultra' ? 90 : tier === 'High' ? 65 : tier === 'Mid' ? 45 : 30;

  // --- Graphics recommendation ---
  const graphicsRec =
    tier === 'Ultra' ? 'Ultra' :
    tier === 'High' ? 'Standard' :
    'Smooth';

  // --- Confidence ---
  let confidence = 72;
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

  // --- Explanation ---
  const explanationParts: string[] = [];
  explanationParts.push(`adjusted for your ${approxPhysicalDiagonal.toFixed(1)}" screen`);
  if (device.touchSupported) explanationParts.push('touch capability');
  if (refreshRate) explanationParts.push(`${refreshRate}Hz refresh rate`);
  explanationParts.push(`${tier.toLowerCase()} performance profile`);
  explanationParts.push(`${inputs.playStyle} play style`);
  const explanation = `Your configuration was ${explanationParts.join(', ')}.`;

  factors.push({ name: 'Play Style', value: inputs.playStyle, impact: 'high' });

  return {
    deviceName: inputs.phoneModel || inputs.phoneBrand || device.deviceName,
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
    aimStyle: style.aimStyle,
    dragStyle: style.dragStyle,
    confidence,
    performanceProfile: tier,
    touchProfile,
    recommendedStyle: style.recommendedStyle,
    explanation,
    factors,
    playStyle: inputs.playStyle,
    generatedAt: Date.now(),
  };
}
