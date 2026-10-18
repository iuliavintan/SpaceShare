import { request } from '../../lib/http';
import { readArray, readInteger, readObject, readString } from '../../lib/api-values';

export type NotificationType = 'BOOKING_APPROVED' | 'BOOKING_REJECTED' | 'BOOKING_CANCELLED';
export interface SpaceShareNotification {
  id: string;
  bookingId: string | null;
  type: NotificationType;
  message: string;
  readAt: string | null;
  createdAt: string;
  booking: { id: string; startAt: string; resource: { name: string } } | null;
}

function readNotification(value: unknown): SpaceShareNotification {
  const row = readObject(value);
  const type = row.type;
  if (type !== 'BOOKING_APPROVED' && type !== 'BOOKING_REJECTED' && type !== 'BOOKING_CANCELLED') throw new Error('Tip de notificare invalid în răspuns.');
  let booking: SpaceShareNotification['booking'] = null;
  if (row.booking !== null) {
    const bookingRow = readObject(row.booking);
    const resource = readObject(bookingRow.resource);
    booking = { id: readString(bookingRow.id), startAt: readString(bookingRow.startAt), resource: { name: readString(resource.name) } };
  }
  return {
    id: readString(row.id), bookingId: row.bookingId === null ? null : readString(row.bookingId), type,
    message: readString(row.message), readAt: row.readAt === null ? null : readString(row.readAt), createdAt: readString(row.createdAt), booking,
  };
}

export const notificationsApi = {
  async list(signal?: AbortSignal) {
    const row = readObject(await request('/notifications', 'GET', undefined, signal));
    return { unreadCount: readInteger(row.unreadCount), notifications: readArray(row.notifications, readNotification) };
  },
  async markRead(id: string) {
    const row = readObject(await request(`/notifications/${encodeURIComponent(id)}/read`, 'PATCH', {}));
    return readNotification(readObject(row).notification);
  },
};
