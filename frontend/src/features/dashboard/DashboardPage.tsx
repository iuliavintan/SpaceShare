import { useCallback } from 'react';
import { SiteLayout } from '../../components/SiteLayout';
import { useAuth } from '../auth/AuthProvider';
import { bookingLabels } from '../bookings/bookings.types';
import { useRemoteData } from '../resources/useRemoteData';
import { dashboardApi, type AdminDashboard, type DashboardBooking, type UserDashboard } from './dashboard.api';

const dateFormat = new Intl.DateTimeFormat('ro-RO', { timeZone: 'Europe/Bucharest', dateStyle: 'medium', timeStyle: 'short' });

function BookingRows({ bookings, showOwner = false }: { bookings: DashboardBooking[]; showOwner?: boolean }) {
  if (!bookings.length) return <p className="small-note dashboard-empty">Nu există rezervări în această secțiune.</p>;
  return <div className="dashboard-booking-list">{bookings.map((booking) => <article key={booking.id} className="dashboard-booking">
    <div><p className="eyebrow">{booking.resource.location}{showOwner && booking.user ? ` · ${booking.user.name}` : ''}</p><h3><a href={`#/resources/${encodeURIComponent(booking.resource.id)}`}>{booking.resource.name}</a></h3><p className="small-note">{dateFormat.format(new Date(booking.startAt))} — {dateFormat.format(new Date(booking.endAt))}</p></div>
    <span className={`booking-status status-${booking.status.toLowerCase()}`}>{bookingLabels[booking.status]}</span>
  </article>)}</div>;
}

function UserDashboardView({ data }: { data: UserDashboard }) {
  const stats = data.statistics.bookings;
  return <>
    <div className="dashboard-stats" role="group" aria-label="Rezumat rezervări">
      <div><span>Total</span><strong>{stats.total}</strong></div><div><span>În așteptare</span><strong>{stats.pending}</strong></div><div><span>Aprobate</span><strong>{stats.approved}</strong></div><div><span>Încheiate</span><strong>{stats.completed}</strong></div>
    </div>
    <section className="dashboard-section"><div className="dashboard-section-heading"><div><p className="eyebrow">URMEAZĂ</p><h2>Rezervările viitoare</h2></div><a href="#/bookings" className="back-link">Toate rezervările ↗</a></div><BookingRows bookings={data.upcomingBookings} /></section>
    <section className="dashboard-section"><div className="dashboard-section-heading"><div><p className="eyebrow">ARHIVĂ</p><h2>Istoric și statusuri</h2></div></div><BookingRows bookings={data.historyBookings} /></section>
  </>;
}

function AdminDashboardView({ data }: { data: AdminDashboard }) {
  const stats = data.statistics;
  return <>
    <div className="dashboard-stats" role="group" aria-label="Statistici administrare">
      <div><span>Resurse active</span><strong>{stats.resources.active}<small> / {stats.resources.total}</small></strong></div><div><span>Cereri de aprobare</span><strong>{stats.bookings.pending}</strong></div><div><span>Rezervări aprobate</span><strong>{stats.bookings.approved}</strong></div><div><span>Total rezervări</span><strong>{stats.bookings.total}</strong></div>
    </div>
    <section className="dashboard-section"><div className="dashboard-section-heading"><div><p className="eyebrow">NECESITĂ ACȚIUNE</p><h2>Cereri de aprobare</h2></div><a href="#/bookings" className="back-link">Gestionează cererile ↗</a></div><BookingRows bookings={data.pendingBookings} showOwner /></section>
    <section className="dashboard-section"><div className="dashboard-section-heading"><div><p className="eyebrow">ACTIVITATE RECENTĂ</p><h2>Rezervări recente</h2></div></div><BookingRows bookings={data.recentBookings} showOwner /></section>
  </>;
}

export function DashboardPage() {
  const { user } = useAuth();
  const load = useCallback((signal: AbortSignal) => dashboardApi.get(signal), []);
  const result = useRemoteData(load);
  return <SiteLayout mainClassName="dashboard-page">
    <div className="catalog-heading"><div><p className="eyebrow">{user?.role === 'ADMIN' ? 'SPAȚIU DE LUCRU / ADMINISTRARE' : 'SPAȚIUL MEU'}</p><h1 className="page-title">{user?.role === 'ADMIN' ? <>Privire de<br /><em>ansamblu.</em></> : <>Bun venit,<br /><em>{user?.name.split(' ')[0]}.</em></>}</h1></div><div className="catalog-heading-aside"><p>{user?.role === 'ADMIN' ? 'Urmărește activitatea și gestionează cererile comunității.' : 'Aici găsești rezervările tale viitoare și istoricul lor.'}</p><a href="#/resources" className="back-link mt-5 inline-block">Caută o resursă ↗</a></div></div>
    {result.loading ? <p className="small-note" role="status">Se încarcă dashboardul…</p> : result.error ? <><p role="alert" className="form-feedback error">{result.error}</p><button className="secondary-button mt-4" onClick={result.reload}>Încearcă din nou</button></> : result.data?.role === 'ADMIN' ? <AdminDashboardView data={result.data} /> : result.data ? <UserDashboardView data={result.data} /> : null}
  </SiteLayout>;
}
