import { useEffect, type ReactNode } from 'react';
import { useAuth } from '../features/auth/AuthProvider';
import { SiteLayout } from './SiteLayout';

export function RequireAccess({ admin = false, children }: { admin?: boolean; children: ReactNode }) {
  const { user, loading, error, retry } = useAuth();
  useEffect(() => {
    if (!loading && !error && !user) window.location.hash = '/login';
  }, [loading, error, user]);
  if (loading || !user || (admin && user.role !== 'ADMIN')) {
    return <SiteLayout mainClassName="catalog-page">
      {loading ? <p role="status">Se verifică sesiunea…</p> : error ? <><p role="alert" className="form-feedback error">{error}</p><button className="secondary-button mt-5" onClick={retry}>Încearcă din nou</button></> : !user ? <p role="status">Se deschide autentificarea…</p> : <><h1 className="page-title">Acces restricționat.</h1><p className="small-note mt-4">Această pagină este disponibilă administratorilor.</p><a href="#/resources" className="back-link mt-5 inline-block">← Înapoi la resurse</a></>}
    </SiteLayout>;
  }
  return children;
}
