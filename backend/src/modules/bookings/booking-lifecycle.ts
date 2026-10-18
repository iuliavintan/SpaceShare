import type { Prisma } from '../../../generated/prisma/client.js';

export async function settleBookings(transaction: Prisma.TransactionClient, now: Date) {
  await transaction.booking.updateMany({ where: { status: 'APPROVED', endAt: { lte: now } }, data: { status: 'COMPLETED' } });
  const expired = await transaction.booking.findMany({
    where: { status: 'PENDING', startAt: { lte: now } },
    select: { id: true, userId: true, resource: { select: { name: true } } },
  });
  if (!expired.length) return;
  await transaction.booking.updateMany({ where: { id: { in: expired.map(({ id }) => id) }, status: 'PENDING' }, data: { status: 'REJECTED', decidedAt: now, decidedById: null } });
  await transaction.notification.createMany({
    data: expired.map(({ id, userId, resource }) => ({
      userId,
      bookingId: id,
      type: 'BOOKING_REJECTED',
      message: `Cererea ta pentru „${resource.name}” a fost respinsă automat deoarece ora de început a trecut fără decizie.`,
      createdAt: now,
    })),
  });
}
