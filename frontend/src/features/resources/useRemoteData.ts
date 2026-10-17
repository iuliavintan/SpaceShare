import { useEffect, useState } from 'react';
import { ApiError } from '../../lib/http';
import { useAuth } from '../auth/AuthProvider';

export function useRemoteData<T>(load: (signal: AbortSignal) => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const { setUser } = useAuth();
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setLoading(true); setError('');
    load(controller.signal).then((result) => { if (active) setData(result); }).catch((error: unknown) => {
      if (!active) return;
      if (error instanceof ApiError && error.status === 401) setUser(null);
      setError(error instanceof Error ? error.message : 'Datele nu pot fi încărcate.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; controller.abort(); };
  }, [load, attempt, setUser]);
  return { data, error, loading, reload: () => setAttempt((value) => value + 1) };
}
