import { request } from '../../lib/http';
import { readArray, readInteger, readObject, readString } from '../../lib/api-values';
import { bookingStatuses, type BookingStatus } from '../bookings/bookings.types';

export interface DashboardBooking {
  id: string;
  startAt: string;
  endAt: string;
  status: BookingStatus;
  resource: { id: string; name: string; location: string };
  user?: { id: string; name: string; email: string };
}

export interface UserDashboard {
  role: 'USER';
  statistics: { bookings: { total: number; pending: number; approved: number; rejected: number; cancelled: number; completed: number } };
  upcomingBookings: DashboardBooking[];
  historyBookings: DashboardBooking[];
}

export interface AdminDashboard {
  role: 'ADMIN';
  statistics: {
    resources: { total: number; active: number };
    bookings: { total: number; pending: number; approved: number; rejected: number; cancelled: number; completed: number };
  };
  pendingBookings: DashboardBooking[];
  recentBookings: DashboardBooking[];
}

function readBooking(value: unknown): DashboardBooking {
  const row = readObject(value);
  const resource = readObject(row.resource);
  const status = bookingStatuses.find((candidate) => candidate === row.status);
  if (!status) throw new Error('Status de rezervare invalid în răspuns.');
  const person = row.user === undefined ? undefined : readObject(row.user);
  return {
    id: readString(row.id), startAt: readString(row.startAt), endAt: readString(row.endAt), status: status as BookingStatus,
    resource: { id: readString(resource.id), name: readString(resource.name), location: readString(resource.location) },
    ...(person ? { user: { id: readString(person.id), name: readString(person.name), email: readString(person.email) } } : {}),
  };
}

function readBookingStatistics(value: unknown) {
  const row = readObject(value);
  return { total: readInteger(row.total), pending: readInteger(row.pending), approved: readInteger(row.approved), rejected: readInteger(row.rejected), cancelled: readInteger(row.cancelled), completed: readInteger(row.completed) };
}

export const dashboardApi = {
  async get(signal?: AbortSignal): Promise<UserDashboard | AdminDashboard> {
    const row = readObject(await request('/dashboard', 'GET', undefined, signal));
    const statistics = readObject(row.statistics);
    if (row.role === 'ADMIN') {
      const resources = readObject(statistics.resources);
      return {
        role: 'ADMIN',
        statistics: { resources: { total: readInteger(resources.total), active: readInteger(resources.active) }, bookings: readBookingStatistics(statistics.bookings) },
        pendingBookings: readArray(row.pendingBookings, readBooking), recentBookings: readArray(row.recentBookings, readBooking),
      };
    }
    if (row.role !== 'USER') throw new Error('Rol de dashboard invalid în răspuns.');
    return { role: 'USER', statistics: { bookings: readBookingStatistics(statistics.bookings) }, upcomingBookings: readArray(row.upcomingBookings, readBooking), historyBookings: readArray(row.historyBookings, readBooking) };
  },
};
