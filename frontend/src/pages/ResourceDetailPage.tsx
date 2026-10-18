import { useCallback, useState } from 'react';
import { SiteLayout } from '../components/SiteLayout';
import { useAuth } from '../features/auth/AuthProvider';
import { resourcesApi } from '../features/resources/resources.api';
import { useRemoteData } from '../features/resources/useRemoteData';
import { ResourceForm } from '../features/resources/ResourceForm';
import { AvailabilityEditor } from '../features/resources/AvailabilityEditor';
import { BlocksEditor } from '../features/resources/BlocksEditor';
import { formatDateTime, formatMinute, weekdays } from '../features/resources/resource-time';
import { BookingForm } from '../features/bookings/BookingForm';
import { FloorplanManager } from '../features/resources/FloorplanManager';

export function ResourceDetailPage({ id, manage = false }: { id: string; manage?: boolean }) {
  const load = useCallback((signal: AbortSignal) => resourcesApi.detail(id, signal), [id]);
  const detail = useRemoteData(load);
  const categories = useRemoteData(resourcesApi.categories);
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const resource = detail.data;
  const saved = (text: string) => { setMessage(text); detail.reload(); };

  return <SiteLayout mainClassName="catalog-page">
    <a href={manage ? '#/admin/resources' : '#/resources'} className="back-link">← {manage ? 'Administrare resurse' : 'Înapoi la catalog'}</a>
    {detail.loading && <p role="status" className="small-note mt-8">{resource ? 'Se actualizează datele…' : 'Se încarcă resursa…'}</p>}
    {detail.error && <><p role="alert" className="form-feedback error mt-6">{detail.error}</p><button onClick={detail.reload} className="secondary-button mt-4">Încearcă din nou</button></>}
    {resource && <>
      <header className="resource-detail-heading"><div><p className="eyebrow">{resource.category.name}</p><h1 className="page-title">{resource.name}</h1><div className="resource-meta"><span>{resource.location}</span><span>Capacitate: {resource.capacity}</span><span>Aprobare {resource.requiresApproval ? 'manuală' : 'automată'}</span>{!resource.isActive && <span className="resource-badge inactive">Inactivă</span>}</div></div><div className="resource-detail-actions"><a href={`#/calendar/${encodeURIComponent(id)}`} className="secondary-button">Vezi calendarul ↗</a>{!manage && user?.role === 'ADMIN' && <a href={`#/admin/resources/${encodeURIComponent(id)}`} className="secondary-button">Gestionează resursa ↗</a>}</div></header>
      {message && <p role="status" className="form-feedback success mb-6">{message}</p>}
      {manage ? <>
        {categories.error ? <><p role="alert" className="form-feedback error">{categories.error}</p><button className="secondary-button mt-4" onClick={categories.reload}>Reîncarcă categoriile</button></> : categories.data ? <ResourceForm key={resource.id} resource={resource} categories={categories.data} onSaved={() => saved('Resursa a fost salvată.')} /> : <p role="status">Se încarcă categoriile…</p>}
        <FloorplanManager resourceId={id} floorplan={resource.floorplan} onSaved={() => saved('Planul arhitectural a fost actualizat.')} />
        <AvailabilityEditor id={id} windows={resource.availability} onSaved={() => saved('Programul a fost salvat.')} />
        <BlocksEditor id={id} blocks={resource.blocks} onSaved={() => saved('Blocările au fost actualizate.')} />
      </> : <>
        <section className="resource-description" aria-labelledby="description-title"><h2 id="description-title">Despre resursă</h2><p>{resource.description}</p><div className="room-capacity-card"><svg className="room-capacity-icon" aria-hidden="true" viewBox="0 0 20 20" fill="none"><circle cx="7" cy="6" r="3" stroke="currentColor" strokeWidth="1.5"/><path d="M1.8 16v-1.2a4.2 4.2 0 0 1 4.2-4.2h2a4.2 4.2 0 0 1 4.2 4.2V16H1.8Z" stroke="currentColor" strokeWidth="1.5"/><path d="M13 3.2a3 3 0 0 1 0 5.7m1.2 2a4.2 4.2 0 0 1 4 4.2V16h-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg><div><p className="eyebrow">CAPACITATEA SĂLII</p><strong>{resource.capacity} {resource.capacity === 1 ? 'persoană' : 'persoane'}</strong></div><span className="small-note">capacitate maximă</span></div><h3>Facilități</h3>{resource.facilities.length ? <ul className="facilities-list">{resource.facilities.map((facility) => <li key={facility}>{facility}</li>)}</ul> : <p className="small-note">Nu sunt specificate facilități.</p>}</section>
        <section className="floorplan-viewer" aria-labelledby="floorplan-title"><div><p className="eyebrow">LAYOUT / PLANUL ÎNCĂPERII</p><h2 id="floorplan-title">Plan arhitectural</h2></div>{resource.floorplan ? <><a href={resource.floorplan.url} target="_blank" rel="noreferrer" className="floorplan-image-link"><img src={resource.floorplan.url} alt={resource.floorplan.altText} /></a><a className="back-link" href={resource.floorplan.url} target="_blank" rel="noreferrer">Deschide planul la dimensiune completă ↗</a></> : <p className="small-note">Planul arhitectural nu a fost încă adăugat.</p>}</section>
        <div className="resource-detail-columns"><section className="management-section" aria-labelledby="schedule-title"><p className="eyebrow">EUROPE/BUCHAREST</p><h2 id="schedule-title">Program de funcționare</h2><dl className="weekly-schedule">{weekdays.map((day, index) => <div key={day}><dt>{day}</dt><dd>{resource.availability.filter((window) => window.dayOfWeek === index + 1).map((window) => `${formatMinute(window.startMinute)}–${formatMinute(window.endMinute)}`).join(', ') || 'Închis'}</dd></div>)}</dl></section><section className="management-section" aria-labelledby="unavailable-title"><p className="eyebrow">EXCEPȚII DE LA PROGRAM</p><h2 id="unavailable-title">Perioade de indisponibilitate</h2>{resource.blocks.length ? <ul className="block-list">{resource.blocks.map((block) => <li key={block.id}><div><strong>{block.reason}</strong><p>{formatDateTime(block.startAt)} — {formatDateTime(block.endAt)}</p></div></li>)}</ul> : <p className="small-note mt-5">Nu există blocări înregistrate.</p>}</section></div>
        {user?.role === 'USER' && resource.isActive && <BookingForm resourceId={resource.id} requiresApproval={resource.requiresApproval} />}
      </>}
    </>}
  </SiteLayout>;
}
