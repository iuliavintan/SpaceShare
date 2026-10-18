import { useCallback } from 'react';
import { SiteLayout } from '../components/SiteLayout';
import { ResourceCalendar } from '../features/bookings/ResourceCalendar';
import { resourcesApi } from '../features/resources/resources.api';
import { useRemoteData } from '../features/resources/useRemoteData';

export function ResourceCalendarPage({ id }: { id: string }) {
  const load = useCallback((signal: AbortSignal) => resourcesApi.detail(id, signal), [id]);
  const detail = useRemoteData(load);
  const resource = detail.data;
  return <SiteLayout mainClassName="catalog-page">
    <a href={`#/resources/${encodeURIComponent(id)}`} className="back-link">← Înapoi la resursă</a>
    {detail.loading && <p role="status" className="small-note mt-8">Se încarcă resursa…</p>}
    {detail.error && <><p role="alert" className="form-feedback error mt-6">{detail.error}</p><button onClick={detail.reload} className="secondary-button mt-4">Încearcă din nou</button></>}
    {resource && <>
      <header className="calendar-page-heading"><div><p className="eyebrow">{resource.category.name} / {resource.location}</p><h1 className="page-title">{resource.name}<span className="text-accent">.</span></h1><p className="small-note">Program de funcționare și intervale ocupate, afișate în ora României.</p></div><a href={`#/resources/${encodeURIComponent(id)}`} className="secondary-button">Detalii resursă ↗</a></header>
      <ResourceCalendar resourceId={id} requiresApproval={resource.requiresApproval} />
    </>}
  </SiteLayout>;
}
