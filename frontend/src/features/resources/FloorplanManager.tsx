import { useRef, useState, type FormEvent } from 'react';
import { resourcesApi } from './resources.api';
import type { Floorplan } from './resources.types';
import { ActionFeedback, useResourceAction } from './useResourceAction';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

export function FloorplanManager({ resourceId, floorplan, onSaved }: { resourceId: string; floorplan: Floorplan | null; onSaved: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const action = useResourceAction();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) {
      await action.run(() => Promise.reject(new Error('Alege o imagine PNG, JPEG sau WebP.')));
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      await action.run(() => Promise.reject(new Error('Imaginea trebuie sa aiba maximum 5 MB.')));
      return;
    }
    const result = await action.run(() => resourcesApi.saveFloorplan(resourceId, file), 'Planul arhitectural a fost salvat.');
    if (result.ok) {
      setFile(null);
      if (inputRef.current) inputRef.current.value = '';
      onSaved();
    }
  }

  async function remove() {
    const result = await action.run(() => resourcesApi.deleteFloorplan(resourceId), 'Planul arhitectural a fost eliminat.');
    if (result.ok) onSaved();
  }

  return <section className="management-section floorplan-manager" aria-labelledby="floorplan-manager-title">
    <p className="eyebrow">DETALIILE SĂLII</p>
    <h2 id="floorplan-manager-title">Plan arhitectural</h2>
    <p className="small-note">Încarcă planul ca imagine PNG, JPEG sau WebP. Fișierul este păstrat local pe acest calculator și poate avea maximum 5 MB.</p>
    {floorplan && <img className="floorplan-preview" src={floorplan.url} alt={floorplan.altText} />}
    <form className="floorplan-upload-form" onSubmit={submit}>
      <label className="form-field">{floorplan ? 'Înlocuiește planul' : 'Alege planul sălii'}
        <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" required onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
      </label>
      {file && <p className="small-note">Selectat: {file.name}</p>}
      <div className="floorplan-actions">
        <button type="submit" className="primary-button" disabled={action.busy || !file}>{action.busy ? 'Se salvează…' : 'Salvează planul'}</button>
        {floorplan && <button type="button" className="text-button" disabled={action.busy} onClick={() => void remove()}>Elimină planul</button>}
      </div>
      <ActionFeedback error={action.error} message={action.message} />
    </form>
  </section>;
}
