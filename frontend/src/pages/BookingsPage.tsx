import { useCallback, useState } from 'react';
import { SiteLayout } from '../components/SiteLayout';
import { useAuth } from '../features/auth/AuthProvider';
import { bookingsApi } from '../features/bookings/bookings.api';
import { bookingLabels, bookingStatuses, type BookingStatus } from '../features/bookings/bookings.types';
import { useRemoteData } from '../features/resources/useRemoteData';
import { ActionFeedback, useResourceAction } from '../features/resources/useResourceAction';

const formatter = new Intl.DateTimeFormat('ro-RO', { timeZone: 'Europe/Bucharest', dateStyle: 'medium', timeStyle: 'short' });

export function BookingsPage() {
  const { user } = useAuth();
  const [status, setStatus] = useState<BookingStatus | ''>('');
  const [page, setPage] = useState(1);
  const load = useCallback((signal: AbortSignal) => bookingsApi.list({ scope: user?.role === 'ADMIN' ? 'all' : 'mine', ...(status ? { status } : {}), page }, signal), [page, status, user?.role]);
  const result = useRemoteData(load);
  const action = useResourceAction();
  const now = Date.now();

  return <SiteLayout mainClassName="catalog-page">
    <div className="catalog-heading">
      <div><p className="eyebrow">{user?.role === 'ADMIN' ? 'ADMINISTRARE / CERERI' : 'CONTUL MEU'}</p><h1 className="page-title">{user?.role === 'ADMIN' ? <>Cereri de<br /><em>rezervare.</em></> : <>Rezervările<br /><em>mele.</em></>}</h1></div>
      <div className="catalog-heading-aside"><p>{user?.role === 'ADMIN' ? 'Aprobă sau respinge cererile și urmărește rezervările comunității.' : 'Urmărește statusul rezervărilor și anulează-le înainte de începere.'}</p><a href="#/resources" className="back-link mt-5 inline-block">← Caută resurse</a></div>
    </div>
    <label className="booking-status-filter form-field">Filtrează după status<select value={status} onChange={(event) => { setStatus(event.target.value as BookingStatus | ''); setPage(1); }}><option value="">Toate statusurile</option>{bookingStatuses.map((value) => <option key={value} value={value}>{bookingLabels[value]}</option>)}</select></label>
    <ActionFeedback error={action.error} message={action.message} />
    {result.loading ? <p className="small-note" role="status">Se încarcă rezervările…</p> : result.error ? <><p className="form-feedback error" role="alert">{result.error}</p><button className="secondary-button mt-4" onClick={result.reload}>Încearcă din nou</button></> : result.data && <>
      <p className="eyebrow results-count">{result.data.total} {result.data.total === 1 ? 'REZERVARE' : 'REZERVĂRI'}</p>
      {!result.data.bookings.length && <div className="empty-state"><h2>Nu există rezervări pentru acest filtru.</h2><p>Alege alt status sau caută o resursă disponibilă.</p><a href="#/resources" className="secondary-button mt-5">Deschide catalogul ↗</a></div>}
      {result.data.bookings.map((booking, index) => {
        const startsInFuture = Date.parse(booking.startAt) > now;
        const endsInFuture = Date.parse(booking.endAt) > now;
        const admin = user?.role === 'ADMIN';
        const canDecide = admin && booking.status === 'PENDING' && startsInFuture;
        const canCancel = ['PENDING', 'APPROVED'].includes(booking.status) && endsInFuture && (admin || (booking.userId === user?.id && startsInFuture));
        const statusLabel = booking.status === 'REJECTED' && !booking.decidedBy ? 'Expirată fără aprobare' : bookingLabels[booking.status];
        return <article key={booking.id} className="booking-row">
          <span className="catalog-number">{String((result.data!.page - 1) * result.data!.pageSize + index + 1).padStart(2, '0')}</span>
          <div className="booking-row-main">
            <div className="booking-row-title"><div><p className="eyebrow">{booking.resource.location}{admin ? ` · ${booking.user.name}` : ''}</p><h2><a href={`#/resources/${encodeURIComponent(booking.resourceId)}`}>{booking.resource.name}</a></h2></div><span className={`booking-status status-${booking.status.toLowerCase()}`}>{statusLabel}</span></div>
            <p className="booking-date">{formatter.format(new Date(booking.startAt))} — {formatter.format(new Date(booking.endAt))}</p>
            {booking.reason && <p className="booking-reason">Scop: {booking.reason}</p>}
            {booking.decidedBy && <p className="booking-reason">Decizie de {booking.decidedBy.name}{booking.decidedAt ? ` · ${formatter.format(new Date(booking.decidedAt))}` : ''}</p>}
          </div>
          {(canDecide || canCancel) && <div className="booking-actions">
            {canDecide && <>
              <button className="secondary-button" disabled={action.busy} onClick={async () => { const response = await action.run(() => bookingsApi.transition(booking.id, 'approve'), 'Rezervarea a fost aprobată.'); if (response.ok) result.reload(); }}>Aprobă</button>
              <button className="text-button" disabled={action.busy} onClick={async () => { const response = await action.run(() => bookingsApi.transition(booking.id, 'reject'), 'Cererea a fost respinsă.'); if (response.ok) result.reload(); }}>Respinge</button>
            </>}
            {canCancel && <button className="text-button" disabled={action.busy} onClick={async () => { const response = await action.run(() => bookingsApi.transition(booking.id, 'cancel'), 'Rezervarea a fost anulată.'); if (response.ok) result.reload(); }}>Anulează</button>}
          </div>}
        </article>;
      })}
      {result.data.total > result.data.pageSize && <nav className="pagination" aria-label="Pagini rezervări"><button className="secondary-button" disabled={page <= 1} onClick={() => setPage(page - 1)}>← Înapoi</button><span>Pagina {result.data.page} din {Math.ceil(result.data.total / result.data.pageSize)}</span><button className="secondary-button" disabled={page * result.data.pageSize >= result.data.total} onClick={() => setPage(page + 1)}>Înainte →</button></nav>}
    </>}
  </SiteLayout>;
}
