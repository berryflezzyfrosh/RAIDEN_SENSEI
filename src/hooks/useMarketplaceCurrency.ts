import { useEffect, useMemo, useState } from 'react';

interface ExchangeRateResponse {
  result?: string;
  rates?: Record<string, number>;
  time_last_update_unix?: number;
}

interface CountryResponse {
  country_name?: string;
  currency?: string;
}

interface CachedRates {
  savedAt: number;
  rates: Record<string, number>;
}

interface CachedCountry {
  savedAt: number;
  name: string;
  currency: string;
}

const RATES_CACHE = 'raiden-marketplace-rates-v1';
const COUNTRY_CACHE = 'raiden-marketplace-country-v1';
const RATE_CACHE_MS = 12 * 60 * 60 * 1000;
const COUNTRY_CACHE_MS = 24 * 60 * 60 * 1000;

const FALLBACK_CURRENCY_OPTIONS = [
  ['NGN', 'Nigerian naira'], ['GHS', 'Ghanaian cedi'], ['KES', 'Kenyan shilling'],
  ['ZAR', 'South African rand'], ['GMD', 'Gambian dalasi'], ['XOF', 'West African CFA franc'],
  ['XAF', 'Central African CFA franc'], ['UGX', 'Ugandan shilling'], ['TZS', 'Tanzanian shilling'],
  ['USD', 'US dollar'], ['CAD', 'Canadian dollar'], ['GBP', 'British pound'], ['EUR', 'Euro'],
  ['INR', 'Indian rupee'], ['AED', 'UAE dirham'], ['SAR', 'Saudi riyal'], ['AUD', 'Australian dollar'],
  ['JPY', 'Japanese yen'], ['BRL', 'Brazilian real'],
] as const;

interface CurrencyDisplayNames {
  of(code: string): string | undefined;
}

const intlWithCurrencyCatalog = Intl as typeof Intl & {
  supportedValuesOf?: (key: 'currency') => string[];
  DisplayNames?: new (locales: string | string[] | undefined, options: { type: 'currency' }) => CurrencyDisplayNames;
};

function getCurrencyOptions(): readonly (readonly [string, string])[] {
  let codes: string[];
  try {
    codes = intlWithCurrencyCatalog.supportedValuesOf?.call(Intl, 'currency')
      ?? FALLBACK_CURRENCY_OPTIONS.map(([code]) => code);
  } catch {
    codes = FALLBACK_CURRENCY_OPTIONS.map(([code]) => code);
  }

  const displayNames = intlWithCurrencyCatalog.DisplayNames
    ? new intlWithCurrencyCatalog.DisplayNames(undefined, { type: 'currency' })
    : null;
  return codes.map((code) => [code, displayNames?.of(code) ?? FALLBACK_CURRENCY_OPTIONS.find(([fallbackCode]) => fallbackCode === code)?.[1] ?? code] as const);
}

export const CURRENCY_OPTIONS = getCurrencyOptions();

function readCache<T>(key: string): T | null {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) as T : null;
  } catch {
    return null;
  }
}

export function useMarketplaceCurrency() {
  const [currency, setCurrency] = useState('NGN');
  const [countryName, setCountryName] = useState('Nigeria');
  const [rates, setRates] = useState<Record<string, number>>({ NGN: 1 });
  const [ratesReady, setRatesReady] = useState(false);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    const loadRates = async () => {
      const cached = readCache<CachedRates>(RATES_CACHE);
      if (cached && Date.now() - cached.savedAt < RATE_CACHE_MS) {
        if (active) { setRates(cached.rates); setRatesReady(true); }
        return;
      }
      try {
        const response = await fetch('https://open.er-api.com/v6/latest/NGN', { signal: controller.signal });
        if (!response.ok) throw new Error('Exchange rates are unavailable.');
        const data = await response.json() as ExchangeRateResponse;
        if (data.result !== 'success' || !data.rates) throw new Error('Exchange rates are unavailable.');
        const next = { ...data.rates, NGN: 1 };
        if (!active) return;
        setRates(next);
        setRatesReady(true);
        localStorage.setItem(RATES_CACHE, JSON.stringify({ savedAt: Date.now(), rates: next } satisfies CachedRates));
      } catch {
        if (active && cached) { setRates(cached.rates); setRatesReady(true); }
      }
    };

    const loadCountry = async () => {
      const cached = readCache<CachedCountry>(COUNTRY_CACHE);
      if (cached && Date.now() - cached.savedAt < COUNTRY_CACHE_MS) {
        if (active) { setCountryName(cached.name); setCurrency(cached.currency); }
        return;
      }
      try {
        const response = await fetch('https://ipapi.co/json/', { signal: controller.signal });
        if (!response.ok) return;
        const data = await response.json() as CountryResponse;
        const detectedCurrency = data.currency?.toUpperCase();
        if (!active || !detectedCurrency || !/^[A-Z]{3}$/.test(detectedCurrency)) return;
        const next = { savedAt: Date.now(), name: data.country_name || 'your country', currency: detectedCurrency };
        setCountryName(next.name);
        setCurrency(next.currency);
        localStorage.setItem(COUNTRY_CACHE, JSON.stringify(next satisfies CachedCountry));
      } catch {
        if (active) setCountryName('Nigeria');
      }
    };

    void Promise.all([loadRates(), loadCountry()]);
    return () => { active = false; controller.abort(); };
  }, []);

  const currencyLabel = useMemo(() => CURRENCY_OPTIONS.find(([code]) => code === currency)?.[1] ?? currency, [currency]);
  const hasCurrencyRate = currency === 'NGN' || Boolean(ratesReady && rates[currency] && Number.isFinite(rates[currency]));
  const formatNaira = (amount: number) => {
    const rate = rates[currency];
    if (currency === 'NGN' || !rate || !Number.isFinite(rate)) {
      return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(amount);
    }
    return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount * rate);
  };

  return { currency, setCurrency, currencyLabel, countryName, ratesReady, hasCurrencyRate, formatNaira };
}