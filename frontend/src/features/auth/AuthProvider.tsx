import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { ApiError, authApi } from './auth.api';
import type { AuthUser } from './auth.types';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  error: string;
  setUser: (user: AuthUser | null) => void;
  retry: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const updateUser = useCallback((value: AuthUser | null) => { setUser(value); setError(''); }, []);
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setLoading(true);
    setError('');
    authApi.me(controller.signal).then((value) => { if (active) setUser(value); }).catch((error: unknown) => {
      if (!active) return;
      setUser(null);
      if (!(error instanceof ApiError && error.status === 401)) setError(error instanceof Error ? error.message : 'Sesiunea nu a putut fi verificată.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; controller.abort(); };
  }, [attempt]);
  return <AuthContext.Provider value={{ user, loading, error, setUser: updateUser, retry: () => setAttempt((value) => value + 1) }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('AuthProvider lipsește.');
  return context;
}
