import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { AppConfig } from '@/types';

const DEFAULT_CONFIG: AppConfig = {
  premium_price: '2500',
  opay_bank: 'Opay',
  opay_account_name: 'Courage Barminas',
  opay_account_number: '8033240323',
};

export function useAppConfig() {
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error } = await supabase.from('app_config').select('key, value');
      if (error || !active) {
        setLoading(false);
        return;
      }
      const map: Record<string, string> = {};
      for (const row of data ?? []) map[row.key] = row.value;
      setConfig({
        premium_price: map.premium_price ?? DEFAULT_CONFIG.premium_price,
        opay_bank: map.opay_bank ?? DEFAULT_CONFIG.opay_bank,
        opay_account_name: map.opay_account_name ?? DEFAULT_CONFIG.opay_account_name,
        opay_account_number: map.opay_account_number ?? DEFAULT_CONFIG.opay_account_number,
      });
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  return { config, loading };
}
