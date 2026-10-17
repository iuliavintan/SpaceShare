import { useState, type FormEvent } from 'react';
import { resourcesApi } from './resources.api';
import { bucharestToUtc, formatDateTime } from './resource-time';
import { ActionFeedback, useResourceAction } from './useResourceAction';
import type { ResourceBlock } from './resources.types';

export function BlocksEditor({ id, blocks, onSaved }: { id: string; blocks: ResourceBlock[]; onSaved: () => void }) {
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [reason, setReason] = useState('');
  const action = useResourceAction();
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = await action.run(() => resourcesApi.createBlock(id, { startAt: bucharestToUtc(start), endAt: bucharestToUtc(end), reason }), 'Blocarea a fost adăugată.');
    if (result.ok) { setStart(''); setEnd(''); setReason(''); onSaved(); }
  }
  return <section className="management-section" aria-labelledby="blocks-title"><p className="eyebrow">EXCEPȚII DE LA PROGRAM</p><h2 id="blocks-title">Blocări și mentenanță</h2><p className="small-note mt-3">Intervalele sunt în ora României. Blocările nu pot suprapune rezervările active sau alte blocări.</p>
    <ul className="block-list">{blocks.map((block) => <li key={block.id}><div><strong>{block.reason}</strong><p>{formatDateTime(block.startAt)} — {formatDateTime(block.endAt)}</p></div><button type="button" className="text-button" disabled={action.busy} onClick={async () => { const result = await action.run(() => resourcesApi.deleteBlock(id, block.id), 'Blocarea a fost eliminată.'); if (result.ok) onSaved(); }}>Elimină blocarea</button></li>)}</ul>
    <form className="management-form" onSubmit={save}><fieldset disabled={action.busy} className="resource-form-grid"><label className="form-field">De la<input type="datetime-local" required value={start} onChange={(event) => setStart(event.target.value)} /></label><label className="form-field">Până la<input type="datetime-local" required value={end} onChange={(event) => setEnd(event.target.value)} /></label><label className="form-field form-wide">Motiv<input required maxLength={500} placeholder="De exemplu: mentenanță echipamente" value={reason} onChange={(event) => setReason(event.target.value)} /></label><div className="form-wide"><ActionFeedback error={action.error} message={action.message} /></div><button type="submit" className="primary-button">{action.busy ? 'Se salvează…' : 'Adaugă blocare'}</button></fieldset></form>
  </section>;
}
