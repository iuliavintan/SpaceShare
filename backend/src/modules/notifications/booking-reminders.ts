import type { Prisma, PrismaClient } from '../../../generated/prisma/client.js';
import { databaseTransaction } from '../../db/transaction.js';

const reminderWindowMs = 60 * 60 * 1000;

export async function createUpcomingBookingReminders(transaction: Prisma.TransactionClient, now: Date) {
  const bookings = await transaction.booking.findMany({
    where: { status: 'APPROVED', startAt: { gt: now, lte: new Date(now.getTime() + reminderWindowMs) } },
    select: { id: true, userId: true, resource: { select: { name: true } } },
  });

  for (const booking of bookings) {
    await transaction.notification.upsert({
      where: { userId_bookingId_type: { userId: booking.userId, bookingId: booking.id, type: 'BOOKING_REMINDER' } },
      create: {
        userId: booking.userId,
        bookingId: booking.id,
        type: 'BOOKING_REMINDER',
        message: `Rezervarea ta pentru „${booking.resource.name}” începe în mai puțin de o oră.`,
        createdAt: now,
      },
      update: {},
    });
  }
}

export function startBookingReminderWorker(client: PrismaClient, onError: (error: unknown) => void = console.error) {
  let running = false;
  const tick = () => {
    if (running) return;
    running = true;
    void databaseTransaction(client, (transaction) => createUpcomingBookingReminders(transaction, new Date()))
      .catch(onError)
      .finally(() => { running = false; });
  };

  tick();
  const interval = setInterval(tick, 60_000);
  interval.unref();
  return () => clearInterval(interval);
}
