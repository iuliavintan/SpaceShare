import { useEffect, useState, type FormEvent } from 'react';
import { SiteHeader } from '../components/SiteHeader';
import { useAuth } from '../features/auth/AuthProvider';
import { authApi } from '../features/auth/auth.api';

export function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  const { user, loading, setUser } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const register = mode === 'register';
  useEffect(() => { if (user) window.location.hash = '/profile'; }, [user]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError('');
    try {
      const result = register ? await authApi.register({ name, email, password }) : await authApi.login({ email, password });
      setUser(result); setPassword(''); window.location.hash = '/profile';
    } catch (error: unknown) { setError(error instanceof Error ? error.message : 'Cererea a eșuat.'); }
    finally { setBusy(false); }
  }

  return <div className="page-shell"><SiteHeader /><main className="account-layout">
    <div className="account-intro"><p className="eyebrow">COMUNITATEA SPACESHARE</p><h1>{register ? 'Un cont. Mai multe posibilități.' : 'Bine ai revenit.'}</h1><p>{register ? 'Creează-ți contul pentru a face parte din comunitate. Spațiile și echipamentele comune vor fi mai aproape de tine.' : 'Autentifică-te pentru a-ți accesa profilul SpaceShare.'}</p><a className="nav-link text-sm" href="#/">← Înapoi la pagina de pornire</a></div>
    <section className="account-card" aria-labelledby="auth-title"><h2 id="auth-title">{register ? 'Creează un cont' : 'Autentificare'}</h2><p className="text-sm text-stone-500 mt-2 mb-7">{register ? 'Completează datele de mai jos.' : 'Folosește adresa de email și parola contului tău.'}</p>
      <form onSubmit={submit}><fieldset disabled={busy || loading} className="space-y-5">
        {register && <label className="form-field">Nume<input autoComplete="name" name="name" required minLength={2} maxLength={80} value={name} onChange={(event) => setName(event.target.value)} /></label>}
        <label className="form-field">Email<input type="email" name="email" autoComplete="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} /></label>
        <label className="form-field">Parolă<input type="password" name="password" autoComplete={register ? 'new-password' : 'current-password'} required minLength={8} maxLength={72} aria-describedby={register ? 'password-help' : undefined} value={password} onChange={(event) => setPassword(event.target.value)} /></label>
        {register && <p id="password-help" className="text-xs leading-5 text-stone-500">Minimum 8 caractere.</p>}
        {error && <p role="alert" className="form-error">{error}</p>}
        <button className="primary-button w-full justify-center" type="submit">{busy ? 'Se procesează…' : register ? 'Creează cont' : 'Autentifică-te'}</button>
      </fieldset></form>
      <p className="mt-6 text-sm text-stone-500">{register ? 'Ai deja un cont?' : 'Nu ai un cont?'} <a className="font-semibold text-forest underline underline-offset-4" href={register ? '#/login' : '#/register'}>{register ? 'Autentifică-te' : 'Înregistrează-te'}</a></p>
    </section>
  </main></div>;
}
