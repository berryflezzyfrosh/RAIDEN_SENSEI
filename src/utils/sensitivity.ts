import type { DeviceInfo, Preset, SensitivityValues } from '@/types';
import { deviceSummary } from '@/utils/device';

// Deterministic sensitivity algorithm. Uses device characteristics + preset to derive
// values in the 0-200 range (Free Fire sensitivity scale). Not random — same inputs
// produce the same outputs. Adjusts based on touch support, screen size, CPU, preset.

function clamp(v: number, lo = 0, hi = 200): number {
  return Math.max(lo, Math.min(hi, Math.round(v)));
}

// Preset base profiles (general, red_dot, 2x, 4x, sniper, free_look)
const PRESET_BASE: Record<Preset, SensitivityValues> = {
  balanced:       { general: 95, red_dot: 90, scope_2x: 85, scope_4x: 75, sniper_scope: 55, free_look: 80 },
  aggressive:     { general: 120, red_dot: 115, scope_2x: 105, scope_4x: 90, sniper_scope: 60, free_look: 100 },
  headshot:       { general: 105, red_dot: 100, scope_2x: 92, scope_4x: 78, sniper_scope: 50, free_look: 85 },
  close_range:    { general: 130, red_dot: 125, scope_2x: 110, scope_4x: 85, sniper_scope: 45, free_look: 110 },
  pro_headshot:   { general: 110, red_dot: 108, scope_2x: 95, scope_4x: 80, sniper_scope: 52, free_look: 88 },
  pro_drag_shot:  { general: 140, red_dot: 135, scope_2x: 120, scope_4x: 95, sniper_scope: 58, free_look: 115 },
  competitive:    { general: 100, red_dot: 98, scope_2x: 90, scope_4x: 80, sniper_scope: 60, free_look: 85 },
  rush:           { general: 145, red_dot: 140, scope_2x: 125, scope_4x: 95, sniper_scope: 50, free_look: 120 },
  one_tap:        { general: 90, red_dot: 95, scope_2x: 88, scope_4x: 78, sniper_scope: 65, free_look: 80 },
  sniper:         { general: 75, red_dot: 80, scope_2x: 78, scope_4x: 72, sniper_scope: 70, free_look: 70 },
  close_combat:   { general: 135, red_dot: 130, scope_2x: 115, scope_4x: 90, sniper_scope: 48, free_look: 112 },
  long_range:     { general: 78, red_dot: 82, scope_2x: 80, scope_4x: 75, sniper_scope: 68, free_look: 72 },
  custom_pro:     { general: 100, red_dot: 100, scope_2x: 92, scope_4x: 80, sniper_scope: 60, free_look: 90 },
};

// Device-derived modifiers
function deviceFactor(d: DeviceInfo): {
  speed: number; // higher = faster tracking
  precision: number; // higher = more stable scopes
} {
  const isMobile = d.deviceType === 'Mobile';
  const isTablet = d.deviceType === 'Tablet';
  const screen = Math.max(d.screenWidth, d.screenHeight);
  const touch = d.touchSupport ? 1 : 0;
  const cores = d.cpuCores ?? 4;

  // Larger screens + touch → faster movement needed; lower cores → less overhead budget.
  const speed =
    (isMobile ? 1.08 : isTablet ? 1.02 : 0.92) *
    (screen > 2400 ? 1.05 : screen > 1080 ? 1.0 : 0.96) *
    (touch ? 1.04 : 0.98) *
    (cores >= 8 ? 1.03 : cores >= 4 ? 1.0 : 0.97);
  const precision =
    (isMobile ? 0.95 : isTablet ? 1.0 : 1.08) *
    (screen > 2400 ? 0.98 : 1.0) *
    (cores >= 8 ? 1.04 : 1.0);
  return { speed, precision };
}

export interface GenResult {
  values: SensitivityValues;
  confidence: number;
  notes: string[];
}

export function generateSensitivity(
  preset: Preset,
  device: DeviceInfo,
  isPremium: boolean,
): GenResult {
  const base = PRESET_BASE[preset] ?? PRESET_BASE.balanced;
  const { speed, precision } = deviceFactor(device);
  const notes: string[] = [];

  // Premium applies tighter, more aggressive tuning + sub-precision adjustments.
  const premiumBoost = isPremium ? 1.06 : 1.0;
  const premiumScopeBoost = isPremium ? 1.05 : 1.0;

  const v: SensitivityValues = {
    general: clamp(base.general * speed * premiumBoost),
    red_dot: clamp(base.red_dot * speed * premiumBoost),
    scope_2x: clamp(base.scope_2x * speed * premiumScopeBoost),
    scope_4x: clamp(base.scope_4x * precision * premiumScopeBoost),
    sniper_scope: clamp(base.sniper_scope * precision * premiumScopeBoost),
    free_look: clamp(base.free_look * speed * premiumBoost),
  };

  // Confidence: higher when device signals are richer.
  let conf = 70;
  if (device.cpuCores) conf += 6;
  if (device.memory) conf += 5;
  if (device.touchSupport) conf += 4;
  if (device.pixelRatio > 1) conf += 3;
  if (isPremium) conf += 8;
  conf = Math.min(98, conf);

  if (device.deviceType === 'Mobile') notes.push('Mobile tuning applied for one-handed grip.');
  if (device.touchSupport) notes.push('Touch acceleration factored into tracking speeds.');
  if ((device.cpuCores ?? 0) >= 8) notes.push('High-core device — precision scope boost applied.');
  if (isPremium) notes.push('Premium engine: drag-shot and headshot sub-tuning enabled.');

  return { values: v, confidence: conf, notes };
}

export function formatSensitivityRow(label: string, value: number): string {
  return `${label}: ${value}`;
}

export function sensitivityToText(values: SensitivityValues, preset: string, device: DeviceInfo): string {
  const lines = [
    `Free Fire Sensitivity — ${preset}`,
    `Device: ${deviceSummary(device)}`,
    `General: ${values.general}`,
    `Red Dot: ${values.red_dot}`,
    `2x Scope: ${values.scope_2x}`,
    `4x Scope: ${values.scope_4x}`,
    `Sniper Scope: ${values.sniper_scope}`,
    `Free Look: ${values.free_look}`,
    `Generated by RΛIDΞN 亗`,
  ];
  return lines.join('\n');
}
