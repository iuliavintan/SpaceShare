import { useEffect, useState, type FormEvent } from 'react';
import { SiteLayout } from '../components/SiteLayout';
import { useAuth } from '../features/auth/AuthProvider';
import { authApi } from '../features/auth/auth.api';

export function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  const { user, loading, setUser } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const register = mode === 'register';

  useEffect(() => {
    if (user) window.location.hash = '/profile';
  }, [user]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const result = register
        ? await authApi.register({ name, email, password })
        : await authApi.login({ email, password });
      setUser(result);
      setPassword('');
      window.location.hash = '/profile';
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Cererea a eșuat.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <SiteLayout mainClassName="account-layout">
      <aside className="account-intro">
        <p className="eyebrow">SPACESHARE / CONTUL TĂU</p>
        <h1>Ideile bune<br />au nevoie<br />de <em>spațiu.</em></h1>
        <p>Un loc pentru învățare, colaborare și lucrurile pe care le facem împreună.</p>
        <a href="#/" className="back-link">← Înapoi acasă</a>
        <div className="community-stamp" aria-hidden="true">S<span>Comunitate<br />universitară</span></div>
      </aside>
      <section className="form-panel" aria-labelledby="auth-title">
        <p className="eyebrow">{register ? 'PRIMUL PAS ÎN COMUNITATE' : 'CONTUL TĂU SPACESHARE'}</p>
        <h2 id="auth-title">{register ? 'Creează-ți contul' : 'Bine ai revenit'}<span>.</span></h2>
        <p className="form-description">{register ? 'Câteva detalii și ești parte din comunitate.' : 'Intră în cont folosind adresa ta de email.'}</p>
        <form onSubmit={submit} aria-busy={busy} aria-describedby={error ? 'auth-error' : undefined}>
          <fieldset disabled={busy || loading}>
            {register && <label className="form-field">Nume complet
              <input name="name" autoComplete="name" required minLength={2} maxLength={80} placeholder="Cum te numești?" value={name} onChange={(event) => setName(event.target.value)} />
            </label>}
            <label className="form-field">Adresa de email
              <input name="email" type="email" autoComplete="email" required maxLength={254} placeholder="nume@universitate.ro" value={email} onChange={(event) => setEmail(event.target.value)} />
            </label>
            <div className="form-field">
              <label htmlFor="account-password">Parolă</label>
              <div className="password-input">
                <input id="account-password" name="password" type={showPassword ? 'text' : 'password'} autoComplete={register ? 'new-password' : 'current-password'} required minLength={8} maxLength={72} placeholder="Cel puțin 8 caractere" aria-describedby={register ? 'password-help' : undefined} value={password} onChange={(event) => setPassword(event.target.value)} />
                <button type="button" aria-controls="account-password" aria-pressed={showPassword} onClick={() => setShowPassword((value) => !value)}>{showPassword ? 'Ascunde' : 'Arată'}</button>
              </div>
            </div>
            {register && <p id="password-help" className="field-hint">Minimum 8 caractere.</p>}
            {error && <p id="auth-error" role="alert" className="form-feedback error">{error}</p>}
            <button className="primary-button form-submit" type="submit">
              {busy ? 'Se procesează…' : register ? 'Creează cont' : 'Autentifică-te'} <span aria-hidden="true">↗</span>
            </button>
          </fieldset>
        </form>
        <p className="form-footnote">{register ? 'Ai deja un cont?' : 'Ești nou aici?'} <a href={register ? '#/login' : '#/register'}>{register ? 'Autentifică-te' : 'Creează un cont'}</a></p>
      </section>
    </SiteLayout>
  );
}
