import { useState, type FormEvent } from 'react';
import { resourcesApi } from './resources.api';
import { ActionFeedback, useResourceAction } from './useResourceAction';
import type { Category, Resource, ResourceInput } from './resources.types';

export function ResourceForm({ resource, categories, onSaved }: { resource?: Resource; categories: Category[]; onSaved: (resource: Resource) => void }) {
  const [draft, setDraft] = useState<ResourceInput>(resource ?? { name: '', description: '', categoryId: categories[0]?.id ?? '', location: '', capacity: 1, facilities: [], requiresApproval: false, isActive: true });
  const [facilities, setFacilities] = useState(resource?.facilities.join(', ') ?? '');
  const action = useResourceAction();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const { name, description, categoryId, location, capacity, requiresApproval, isActive } = draft;
    const data: ResourceInput = { name, description, categoryId, location, capacity, requiresApproval, isActive, facilities: facilities.split(',').map((item) => item.trim()).filter(Boolean) };
    const result = await action.run(() => resource ? resourcesApi.update(resource.id, data) : resourcesApi.create(data), 'Resursa a fost salvată.');
    if (result.ok) {
      setDraft(result.value);
      setFacilities(result.value.facilities.join(', '));
      onSaved(result.value);
    }
  }
  return <section className="management-section" aria-labelledby="resource-form-title"><p className="eyebrow">DATE GENERALE</p><h2 id="resource-form-title">{resource ? 'Editează resursa' : 'O resursă nouă'}<span className="text-accent">.</span></h2>
    <form className="management-form" onSubmit={submit} aria-busy={action.busy}><fieldset disabled={action.busy} className="resource-form-grid">
      <label className="form-field">Nume<input required maxLength={120} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
      <label className="form-field">Categorie<select required value={draft.categoryId} onChange={(event) => setDraft({ ...draft, categoryId: event.target.value })}><option value="" disabled>Alege categoria</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label className="form-field form-wide">Descriere<textarea required maxLength={2000} rows={4} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label>
      <label className="form-field">Locație<input required maxLength={120} value={draft.location} onChange={(event) => setDraft({ ...draft, location: event.target.value })} /></label>
      <label className="form-field">Capacitate<input required type="number" min={1} max={100000} step={1} value={draft.capacity} onChange={(event) => setDraft({ ...draft, capacity: Number(event.target.value) })} /></label>
      <label className="form-field form-wide">Facilități<input value={facilities} placeholder="Wi-Fi, Tablă, Proiector" onChange={(event) => setFacilities(event.target.value)} /><span className="small-note">Separă facilitățile prin virgulă.</span></label>
      <label className="checkbox-field"><input type="checkbox" checked={draft.requiresApproval} onChange={(event) => setDraft({ ...draft, requiresApproval: event.target.checked })} />Aprobare manuală a rezervărilor</label>
      <label className="checkbox-field"><input type="checkbox" checked={draft.isActive} onChange={(event) => setDraft({ ...draft, isActive: event.target.checked })} />Resursă activă în catalog</label>
      <div className="form-wide"><ActionFeedback error={action.error} message={action.message} /></div>
      <button className="primary-button" type="submit">{action.busy ? 'Se salvează…' : 'Salvează resursa'} <span aria-hidden="true">↗</span></button>
    </fieldset></form>
  </section>;
}
