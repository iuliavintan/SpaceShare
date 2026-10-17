import { useState, type FormEvent } from 'react';
import { resourcesApi } from './resources.api';
import { formatMinute, parseMinute, weekdays } from './resource-time';
import { ActionFeedback, useResourceAction } from './useResourceAction';
import type { AvailabilityWindow } from './resources.types';

export function AvailabilityEditor({ id, windows, onSaved }: { id: string; windows: AvailabilityWindow[]; onSaved: () => void }) {
  const [rows, setRows] = useState(windows.map((row) => ({ key: row.id ?? crypto.randomUUID(), dayOfWeek: row.dayOfWeek, start: formatMinute(row.startMinute), end: formatMinute(row.endMinute) })));
  const action = useResourceAction();
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = await action.run(async () => {
      const values = rows.map((row) => ({ dayOfWeek: row.dayOfWeek, startMinute: parseMinute(row.start), endMinute: parseMinute(row.end, true) }));
      await resourcesApi.saveAvailability(id, values);
    }, 'Programul a fost salvat.');
    if (result.ok) onSaved();
  }
  return <section className="management-section" aria-labelledby="availability-title"><p className="eyebrow">PROGRAM SĂPTĂMÂNAL</p><h2 id="availability-title">Ore de funcționare</h2><p className="small-note mt-3">Orele sunt în fusul Europe/Bucharest. Zilele fără intervale sunt închise. Pentru un program peste miezul nopții, folosește două intervale în zile consecutive.</p>
    <form className="management-form mt-6" onSubmit={save}><fieldset disabled={action.busy}>
      {rows.map((row) => <div key={row.key} className="availability-row"><label className="form-field">Zi<select value={row.dayOfWeek} onChange={(event) => setRows(rows.map((item) => item.key === row.key ? { ...item, dayOfWeek: Number(event.target.value) } : item))}>{weekdays.map((day, index) => <option key={day} value={index + 1}>{day}</option>)}</select></label><label className="form-field">De la<input type="time" required value={row.start} onChange={(event) => setRows(rows.map((item) => item.key === row.key ? { ...item, start: event.target.value } : item))} /></label><label className="form-field">Până la (24:00 permis)<input type="text" inputMode="numeric" required maxLength={5} placeholder="HH:MM" value={row.end} onChange={(event) => setRows(rows.map((item) => item.key === row.key ? { ...item, end: event.target.value } : item))} /></label><button type="button" className="text-button" onClick={() => setRows(rows.filter((item) => item.key !== row.key))}>Elimină intervalul</button></div>)}
      {!rows.length && <p className="small-note">Fără intervale, resursa nu are program de funcționare.</p>}
      <div className="flex flex-wrap gap-4 mt-5"><button type="button" className="secondary-button" disabled={rows.length >= 70} onClick={() => setRows([...rows, { key: crypto.randomUUID(), dayOfWeek: 1, start: '08:00', end: '20:00' }])}>Adaugă interval</button><button className="primary-button" type="submit">{action.busy ? 'Se salvează…' : 'Salvează programul'}</button></div>
    </fieldset><div className="mt-4"><ActionFeedback error={action.error} message={action.message} /></div></form>
  </section>;
}
