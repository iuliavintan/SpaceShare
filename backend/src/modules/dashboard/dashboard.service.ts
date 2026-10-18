import type { Prisma, PrismaClient } from '../../../generated/prisma/client.js';
import type { PublicUser } from '../users/user.types.js';
import { databaseTransaction } from '../../db/transaction.js';
import { settleBookings } from '../bookings/booking-lifecycle.js';

const bookingInclude = {
  resource: { select: { id: true, name: true, location: true } },
  user: { select: { id: true, name: true, email: true } },
} as const;

export function dashboardService(client: PrismaClient, clock: () => Date) {
  return {
    async get(user: PublicUser) {
      return databaseTransaction(client, async (transaction) => {
        const now = clock();
        await settleBookings(transaction, now);
        if (user.role === 'ADMIN') {
          const [resourcesTotal, resourcesActive, bookingsTotal, pending, approved, rejected, cancelled, completed, pendingBookings, recentBookings] = await Promise.all([
            transaction.resource.count(),
            transaction.resource.count({ where: { isActive: true } }),
            transaction.booking.count(),
            transaction.booking.count({ where: { status: 'PENDING' } }),
            transaction.booking.count({ where: { status: 'APPROVED' } }),
            transaction.booking.count({ where: { status: 'REJECTED' } }),
            transaction.booking.count({ where: { status: 'CANCELLED' } }),
            transaction.booking.count({ where: { status: 'COMPLETED' } }),
            transaction.booking.findMany({ where: { status: 'PENDING' }, include: bookingInclude, orderBy: [{ startAt: 'asc' }, { id: 'asc' }], take: 6 }),
            transaction.booking.findMany({ include: bookingInclude, orderBy: [{ createdAt: 'desc' }, { id: 'asc' }], take: 6 }),
          ]);
          return {
            role: user.role,
            statistics: { resources: { total: resourcesTotal, active: resourcesActive }, bookings: { total: bookingsTotal, pending, approved, rejected, cancelled, completed } },
            pendingBookings,
            recentBookings,
          };
        }

        const ownerWhere: Prisma.BookingWhereInput = { userId: user.id };
        const [upcomingBookings, historyBookings, totalBookings, pending, approved, rejected, cancelled, completed] = await Promise.all([
          transaction.booking.findMany({ where: { ...ownerWhere, startAt: { gt: now }, status: { in: ['PENDING', 'APPROVED'] } }, include: { resource: bookingInclude.resource }, orderBy: [{ startAt: 'asc' }, { id: 'asc' }], take: 6 }),
          transaction.booking.findMany({ where: { ...ownerWhere, OR: [{ startAt: { lte: now } }, { status: { in: ['REJECTED', 'CANCELLED'] } }] }, include: { resource: bookingInclude.resource }, orderBy: [{ startAt: 'desc' }, { id: 'asc' }], take: 6 }),
          transaction.booking.count({ where: ownerWhere }),
          transaction.booking.count({ where: { ...ownerWhere, status: 'PENDING' } }),
          transaction.booking.count({ where: { ...ownerWhere, status: 'APPROVED' } }),
          transaction.booking.count({ where: { ...ownerWhere, status: 'REJECTED' } }),
          transaction.booking.count({ where: { ...ownerWhere, status: 'CANCELLED' } }),
          transaction.booking.count({ where: { ...ownerWhere, status: 'COMPLETED' } }),
        ]);
        return { role: user.role, statistics: { bookings: { total: totalBookings, pending, approved, rejected, cancelled, completed } }, upcomingBookings, historyBookings };
      });
    },
  };
}
