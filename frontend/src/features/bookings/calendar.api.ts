import { readArray, readBoolean, readInteger, readObject, readString } from '../../lib/api-values';
import { request } from '../../lib/http';
import type { AvailabilityWindow } from '../resources/resources.types';

export interface ResourceCalendarFeed {
  resource: { id: string; name: string; isActive: boolean };
  availability: AvailabilityWindow[];
  events: Array<{ id: string; kind: 'BOOKING' | 'BLOCK'; startAt: string; endAt: string }>;
}

export const calendarApi = {
  async read(resourceId: string, range: { startAt: string; endAt: string }, signal?: AbortSignal): Promise<ResourceCalendarFeed> {
    const query = new URLSearchParams(range);
    const row = readObject(await request(`/resources/${encodeURIComponent(resourceId)}/calendar?${query}`, 'GET', undefined, signal));
    const resource = readObject(row.resource);
    const availability = readArray(row.availability, (value) => {
      const window = readObject(value);
      return { dayOfWeek: readInteger(window.dayOfWeek), startMinute: readInteger(window.startMinute), endMinute: readInteger(window.endMinute) };
    });
    const events = readArray(row.events, (value) => {
      const event = readObject(value);
      if (event.kind !== 'BOOKING' && event.kind !== 'BLOCK') throw new Error('Tip de eveniment calendaristic invalid.');
      const kind: 'BOOKING' | 'BLOCK' = event.kind;
      return { id: readString(event.id), kind, startAt: readString(event.startAt), endAt: readString(event.endAt) };
    });
    return { resource: { id: readString(resource.id), name: readString(resource.name), isActive: readBoolean(resource.isActive) }, availability, events };
  },
};
