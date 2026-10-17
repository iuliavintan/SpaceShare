import { request } from '../../lib/http';
import { readArray, readBoolean, readInteger, readObject, readString } from '../../lib/api-values';
import { bookingStatuses, type AvailabilityResult, type Booking, type BookingAction, type BookingFilters, type BookingInput, type BookingList } from './bookings.types';

function readPerson(value: unknown) { const row = readObject(value); return { id: readString(row.id), name: readString(row.name) }; }
function readBooking(value: unknown): Booking {
  const row = readObject(value), resource = readObject(row.resource), user = readObject(row.user);
  const status = bookingStatuses.find((status) => status === row.status);
  if (!status) throw new Error('Status de rezervare invalid în răspuns.');
  return {
    id: readString(row.id), userId: readString(row.userId), resourceId: readString(row.resourceId), startAt: readString(row.startAt), endAt: readString(row.endAt), status,
    reason: row.reason === null ? null : readString(row.reason), decidedAt: row.decidedAt === null ? null : readString(row.decidedAt), decidedBy: row.decidedBy === null ? null : readPerson(row.decidedBy),
    resource: { id: readString(resource.id), name: readString(resource.name), location: readString(resource.location), isActive: readBoolean(resource.isActive) },
    user: { ...readPerson(user), email: readString(user.email) },
  };
}

export const bookingsApi = {
  async create(input: BookingInput): Promise<Booking> { return readBooking(readObject(await request('/bookings', 'POST', input)).booking); },
  async detail(id: string, signal?: AbortSignal): Promise<Booking> { return readBooking(readObject(await request(`/bookings/${encodeURIComponent(id)}`, 'GET', undefined, signal)).booking); },
  async list(filters: BookingFilters, signal?: AbortSignal): Promise<BookingList> {
    const query = new URLSearchParams({ scope: filters.scope, page: String(filters.page) });
    if (filters.status) query.set('status', filters.status);
    const row = readObject(await request(`/bookings?${query}`, 'GET', undefined, signal));
    return { bookings: readArray(row.bookings, readBooking), total: readInteger(row.total), page: readInteger(row.page), pageSize: readInteger(row.pageSize) };
  },
  async transition(id: string, action: BookingAction): Promise<Booking> { return readBooking(readObject(await request(`/bookings/${encodeURIComponent(id)}/${action}`, 'POST', {})).booking); },
  async availability(resourceId: string, interval: { startAt: string; endAt: string }): Promise<AvailabilityResult> {
    const row = readObject(await request(`/resources/${encodeURIComponent(resourceId)}/availability?${new URLSearchParams(interval)}`));
    return { available: readBoolean(row.available), code: readString(row.code), message: readString(row.message) };
  },
};
