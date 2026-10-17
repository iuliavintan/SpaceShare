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
      <header className="resource-detail-heading"><div><p className="eyebrow">{resource.category.name}</p><h1 className="page-title">{resource.name}</h1><div className="resource-meta"><span>{resource.location}</span><span>Capacitate: {resource.capacity}</span><span>Aprobare {resource.requiresApproval ? 'manuală' : 'automată'}</span>{!resource.isActive && <span className="resource-badge inactive">Inactivă</span>}</div></div>{!manage && user?.role === 'ADMIN' && <a href={`#/admin/resources/${encodeURIComponent(id)}`} className="secondary-button">Gestionează resursa ↗</a>}</header>
      {message && <p role="status" className="form-feedback success mb-6">{message}</p>}
      {manage ? <>
        {categories.error ? <><p role="alert" className="form-feedback error">{categories.error}</p><button className="secondary-button mt-4" onClick={categories.reload}>Reîncarcă categoriile</button></> : categories.data ? <ResourceForm key={resource.id} resource={resource} categories={categories.data} onSaved={() => saved('Resursa a fost salvată.')} /> : <p role="status">Se încarcă categoriile…</p>}
        <AvailabilityEditor id={id} windows={resource.availability} onSaved={() => saved('Programul a fost salvat.')} />
        <BlocksEditor id={id} blocks={resource.blocks} onSaved={() => saved('Blocările au fost actualizate.')} />
      </> : <>
        <section className="resource-description" aria-labelledby="description-title"><h2 id="description-title">Despre resursă</h2><p>{resource.description}</p><h3>Facilități</h3>{resource.facilities.length ? <ul className="facilities-list">{resource.facilities.map((facility) => <li key={facility}>{facility}</li>)}</ul> : <p className="small-note">Nu sunt specificate facilități.</p>}</section>
        <div className="resource-detail-columns"><section className="management-section" aria-labelledby="schedule-title"><p className="eyebrow">EUROPE/BUCHAREST</p><h2 id="schedule-title">Program de funcționare</h2><dl className="weekly-schedule">{weekdays.map((day, index) => <div key={day}><dt>{day}</dt><dd>{resource.availability.filter((window) => window.dayOfWeek === index + 1).map((window) => `${formatMinute(window.startMinute)}–${formatMinute(window.endMinute)}`).join(', ') || 'Închis'}</dd></div>)}</dl></section><section className="management-section" aria-labelledby="unavailable-title"><p className="eyebrow">EXCEPȚII DE LA PROGRAM</p><h2 id="unavailable-title">Perioade de indisponibilitate</h2>{resource.blocks.length ? <ul className="block-list">{resource.blocks.map((block) => <li key={block.id}><div><strong>{block.reason}</strong><p>{formatDateTime(block.startAt)} — {formatDateTime(block.endAt)}</p></div></li>)}</ul> : <p className="small-note mt-5">Nu există blocări înregistrate.</p>}</section></div>
        {user?.role === 'USER' && resource.isActive && <BookingForm resourceId={resource.id} requiresApproval={resource.requiresApproval} />}
      </>}
    </>}
  </SiteLayout>;
}
