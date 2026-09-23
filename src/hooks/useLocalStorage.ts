import { useState, useEffect, useCallback } from 'react';
import type { SensitivityResult, UserInputs } from '@/lib/types';

const RESULT_KEY = 'raiden_sensei_result';
const INPUTS_KEY = 'raiden_sensei_inputs';
const SAVED_KEY = 'raiden_sensei_saved';

export function useLocalStorage() {
  const [result, setResult] = useState<SensitivityResult | null>(null);
  const [inputs, setInputs] = useState<UserInputs | null>(null);
  const [savedConfigs, setSavedConfigs] = useState<SensitivityResult[]>([]);

  useEffect(() => {
    try {
      const r = localStorage.getItem(RESULT_KEY); if (r) setResult(JSON.parse(r));
      const i = localStorage.getItem(INPUTS_KEY); if (i) setInputs(JSON.parse(i));
      const s = localStorage.getItem(SAVED_KEY); if (s) setSavedConfigs(JSON.parse(s));
    } catch { /* ignore */ }
  }, []);

  const saveResult = useCallback((r: SensitivityResult) => {
    try { localStorage.setItem(RESULT_KEY, JSON.stringify(r)); setResult(r); } catch { /* */ }
  }, []);

  const saveInputs = useCallback((i: UserInputs) => {
    try { localStorage.setItem(INPUTS_KEY, JSON.stringify(i)); setInputs(i); } catch { /* */ }
  }, []);

  const saveConfig = useCallback((r: SensitivityResult) => {
    setSavedConfigs((prev) => {
      const next = [r, ...prev.filter((p) => p.deviceName !== r.deviceName)].slice(0, 5);
      try { localStorage.setItem(SAVED_KEY, JSON.stringify(next)); } catch { /* */ }
      return next;
    });
  }, []);

  const removeConfig = useCallback((index: number) => {
    setSavedConfigs((prev) => {
      const next = prev.filter((_, i) => i !== index);
      try { localStorage.setItem(SAVED_KEY, JSON.stringify(next)); } catch { /* */ }
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    try { localStorage.removeItem(RESULT_KEY); localStorage.removeItem(INPUTS_KEY); localStorage.removeItem(SAVED_KEY); } catch { /* */ }
    setResult(null); setInputs(null); setSavedConfigs([]);
  }, []);

  const hasData = useCallback(() => {
    try {
      return localStorage.getItem(RESULT_KEY) !== null || localStorage.getItem(INPUTS_KEY) !== null || localStorage.getItem(SAVED_KEY) !== null;
    } catch { return false; }
  }, []);

  return { result, inputs, savedConfigs, saveResult, saveInputs, saveConfig, removeConfig, clearAll, hasData };
}
