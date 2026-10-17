import { useState, type FormEvent } from 'react';
import { bucharestToUtc } from '../resources/resource-time';
import { ActionFeedback, useResourceAction } from '../resources/useResourceAction';
import { bookingsApi } from './bookings.api';
import { bookingLabels, type AvailabilityResult, type Booking } from './bookings.types';

export function BookingForm({ resourceId, requiresApproval }: { resourceId: string; requiresApproval: boolean }) {
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [reason, setReason] = useState('');
  const [availability, setAvailability] = useState<AvailabilityResult | null>(null);
  const [created, setCreated] = useState<Booking | null>(null);
  const action = useResourceAction();
  const interval = () => ({ startAt: bucharestToUtc(start), endAt: bucharestToUtc(end) });
  function changed() { setAvailability(null); setCreated(null); }
  async function check() {
    const result = await action.run(() => bookingsApi.availability(resourceId, interval()));
    if (result.ok) setAvailability(result.value);
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAvailability(null);
    const result = await action.run(() => bookingsApi.create({ resourceId, ...interval(), reason }));
    if (result.ok) setCreated(result.value);
  }
  return <section className="management-section booking-form" aria-labelledby="booking-form-title">
    <p className="eyebrow">REZERVĂ RESURSA</p><h2 id="booking-form-title">Fă loc planurilor tale<span className="text-accent">.</span></h2>
    <p className="small-note mt-3">{requiresApproval ? 'Cererea va fi trimisă unui administrator. Până la decizie, intervalul rămâne ocupat.' : 'Rezervarea este aprobată automat dacă intervalul este disponibil.'} Orele sunt în ora României. Durata maximă este de 24 de ore.</p>
    <form className="management-form" onSubmit={submit} aria-busy={action.busy}>
      <fieldset disabled={action.busy} className="resource-form-grid">
        <label className="form-field">De la<input required type="datetime-local" step={60} value={start} onChange={(event) => { setStart(event.target.value); changed(); }} /></label>
        <label className="form-field">Până la<input required type="datetime-local" step={60} value={end} onChange={(event) => { setEnd(event.target.value); changed(); }} /></label>
        <label className="form-field form-wide">Scopul rezervării (opțional)<textarea rows={2} maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="De exemplu: proiect de grup" /></label>
        <div className="form-wide"><ActionFeedback error={action.error} message="" />
          {availability && <p role="status" className={`form-feedback ${availability.available ? 'success' : 'error'}`}>{availability.message}</p>}
          {created && <p role="status" className="form-feedback success">Rezervare înregistrată — {bookingLabels[created.status].toLocaleLowerCase('ro-RO')}. <a href="#/bookings" className="feedback-link">Vezi rezervările mele ↗</a></p>}
        </div>
        <div className="form-wide booking-form-actions"><button className="secondary-button" type="button" onClick={check}>Verifică disponibilitatea</button><button className="primary-button" type="submit" disabled={!!created}>{action.busy ? 'Se verifică…' : requiresApproval ? 'Trimite cererea ↗' : 'Rezervă ↗'}</button></div>
      </fieldset>
    </form>
    <p className="small-note mt-4">Disponibilitatea se verifică din nou la trimitere. Poți anula rezervarea din cont înainte de începerea ei.</p>
  </section>;
}
