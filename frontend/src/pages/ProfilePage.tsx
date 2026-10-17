import { useEffect, useState, type FormEvent } from 'react';
import { SiteLayout } from '../components/SiteLayout';
import { useAuth } from '../features/auth/AuthProvider';
import { ApiError, authApi } from '../features/auth/auth.api';
import type { AuthUser } from '../features/auth/auth.types';

function ProfileForm({ user }: { user: AuthUser }) {
  const { setUser } = useAuth();
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setSaved(false);
    try {
      const result = await authApi.updateProfile({ name, email });
      setUser(result);
      setName(result.name);
      setEmail(result.email);
      setSaved(true);
    } catch (error: unknown) {
      if (error instanceof ApiError && error.status === 401) setUser(null);
      else setError(error instanceof Error ? error.message : 'Modificările nu au putut fi salvate.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="form-panel" aria-labelledby="profile-title">
      <p className="eyebrow">PROFIL / DATE DE BAZĂ</p>
      <h2 id="profile-title">Informații personale<span>.</span></h2>
      <p className="form-description">Păstrează-ți datele la zi, într-un singur loc.</p>
      <form onSubmit={submit} aria-busy={busy}>
        <fieldset disabled={busy}>
          <label className="form-field">Nume complet
            <input name="name" autoComplete="name" required minLength={2} maxLength={80} value={name} onChange={(event) => { setName(event.target.value); setSaved(false); }} />
          </label>
          <label className="form-field">Adresa de email
            <input name="email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={(event) => { setEmail(event.target.value); setSaved(false); }} />
          </label>
          {error && <p role="alert" className="form-feedback error">{error}</p>}
          {saved && <p role="status" className="form-feedback success">Modificările au fost salvate.</p>}
          <button className="primary-button form-submit" type="submit">{busy ? 'Se salvează…' : 'Salvează modificările'} <span aria-hidden="true">↗</span></button>
        </fieldset>
      </form>
      <dl className="profile-details">
        <div><dt>Rol</dt><dd>{user.role === 'ADMIN' ? 'Administrator' : 'Utilizator'}</dd></div>
        <div><dt>Membru din</dt><dd>{new Date(user.createdAt).toLocaleDateString('ro-RO', { timeZone: 'Europe/Bucharest' })}</dd></div>
      </dl>
    </section>
  );
}

export function ProfilePage() {
  const { user, loading, error, retry } = useAuth();
  useEffect(() => {
    if (!loading && !user && !error) window.location.hash = '/login';
  }, [loading, user, error]);

  return (
    <SiteLayout mainClassName="account-layout">
      <aside className="account-intro">
        <p className="eyebrow">COMUNITATEA ÎNCEPE CU TINE</p>
        <h1>{user ? <>Salut,<br /><em>{user.name.split(' ')[0]}.</em></> : 'Profilul meu'}</h1>
        <p>Numele tău, datele tale. Un profil simplu, care te reprezintă.</p>
        <a className="back-link" href="#/">← Înapoi acasă</a>
        <div className="community-stamp" aria-hidden="true">S<span>Comunitate<br />universitară</span></div>
      </aside>
      {loading ? <p role="status" className="form-panel small-note">Se încarcă profilul…</p>
        : error ? <section className="form-panel"><p role="alert" className="form-feedback error">{error}</p><button type="button" className="secondary-button mt-5" onClick={retry}>Încearcă din nou</button></section>
        : user ? <ProfileForm key={user.id} user={user} />
        : <p role="status" className="form-panel small-note">Se deschide autentificarea…</p>}
    </SiteLayout>
  );
}
