import { useCallback, useMemo, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import '@fullcalendar/react/skeleton.css';
import '@fullcalendar/react/themes/classic/theme.css';
import '@fullcalendar/react/themes/classic/palette.css';
import './calendar.css';
import classicThemePlugin from '@fullcalendar/react/themes/classic';
import interactionPlugin from '@fullcalendar/react/interaction';
import timeGridPlugin from '@fullcalendar/react/timegrid';
import romanianLocale from '@fullcalendar/react/locales/ro';
import type { DateSelectInfo, DatesSetInfo, EventInput } from '@fullcalendar/react';
import { useAuth } from '../auth/AuthProvider';
import { useRemoteData } from '../resources/useRemoteData';
import { formatMinute } from '../resources/resource-time';
import { BookingForm } from './BookingForm';
import { calendarApi } from './calendar.api';

export function ResourceCalendar({ resourceId, requiresApproval }: { resourceId: string; requiresApproval: boolean }) {
  const { user } = useAuth();
  const [range, setRange] = useState<{ startAt: string; endAt: string } | null>(null);
  const [selection, setSelection] = useState<{ startAt: string; endAt: string } | null>(null);
  const load = useCallback((signal: AbortSignal) => range
    ? calendarApi.read(resourceId, range, signal)
    : Promise.resolve(null), [range, resourceId]);
  const feed = useRemoteData(load);
  const onDatesSet = useCallback((dates: DatesSetInfo) => {
    const next = { startAt: dates.startStr, endAt: dates.endStr };
    setRange((current) => current && current.startAt === next.startAt && current.endAt === next.endAt ? current : next);
    setSelection(null);
  }, []);
  const events = useMemo<EventInput[]>(() => (feed.data?.events ?? []).map((event) => ({
    id: event.id,
    title: event.kind === 'BOOKING' ? 'Rezervat' : 'Indisponibil',
    start: event.startAt,
    end: event.endAt,
    backgroundColor: event.kind === 'BOOKING' ? '#9a432f' : '#74776f',
    borderColor: event.kind === 'BOOKING' ? '#803625' : '#5e625b',
    textColor: '#ffffff',
  })), [feed.data?.events]);
  const businessHours = useMemo(() => (feed.data?.availability ?? []).map((window) => ({
    daysOfWeek: [window.dayOfWeek % 7],
    startTime: formatMinute(window.startMinute),
    endTime: formatMinute(window.endMinute),
  })), [feed.data?.availability]);
  function selectSlot(selectionInfo: DateSelectInfo) {
    setSelection({ startAt: new Date(selectionInfo.startStr).toISOString(), endAt: new Date(selectionInfo.endStr).toISOString() });
  }

  return <section className="management-section resource-calendar-section" aria-labelledby="resource-calendar-title">
    <div className="resource-calendar-heading"><div><p className="eyebrow">DISPONIBILITATE / EUROPE-BUCHAREST</p><h2 id="resource-calendar-title">Calendarul resursei</h2></div><p className="small-note">Alege ziua sau săptămâna. Intervalele teracotă sunt rezervate; cele gri sunt blocate.</p></div>
    {feed.error && <div className="calendar-load-error"><p role="alert" className="form-feedback error">{feed.error}</p><button className="secondary-button mt-3" onClick={feed.reload}>Reîncarcă calendarul</button></div>}
    {feed.loading && <p className="small-note" role="status">Se încarcă disponibilitatea…</p>}
    <div className="resource-calendar">
      <FullCalendar
        plugins={[classicThemePlugin, interactionPlugin, timeGridPlugin]}
        locale={romanianLocale}
        timeZone="Europe/Bucharest"
        initialView="timeGridWeek"
        headerToolbar={{ left: 'prev,next today', center: 'title', right: 'timeGridDay,timeGridWeek' }}
        allDaySlot={false}
        slotMinTime="07:00:00"
        slotMaxTime="23:00:00"
        slotDuration="00:30:00"
        nowIndicator
        events={events}
        businessHours={businessHours}
        datesSet={onDatesSet}
        selectable={user?.role === 'USER' && !!feed.data?.resource.isActive}
        selectConstraint="businessHours"
        selectOverlap={false}
        select={selectSlot}
        unselectAuto
        height="auto"
        noEventsText="Nu există rezervări sau blocări în această perioadă."
      />
    </div>
    {selection && user?.role === 'USER' && feed.data?.resource.isActive && <div className="calendar-selection">
      <div><p className="eyebrow">INTERVAL SELECTAT</p><p>{new Intl.DateTimeFormat('ro-RO', { timeZone: 'Europe/Bucharest', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(selection.startAt))} – {new Intl.DateTimeFormat('ro-RO', { timeZone: 'Europe/Bucharest', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(selection.endAt))}</p></div>
      <p className="small-note">Verifică și trimite rezervarea. Intervalele ocupate sunt verificate din nou de server.</p>
      <BookingForm key={`${selection.startAt}/${selection.endAt}`} resourceId={resourceId} requiresApproval={requiresApproval} initialInterval={selection} onCreated={feed.reload} />
    </div>}
    {!feed.data?.resource.isActive && feed.data && <p className="form-feedback error mt-5">Resursa este dezactivată; calendarul este doar pentru consultare.</p>}
  </section>;
}
