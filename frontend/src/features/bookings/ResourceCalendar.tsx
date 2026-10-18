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

const calendarDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Bucharest',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function calendarDayNumber(date: Date): number {
  const parts = calendarDateFormatter.formatToParts(date);
  const year = Number(parts.find((part) => part.type === 'year')?.value);
  const month = Number(parts.find((part) => part.type === 'month')?.value);
  const day = Number(parts.find((part) => part.type === 'day')?.value);
  return Date.UTC(year, month - 1, day) / 86_400_000;
}

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
    color: event.kind === 'BOOKING' ? '#9a432f' : '#74776f',
    contrastColor: '#ffffff',
  })), [feed.data?.events]);
  const businessHours = useMemo(() => (feed.data?.availability ?? []).map((window) => ({
    daysOfWeek: [window.dayOfWeek % 7],
    startTime: formatMinute(window.startMinute),
    endTime: formatMinute(window.endMinute),
  })), [feed.data?.availability]);
  const dayHeaderClassNames = useCallback((info: { date: Date }) => {
    if (!feed.data) return undefined;
    const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'Europe/Bucharest' }).format(info.date);
    const day = ({ Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 } as Record<string, number>)[weekday];
    if (day === undefined) return undefined;
    return feed.data.availability.some((window) => window.dayOfWeek % 7 === day) ? undefined : 'calendar-day-unavailable';
  }, [feed.data]);
  const nowIndicatorLineClass = useCallback((info: { date: Date; view: { type: string; currentStart: Date } }) => {
    if (info.view.type !== 'timeGridWeek') return 'now-line-span-day';
    const dayOffset = Math.min(6, Math.max(0, calendarDayNumber(info.date) - calendarDayNumber(info.view.currentStart)));
    return `now-line-span-week now-line-offset-${dayOffset}`;
  }, []);
  function selectSlot(selectionInfo: DateSelectInfo) {
    setSelection({ startAt: new Date(selectionInfo.startStr).toISOString(), endAt: new Date(selectionInfo.endStr).toISOString() });
  }

  return <section className="management-section resource-calendar-section" aria-labelledby="resource-calendar-title">
    <div className="resource-calendar-heading"><div><p className="eyebrow">DISPONIBILITATE / EUROPE-BUCHAREST</p><h2 id="resource-calendar-title">Calendarul resursei</h2></div><p className="small-note">Alege ziua sau săptămâna.</p></div>
    {feed.error && <div className="calendar-load-error"><p role="alert" className="form-feedback error">{feed.error}</p><button className="secondary-button mt-3" onClick={feed.reload}>Reîncarcă calendarul</button></div>}
    {feed.loading && <p className="small-note" role="status">Se încarcă disponibilitatea…</p>}
    <div className="calendar-availability-legend" aria-label="Legendă calendar">
      <span><i className="calendar-swatch unavailable" />În afara programului</span>
      <span><i className="calendar-swatch booked" />Rezervat</span>
      <span><i className="calendar-swatch blocked" />Indisponibil</span>
    </div>
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
        nowIndicatorLineClass={nowIndicatorLineClass}
        events={events}
        businessHours={businessHours}
        dayHeaderClass={dayHeaderClassNames}
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
