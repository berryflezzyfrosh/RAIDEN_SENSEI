export type PlayStyle =
  | 'balanced'
  | 'aggressive'
  | 'headshot'
  | 'dragshot'
  | 'closerange'
  | 'longrange'
  | 'sniper'
  | 'custom';

export type PerformanceTier = 'Low' | 'Mid' | 'High' | 'Ultra';

export type CodeStatus = 'new' | 'active' | 'expired' | 'unknown';

export interface DeviceInfo {
  os: string;
  osVersion: string;
  browser: string;
  browserVersion: string;
  deviceType: 'mobile' | 'tablet' | 'desktop';
  deviceName: string;
  screenWidth: number;
  screenHeight: number;
  pixelRatio: number;
  touchSupported: boolean;
  hardwareConcurrency: number | null;
  deviceMemory: number | null;
  orientation: string;
  refreshRate: number | null;
  colorDepth: number;
  maxTouchPoints: number;
  connection: string;
  language: string;
  platform: string;
  userAgent: string;
}

export interface UserInputs {
  phoneBrand: string;
  phoneModel: string;
  ram: string;
  storage: string;
  refreshRate: string;
  dpi: string;
  osVersion: string;
  graphicsSetting: string;
  fpsSetting: string;
  currentSensitivity: string;
  playStyle: PlayStyle;
}

export interface ConfigFactor {
  name: string;
  value: string;
  impact: 'high' | 'medium' | 'low';
}

export interface SensitivityResult {
  deviceName: string;
  profile: PerformanceTier;
  general: number;
  redDot: number;
  scope2x: number;
  scope4x: number;
  sniper: number;
  freeLook: number;
  fireButtonSize: number;
  dpiRecommendation: number;
  fpsRecommendation: number;
  graphicsRecommendation: string;
  aimStyle: string;
  dragStyle: string;
  confidence: number;
  performanceProfile: PerformanceTier;
  touchProfile: string;
  recommendedStyle: string;
  explanation: string;
  factors: ConfigFactor[];
  playStyle: PlayStyle;
  generatedAt: number;
}

export interface RedeemCode {
  code: string;
  reward: string;
  source: string;
  sourceUrl: string;
  retrievedAt: string;
  status: CodeStatus;
  expiresAt: string | null;
  region?: string;
}

export const PLAY_STYLES: { value: PlayStyle; label: string; description: string; icon: string }[] = [
  { value: 'balanced', label: 'Balanced', description: 'All-round balanced configuration', icon: 'scale' },
  { value: 'aggressive', label: 'Aggressive', description: 'Fast reflexes, high sensitivity', icon: 'swords' },
  { value: 'headshot', label: 'Headshot', description: 'Precision aim control', icon: 'target' },
  { value: 'dragshot', label: 'Drag Shot', description: 'Drag headshot optimization', icon: 'move' },
  { value: 'closerange', label: 'Close Range', description: 'Close-quarters combat', icon: 'flame' },
  { value: 'longrange', label: 'Long Range', description: 'Distant engagements', icon: 'eye' },
  { value: 'sniper', label: 'Sniper', description: 'Sniper scope precision', icon: 'crosshair' },
  { value: 'custom', label: 'Custom', description: 'Manual fine-tuning', icon: 'sliders' },
];

export const GRAPHICS_OPTIONS = ['Auto', 'Smooth', 'Standard', 'Ultra'];
export const FPS_OPTIONS = ['30', '40', '45', '60', '90', '120'];
