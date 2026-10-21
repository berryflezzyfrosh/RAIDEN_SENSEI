export type AccountStatus = 'active' | 'suspended' | 'banned';
export type PremiumStatus = 'free' | 'premium' | 'expired';
export type PaymentStatus =
  | 'pending'
  | 'under_review'
  | 'verified'
  | 'rejected'
  | 'refunded'
  | 'expired';
export type PremiumPlan = 'weekly' | 'monthly' | 'yearly';

export interface UserProfile {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string;
  account_status: AccountStatus;
  premium_status: PremiumStatus;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
}

export interface AppConfig {
  premium_price: string;
  opay_bank: string;
  opay_account_name: string;
  opay_account_number: string;
}

export interface Payment {
  id: string;
  user_id: string;
  amount: number;
  plan: PremiumPlan | null;
  transaction_reference: string;
  status: PaymentStatus;
  review_note: string;
  created_at: string;
  verified_at: string | null;
  reviewed_at: string | null;
}

export interface PaymentReceipt {
  id: string;
  payment_id: string;
  storage_path: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  ocr_text: string;
  ocr_confidence: number;
  fraud_risk_score: number;
  fraud_flags: string[];
  created_at: string;
}

export interface SavedSensitivity {
  id: string;
  user_id: string;
  name: string;
  device: Record<string, unknown>;
  preset: string;
  values: SensitivityValues;
  confidence: number;
  is_premium: boolean;
  created_at: string;
}

export interface SensitivityValues {
  general: number;
  red_dot: number;
  scope_2x: number;
  scope_4x: number;
  sniper_scope: number;
  free_look: number;
}

export interface DeviceInfo {
  deviceType: string;
  os: string;
  browser: string;
  screenWidth: number;
  screenHeight: number;
  pixelRatio: number;
  touchSupport: boolean;
  cpuCores: number | null;
  memory: number | null;
  orientation: string;
  userAgent: string;
  maxTouchPoints: number;
  platform: string;
  language: string;
  online: boolean;
}

export type Preset =
  | 'balanced'
  | 'aggressive'
  | 'headshot'
  | 'close_range'
  | 'pro_headshot'
  | 'pro_drag_shot'
  | 'competitive'
  | 'rush'
  | 'one_tap'
  | 'sniper'
  | 'close_combat'
  | 'long_range'
  | 'custom_pro';

export interface PresetMeta {
  id: Preset;
  label: string;
  description: string;
  premium: boolean;
  icon: string;
}

export interface AdminUserRow {
  id: string;
  email: string;
  display_name: string;
  account_status: AccountStatus;
  premium_status: PremiumStatus;
  is_admin: boolean;
  created_at: string;
}

export interface AdminPaymentRow {
  id: string;
  user_id: string;
  amount: number;
  plan: PremiumPlan | null;
  purpose: 'premium' | 'hud';
  hud_listing_id: string | null;
  transaction_reference: string;
  status: PaymentStatus;
  review_note: string;
  created_at: string;
  verified_at: string | null;
  receipt_id: string | null;
  storage_path: string | null;
  file_name: string | null;
  mime_type: string | null;
  fraud_risk_score: number;
  fraud_flags: string[];
  ocr_text: string | null;
  ocr_confidence: number;
}

export interface AdminLogRow {
  id: string;
  user_id: string | null;
  event: string;
  metadata: Record<string, unknown>;
  created_at: string;
  kind: 'security' | 'admin';
}
