import { useState } from 'react';
import { useAuth } from '../features/auth/AuthProvider';
import { ApiError, authApi } from '../features/auth/auth.api';

export function SiteHeader() {
  const { user, loading, setUser } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function logout() {
    setBusy(true); setError('');
    try { await authApi.logout(); setUser(null); window.location.hash = '/login'; }
    catch (error: unknown) {
      if (error instanceof ApiError && error.status === 401) { setUser(null); window.location.hash = '/login'; }
      else setError(error instanceof Error ? error.message : 'Deconectarea a eșuat.');
    } finally { setBusy(false); }
  }
  return <>
    <header className="site-header">
      <a href="#/" aria-label="SpaceShare — acasă" className="flex items-center gap-3 text-xl font-semibold tracking-tight text-forest"><span className="brand-mark"><span /><span /></span>SpaceShare<span className="text-lime">.</span></a>
      <nav aria-label="Navigare principală" className="flex flex-wrap items-center justify-end gap-4 text-sm">
        <a href="#/" className="nav-link hidden sm:block">Acasă</a>
        {loading ? <span className="text-stone-500 text-xs" role="status">Se verifică sesiunea…</span> : user ? <>
          <a href="#/profile" className="nav-link">Profilul meu</a>
          <button type="button" className="secondary-button" disabled={busy} onClick={logout}>{busy ? 'Se deconectează…' : 'Deconectare'}</button>
        </> : <><a href="#/login" className="nav-link">Autentificare</a><a href="#/register" className="primary-button">Creează cont</a></>}
      </nav>
    </header>
    {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
  </>;
}
