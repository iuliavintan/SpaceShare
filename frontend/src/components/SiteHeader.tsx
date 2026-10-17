import { useState } from 'react';
import { useAuth } from '../features/auth/AuthProvider';
import { ApiError, authApi } from '../features/auth/auth.api';

export function SiteHeader() {
  const { user, loading, setUser } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function logout() {
    setBusy(true);
    setError('');
    try {
      await authApi.logout();
      setUser(null);
      window.location.hash = '/login';
    }
    catch (error: unknown) {
      if (error instanceof ApiError && error.status === 401) { setUser(null); window.location.hash = '/login'; }
      else setError(error instanceof Error ? error.message : 'Deconectarea a eșuat.');
    } finally { setBusy(false); }
  }
  return (
    <>
      <header className="site-header">
        <a href="#/" aria-label="SpaceShare — acasă" className="brand">
          <svg width="30" height="30" viewBox="0 0 32 32" fill="none" aria-hidden="true">
            <rect x="3" y="3" width="17" height="17" rx="3" stroke="currentColor" strokeWidth="2" />
            <rect x="12" y="12" width="17" height="17" rx="3" fill="var(--color-paper)" stroke="currentColor" strokeWidth="2" />
          </svg>
          <span>SpaceShare<span className="text-accent">.</span></span>
        </a>
        <a href="#/" className="site-motto">Spații comune. Idei mari.</a>
        <nav aria-label="Navigare principală" className="account-links">
          {loading ? <span className="session-status" role="status">Se verifică sesiunea…</span> : user ? (
            <>
              <a href="#/resources">Resurse</a>
              {user.role === 'ADMIN' && <a href="#/admin/resources">Administrare</a>}
              <a href="#/profile">Profilul meu</a>
              <button type="button" className="text-button" disabled={busy} onClick={logout}>
                {busy ? 'Se deconectează…' : 'Deconectare'} <span aria-hidden="true">↗</span>
              </button>
            </>
          ) : (
            <>
              <a href="#/login">Autentificare</a>
              <a href="#/register" className="primary-button">Creează cont <span aria-hidden="true">↗</span></a>
            </>
          )}
        </nav>
      </header>
      {error && <p role="alert" className="form-feedback error mt-4">{error}</p>}
    </>
  );
}
