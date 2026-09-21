import type { SensitivityResult, UserInputs } from './types';

const RESULT_KEY = 'raiden_sensei_result';
const INPUTS_KEY = 'raiden_sensei_inputs';
const THEME_KEY = 'raiden_sensei_theme';

export function saveResult(result: SensitivityResult): void {
  try {
    localStorage.setItem(RESULT_KEY, JSON.stringify(result));
  } catch {
    // localStorage may be unavailable
  }
}

export function loadResult(): SensitivityResult | null {
  try {
    const data = localStorage.getItem(RESULT_KEY);
    if (!data) return null;
    return JSON.parse(data) as SensitivityResult;
  } catch {
    return null;
  }
}

export function saveInputs(inputs: UserInputs): void {
  try {
    localStorage.setItem(INPUTS_KEY, JSON.stringify(inputs));
  } catch {
    // ignore
  }
}

export function loadInputs(): UserInputs | null {
  try {
    const data = localStorage.getItem(INPUTS_KEY);
    if (!data) return null;
    return JSON.parse(data) as UserInputs;
  } catch {
    return null;
  }
}

export function clearAllData(): void {
  try {
    localStorage.removeItem(RESULT_KEY);
    localStorage.removeItem(INPUTS_KEY);
    localStorage.removeItem(THEME_KEY);
  } catch {
    // ignore
  }
}

export function hasStoredData(): boolean {
  try {
    return localStorage.getItem(RESULT_KEY) !== null || localStorage.getItem(INPUTS_KEY) !== null;
  } catch {
    return false;
  }
}
