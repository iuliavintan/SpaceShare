import type { PrismaClient } from '../../../generated/prisma/client.js';
import type { PublicUser } from '../users/user.types.js';
import { databaseTransaction } from '../../db/transaction.js';
import { HttpError } from '../../shared/http-error.js';
import { settleBookings } from '../bookings/booking-lifecycle.js';
import { createUpcomingBookingReminders } from './booking-reminders.js';

const notificationInclude = { booking: { select: { id: true, startAt: true, resource: { select: { name: true } } } } } as const;

export function notificationsService(client: PrismaClient, clock: () => Date) {
  return {
    async list(user: PublicUser) {
      return databaseTransaction(client, async (transaction) => {
        const now = clock();
        await settleBookings(transaction, now);
        await createUpcomingBookingReminders(transaction, now);
        const where = { userId: user.id };
        const [unreadCount, notifications] = await Promise.all([
          transaction.notification.count({ where: { ...where, readAt: null } }),
          transaction.notification.findMany({ where, include: notificationInclude, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 30 }),
        ]);
        return { unreadCount, notifications };
      });
    },
    async markRead(user: PublicUser, id: string) {
      return databaseTransaction(client, async (transaction) => {
        await settleBookings(transaction, clock());
        const where = { id, userId: user.id };
        const current = await transaction.notification.findFirst({ where, include: notificationInclude });
        if (!current) throw new HttpError(404, 'Notificarea nu exista.');
        if (current.readAt) return { notification: current };
        const notification = await transaction.notification.update({ where: { id }, data: { readAt: clock() }, include: notificationInclude });
        return { notification };
      });
    },
  };
}
