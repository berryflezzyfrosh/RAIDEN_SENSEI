import type { RedeemCode } from './types';

export async function fetchRedeemCodes(): Promise<RedeemCode[]> {
  try {
    const res = await fetch('./data/redeem-codes.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data.codes)) throw new Error('Invalid data format');
    return data.codes as RedeemCode[];
  } catch {
    return [];
  }
}
