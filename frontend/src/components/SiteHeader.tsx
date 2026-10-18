import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../features/auth/AuthProvider';
import { ApiError, authApi } from '../features/auth/auth.api';
import { NotificationsMenu } from '../features/notifications/NotificationsMenu';

export function SiteHeader() {
  const { user, loading, setUser } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuPanelRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!menuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();
    const closeOnKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        menuButtonRef.current?.focus();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = menuPanelRef.current?.querySelectorAll<HTMLElement>('a[href], button:not(:disabled)');
      if (!focusable?.length) return;
      const first = focusable.item(0);
      const last = focusable.item(focusable.length - 1);
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    const closeOnNavigate = () => setMenuOpen(false);
    window.addEventListener('keydown', closeOnKeyDown);
    window.addEventListener('hashchange', closeOnNavigate);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnKeyDown);
      window.removeEventListener('hashchange', closeOnNavigate);
    };
  }, [menuOpen]);
  function closeMenu() {
    setMenuOpen(false);
    menuButtonRef.current?.focus();
  }
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
        <div className="site-header-actions">
          {user && !loading && <NotificationsMenu />}
          <div className="site-menu">
            <button ref={menuButtonRef} type="button" className="site-menu-trigger" aria-expanded={menuOpen} aria-controls="site-page-menu" onClick={() => setMenuOpen((open) => !open)}>
              <span aria-hidden="true" className="site-menu-icon"><i /><i /><i /></span><span>{loading ? 'Se verifică…' : 'Meniu'}</span><span aria-hidden="true" className="site-menu-chevron">{menuOpen ? '−' : '+'}</span>
            </button>
          </div>
        </div>
      </header>
      {menuOpen && <div className="site-menu-overlay">
        <button type="button" className="site-menu-backdrop" aria-label="Închide meniul" onClick={closeMenu} />
        <aside ref={menuPanelRef} id="site-page-menu" className="site-menu-panel" role="dialog" aria-modal="true" aria-labelledby="site-menu-title">
          <div className="site-menu-heading">
            <div>
              <p className="site-menu-caption">SPACESHARE</p>
              <h2 id="site-menu-title">Pagini disponibile</h2>
            </div>
            <button ref={closeButtonRef} type="button" className="site-menu-close" aria-label="Închide meniul" onClick={closeMenu}>×</button>
          </div>
          <nav aria-label="Pagini disponibile" className="site-menu-nav">
              {loading ? <p className="session-status" role="status">Se verifică sesiunea…</p> : user ? (
                <>
                  <a className="site-menu-link" href="#/" onClick={closeMenu}>Acasă</a>
                  <p className="site-menu-caption">CONTUL MEU</p>
                  <a className="site-menu-link" href="#/dashboard" onClick={closeMenu}>Panou</a>
                  <a className="site-menu-link" href="#/resources" onClick={closeMenu}>Resurse</a>
                  <a className="site-menu-link" href="#/bookings" onClick={closeMenu}>Rezervări</a>
                  {user.role === 'ADMIN' && <><p className="site-menu-caption">ADMINISTRARE</p><a className="site-menu-link" href="#/admin/resources" onClick={closeMenu}>Gestionare resurse</a></>}
                  <a className="site-menu-link" href="#/profile" onClick={closeMenu}>Profilul meu</a>
                  <div className="site-menu-divider" />
                  <button type="button" className="site-menu-logout" disabled={busy} onClick={() => { closeMenu(); void logout(); }}>{busy ? 'Se deconectează…' : 'Deconectare'} <span aria-hidden="true">↗</span></button>
                </>
              ) : (
                <>
                  <p className="site-menu-caption">BUN VENIT</p>
                  <a className="site-menu-link" href="#/" onClick={closeMenu}>Acasă</a>
                  <a className="site-menu-link" href="#/login" onClick={closeMenu}>Autentificare</a>
                  <a className="site-menu-link" href="#/register" onClick={closeMenu}>Creează cont</a>
                </>
              )}
          </nav>
        </aside>
      </div>}
      {error && <p role="alert" className="form-feedback error mt-4">{error}</p>}
    </>
  );
}
