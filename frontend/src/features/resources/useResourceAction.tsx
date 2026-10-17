import { useState } from 'react';
import { ApiError } from '../../lib/http';
import { useAuth } from '../auth/AuthProvider';

export function useResourceAction() {
  const { setUser } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  async function run<T>(operation: () => Promise<T>, success = '') {
    setBusy(true); setError(''); setMessage('');
    try {
      const value = await operation();
      setMessage(success);
      return { ok: true as const, value };
    } catch (error: unknown) {
      if (error instanceof ApiError && error.status === 401) setUser(null);
      setError(error instanceof Error ? error.message : 'Operația nu a putut fi finalizată.');
      return { ok: false as const };
    } finally { setBusy(false); }
  }
  return { busy, error, message, run };
}

export function ActionFeedback({ error, message }: { error: string; message: string }) {
  return <>{error && <p className="form-feedback error" role="alert">{error}</p>}{message && <p className="form-feedback success" role="status">{message}</p>}</>;
}
