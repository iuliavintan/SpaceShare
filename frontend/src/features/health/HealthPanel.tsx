import { useEffect, useState } from 'react';
import { Icon } from '../../components/Icon';
import { getHealth } from '../../lib/api';

type HealthState =
  | { status: 'checking' }
  | { status: 'online'; timestamp: string }
  | { status: 'offline'; message: string };

export function HealthPanel() {
  const [state, setState] = useState<HealthState>({ status: 'checking' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const timer = window.setTimeout(() => controller.abort(), 5000);
    setState({ status: 'checking' });
    getHealth(controller.signal)
      .then((data) => { if (active) setState({ status: 'online', timestamp: data.timestamp }); })
      .catch((error: unknown) => {
        if (active) setState({ status: 'offline', message: controller.signal.aborted
          ? 'Verificarea a depășit timpul de așteptare.'
          : error instanceof Error ? error.message : 'Conexiunea nu a putut fi verificată.' });
      })
      .finally(() => window.clearTimeout(timer));
    return () => { active = false; window.clearTimeout(timer); controller.abort(); };
  }, [attempt]);

  const title = state.status === 'online' ? 'Totul este conectat.' : state.status === 'offline' ? 'Conexiunea necesită atenție.' : 'Verificăm conexiunea…';

  return (
    <section id="connection" aria-labelledby="connection-title" className="connection-panel scroll-mt-8">
      <div className="flex items-center gap-3 text-xs font-semibold tracking-[0.13em] uppercase text-stone-500"><span className={`status-dot ${state.status}`} /> Starea aplicației</div>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-6">
        <div role="status" aria-live="polite">
          <h2 id="connection-title" className="text-2xl font-semibold tracking-tight text-forest">{title}</h2>
          <p className="mt-2 max-w-lg text-sm leading-6 text-stone-500">
            {state.status === 'online' ? 'Interfața și serverul SpaceShare comunică prin conexiunea locală.' : state.status === 'offline' ? 'Pornește backendul și încearcă din nou.' : 'Interfața trimite o cerere către serverul SpaceShare.'}
          </p>
          {state.status === 'offline' && <p className="mt-2 text-xs text-red-700">{state.message}</p>}
          {state.status === 'online' && <p className="mt-2 text-xs text-stone-500">Ultima verificare: {new Date(state.timestamp).toLocaleTimeString('ro-RO', { timeZone: 'Europe/Bucharest' })}</p>}
        </div>
        <button type="button" disabled={state.status === 'checking'} onClick={() => setAttempt((value) => value + 1)} className="secondary-button">
          <Icon name="refresh" className={`size-4 ${state.status === 'checking' ? 'animate-spin' : ''}`} />
          {state.status === 'checking' ? 'Se verifică' : 'Verifică din nou'}
        </button>
      </div>
      <div className="mt-7 flex flex-wrap items-center gap-2 border-t border-stone-200 pt-5 text-xs text-stone-500">
        <span className="rounded-md bg-stone-100 px-2 py-1 font-mono">GET /api/health</span>
        <span className="mx-1">→</span><span>Server local</span>
        {state.status === 'online' && <span className="ml-auto flex items-center gap-1.5 font-medium text-forest"><Icon name="check" className="size-4" /> Răspuns confirmat</span>}
      </div>
    </section>
  );
}
