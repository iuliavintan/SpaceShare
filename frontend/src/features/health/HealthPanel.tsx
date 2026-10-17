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
    <section id="connection" aria-labelledby="connection-title" className="connection-panel">
      <div className="connection-overline"><span className={`status-dot ${state.status}`} /> Starea aplicației</div>
      <div className="connection-body">
        <div role="status" aria-live="polite">
          <h2 id="connection-title">{title}</h2>
          <p className="connection-description">
            {state.status === 'online' ? 'Interfața și serverul SpaceShare comunică prin conexiunea locală.' : state.status === 'offline' ? 'Pornește backendul și încearcă din nou.' : 'Interfața trimite o cerere către serverul SpaceShare.'}
          </p>
          {state.status === 'offline' && <p className="connection-error">{state.message}</p>}
          {state.status === 'online' && <p className="connection-timestamp">Ultima verificare: {new Date(state.timestamp).toLocaleTimeString('ro-RO', { timeZone: 'Europe/Bucharest' })}</p>}
        </div>
        <button type="button" disabled={state.status === 'checking'} onClick={() => setAttempt((value) => value + 1)} className="secondary-button">
          <Icon name="refresh" className={`size-4 ${state.status === 'checking' ? 'animate-spin' : ''}`} />
          {state.status === 'checking' ? 'Se verifică' : 'Verifică din nou'}
        </button>
      </div>
      {state.status === 'online' && <p className="connection-confirmation"><Icon name="check" className="size-4" /> Conexiune confirmată</p>}
    </section>
  );
}
