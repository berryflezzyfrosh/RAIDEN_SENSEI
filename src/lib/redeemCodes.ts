import type { RedeemCode } from './types';

export interface RedeemCodeResponse {
  codes: RedeemCode[];
  lastUpdated: string;
  source: string;
  note?: string;
}

export interface FetchResult {
  codes: RedeemCode[];
  lastUpdated: string;
  fromCache: boolean;
  error: boolean;
}

const CACHE_KEY = 'raiden_sensei_codes_cache';
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

export async function fetchRedeemCodes(): Promise<FetchResult> {
  try {
    const res = await fetch('./data/redeem-codes.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data: RedeemCodeResponse = await res.json();
    if (!Array.isArray(data.codes)) throw new Error('Invalid data format');

    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        codes: data.codes,
        lastUpdated: data.lastUpdated,
        cachedAt: Date.now(),
      }));
    } catch {
      // ignore cache write failure
    }

    return {
      codes: data.codes,
      lastUpdated: data.lastUpdated,
      fromCache: false,
      error: false,
    };
  } catch {
    // Try cache
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached) as { codes: RedeemCode[]; lastUpdated: string; cachedAt: number };
        if (Date.now() - parsed.cachedAt < CACHE_TTL) {
          return {
            codes: parsed.codes,
            lastUpdated: parsed.lastUpdated,
            fromCache: true,
            error: false,
          };
        }
      }
    } catch {
      // ignore cache read failure
    }
    return { codes: [], lastUpdated: '', fromCache: false, error: true };
  }
}

export function clearCodeCache(): void {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    // ignore
  }
}
