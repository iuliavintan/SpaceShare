import { useEffect, useState, type FormEvent } from 'react';
import { SiteHeader } from '../components/SiteHeader';
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
    event.preventDefault(); setBusy(true); setError(''); setSaved(false);
    try { const result = await authApi.updateProfile({ name, email }); setUser(result); setName(result.name); setEmail(result.email); setSaved(true); }
    catch (error: unknown) {
      if (error instanceof ApiError && error.status === 401) setUser(null);
      else setError(error instanceof Error ? error.message : 'Modificările nu au putut fi salvate.');
    } finally { setBusy(false); }
  }
  return <section className="account-card" aria-labelledby="profile-title"><h2 id="profile-title">Datele tale</h2><p className="text-sm text-stone-500 mt-2 mb-7">Actualizează numele și adresa de email.</p><form onSubmit={submit}><fieldset disabled={busy} className="space-y-5">
    <label className="form-field">Nume<input name="name" autoComplete="name" required minLength={2} maxLength={80} value={name} onChange={(event) => { setName(event.target.value); setSaved(false); }} /></label>
    <label className="form-field">Email<input name="email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={(event) => { setEmail(event.target.value); setSaved(false); }} /></label>
    {error && <p role="alert" className="form-error">{error}</p>}
    {saved && <p role="status" className="text-sm text-forest">Modificările au fost salvate.</p>}
    <button className="primary-button" type="submit">{busy ? 'Se salvează…' : 'Salvează modificările'}</button>
  </fieldset></form><div className="mt-8 border-t border-stone-200 pt-5 text-sm text-stone-500"><p>Rol: <span className="font-semibold text-forest">{user.role === 'ADMIN' ? 'Administrator' : 'Utilizator'}</span></p><p className="mt-2">Membru din {new Date(user.createdAt).toLocaleDateString('ro-RO', { timeZone: 'Europe/Bucharest' })}</p></div></section>;
}

export function ProfilePage() {
  const { user, loading, error, retry } = useAuth();
  useEffect(() => { if (!loading && !user && !error) window.location.hash = '/login'; }, [loading, user, error]);
  return <div className="page-shell"><SiteHeader /><main className="account-layout"><div className="account-intro"><p className="eyebrow">CONTUL TĂU</p><h1>{user ? `Salut, ${user.name}.` : 'Profilul meu'}</h1><p>Aici găsești informațiile contului tău SpaceShare.</p><a className="nav-link text-sm" href="#/">← Înapoi la pagina de pornire</a></div>
    {loading ? <p role="status">Se încarcă profilul…</p> : error ? <section className="account-card"><p role="alert" className="form-error">{error}</p><button type="button" className="secondary-button mt-4" onClick={retry}>Încearcă din nou</button></section> : user ? <ProfileForm key={user.id} user={user} /> : <p role="status">Se deschide autentificarea…</p>}
  </main></div>;
}
