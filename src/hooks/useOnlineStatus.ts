import { useState, useEffect, useCallback } from 'react';

export type ConnectionStatus = 'checking' | 'online' | 'offline';

const DATA_URL = './data/redeem-codes.json';

async function checkReachability(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(DATA_URL, { method: 'GET', cache: 'no-cache', signal: controller.signal });
    clearTimeout(timeout);
    return res.ok || res.status === 405 || res.status === 404;
  } catch {
    return false;
  }
}

export function useOnlineStatus() {
  const [status, setStatus] = useState<ConnectionStatus>('checking');

  const runCheck = useCallback(async () => {
    setStatus('checking');
    if (!navigator.onLine) { setStatus('offline'); return; }
    const reachable = await checkReachability();
    setStatus(reachable ? 'online' : 'offline');
  }, []);

  useEffect(() => {
    runCheck();
    const on = () => runCheck();
    const off = () => setStatus('offline');
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, [runCheck]);

  return { status, isOnline: status === 'online', isChecking: status === 'checking', retry: runCheck };
}
