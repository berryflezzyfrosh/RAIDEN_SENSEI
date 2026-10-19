import type { Preset, PresetMeta } from '@/types';

export const FREE_PRESETS: PresetMeta[] = [
  {
    id: 'balanced',
    label: 'Balanced',
    description: 'All-round stability for any situation.',
    premium: false,
    icon: 'Scale',
  },
  {
    id: 'aggressive',
    label: 'Aggressive',
    description: 'Fast tracking for rush gameplay.',
    premium: false,
    icon: 'Swords',
  },
  {
    id: 'headshot',
    label: 'Headshot Focused',
    description: 'Tuned for vertical recoil control.',
    premium: false,
    icon: 'Crosshair',
  },
  {
    id: 'close_range',
    label: 'Close Range',
    description: 'Snappy ADS for close-quarters fights.',
    premium: false,
    icon: 'Zap',
  },
];

export const PREMIUM_PRESETS: PresetMeta[] = [
  { id: 'pro_headshot', label: 'Pro Headshot', description: 'Tournament-grade headshot tuning.', premium: true, icon: 'Crosshair' },
  { id: 'pro_drag_shot', label: 'Pro Drag Shot', description: 'Optimized for drag-headshot flicks.', premium: true, icon: 'Move' },
  { id: 'competitive', label: 'Competitive', description: 'Balanced for ranked climbs.', premium: true, icon: 'Trophy' },
  { id: 'rush', label: 'Rush', description: 'Maximum rotation speed.', premium: true, icon: 'Wind' },
  { id: 'one_tap', label: 'One-Tap', description: 'Single-shot precision tuning.', premium: true, icon: 'Target' },
  { id: 'sniper', label: 'Sniper', description: 'Long-range scoped stability.', premium: true, icon: 'Crosshair' },
  { id: 'close_combat', label: 'Close Combat', description: 'CQC tracking and flick.', premium: true, icon: 'Swords' },
  { id: 'long_range', label: 'Long Range', description: 'Distant target control.', premium: true, icon: 'Telescope' },
  { id: 'custom_pro', label: 'Custom Pro', description: 'Fully custom tuned profile.', premium: true, icon: 'SlidersHorizontal' },
];

export const ALL_PRESETS: PresetMeta[] = [...FREE_PRESETS, ...PREMIUM_PRESETS];

export function getPresetMeta(id: Preset): PresetMeta | undefined {
  return ALL_PRESETS.find((p) => p.id === id);
}

export function isPremiumPreset(id: Preset): boolean {
  return PREMIUM_PRESETS.some((p) => p.id === id);
}
