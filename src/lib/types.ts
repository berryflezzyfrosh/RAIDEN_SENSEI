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
}

export interface RedeemCode {
  code: string;
  reward: string;
  source: string;
  sourceUrl: string;
  retrievedAt: string;
  status: CodeStatus;
  expiresAt: string | null;
}

export const PLAY_STYLES: { value: PlayStyle; label: string; description: string }[] = [
  { value: 'balanced', label: 'Balanced', description: 'All-round balanced configuration' },
  { value: 'aggressive', label: 'Aggressive', description: 'Fast reflexes, high sensitivity' },
  { value: 'headshot', label: 'Headshot-Focused', description: 'Precision aim control' },
  { value: 'dragshot', label: 'Drag Shot', description: 'Drag headshot optimization' },
  { value: 'closerange', label: 'Close Range', description: 'Close-quarters combat' },
  { value: 'longrange', label: 'Long Range', description: 'Distant engagements' },
  { value: 'sniper', label: 'Sniper', description: 'Sniper scope precision' },
  { value: 'custom', label: 'Custom', description: 'Manual fine-tuning' },
];

export const GRAPHICS_OPTIONS = ['Auto', 'Smooth', 'Standard', 'Ultra'];
export const FPS_OPTIONS = ['30', '40', '45', '60', '90', '120'];
