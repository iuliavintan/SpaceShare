import type { Prisma, PrismaClient } from '../../../generated/prisma/client.js';
import { HttpError } from '../../shared/http-error.js';
import type { PublicUser } from '../users/user.types.js';
import type { bookingFilters, bookingInput } from './bookings.validation.js';
import { availabilityResult } from './availability.js';
import { databaseTransaction } from '../../db/transaction.js';
import { settleBookings } from './booking-lifecycle.js';

const include = {
  resource: { select: { id: true, name: true, location: true, isActive: true } },
  user: { select: { id: true, name: true, email: true } },
  decidedBy: { select: { id: true, name: true } },
} as const;

export type BookingAction = 'approve' | 'reject' | 'cancel';

export function bookingsService(client: PrismaClient, clock: () => Date) {
  return {
    async transition(user: PublicUser, id: string, action: BookingAction) {
      if (action !== 'cancel' && user.role !== 'ADMIN') throw new HttpError(403, 'Doar administratorii pot decide cererile.');
      return databaseTransaction(client, async (transaction) => {
        const now = clock();
        await settleBookings(transaction, now);
        const booking = await transaction.booking.findFirst({ where: { id, ...(user.role === 'ADMIN' ? {} : { userId: user.id }) } });
        if (!booking) throw new HttpError(404, 'Rezervarea nu exista.');
        if (action === 'cancel') {
          if (!['PENDING', 'APPROVED'].includes(booking.status) || booking.endAt <= now || (user.role !== 'ADMIN' && booking.startAt <= now)) throw new HttpError(409, 'Rezervarea nu mai poate fi anulata.');
        } else {
          if (booking.status !== 'PENDING' || booking.startAt <= now) throw new HttpError(409, 'Cererea nu mai poate fi aprobata sau respinsa.');
          if (action === 'approve') {
            const resource = await transaction.resource.findUniqueOrThrow({ where: { id: booking.resourceId }, include: { availability: true } });
            const result = await availabilityResult(transaction, resource, booking, booking.id);
            if (!result.available) throw new HttpError(409, result.message);
          }
        }
        const updated = await transaction.booking.update({
          where: { id, status: booking.status },
          data: { status: action === 'approve' ? 'APPROVED' : action === 'reject' ? 'REJECTED' : 'CANCELLED', decidedAt: now, decidedById: user.id }, include,
        });
        const type = action === 'approve' ? 'BOOKING_APPROVED' : action === 'reject' ? 'BOOKING_REJECTED' : user.role === 'ADMIN' ? 'BOOKING_CANCELLED' : null;
        if (type) {
          const message = type === 'BOOKING_APPROVED'
            ? `Rezervarea ta pentru „${updated.resource.name}” a fost aprobată.`
            : type === 'BOOKING_REJECTED'
              ? `Cererea ta pentru „${updated.resource.name}” a fost respinsă.`
              : `Rezervarea ta pentru „${updated.resource.name}” a fost anulată de administrator.`;
          await transaction.notification.create({ data: { userId: booking.userId, bookingId: booking.id, type, message, createdAt: now } });
        }
        return updated;
      });
    },
    async create(user: PublicUser, data: ReturnType<typeof bookingInput>) {
      return databaseTransaction(client, async (transaction) => {
        const now = clock();
        if (data.startAt <= now) throw new HttpError(400, 'Rezervarea trebuie sa inceapa in viitor.');
        await settleBookings(transaction, now);
        const resource = await transaction.resource.findUnique({ where: { id: data.resourceId }, include: { availability: true } });
        if (!resource?.isActive) throw new HttpError(404, 'Resursa nu exista sau este dezactivata.');
        const result = await availabilityResult(transaction, resource, data);
        if (!result.available) throw new HttpError(409, result.message);
        return transaction.booking.create({ data: { ...data, userId: user.id, status: resource.requiresApproval ? 'PENDING' : 'APPROVED' }, include });
      });
    },
    async availability(user: PublicUser, resourceId: string, interval: { startAt: Date; endAt: Date }) {
      if (interval.startAt <= clock()) throw new HttpError(400, 'Intervalul trebuie sa inceapa in viitor.');
      return databaseTransaction(client, async (transaction) => {
        await settleBookings(transaction, clock());
        const resource = await transaction.resource.findUnique({ where: { id: resourceId }, include: { availability: true } });
        if (!resource || (!resource.isActive && user.role !== 'ADMIN')) throw new HttpError(404, 'Resursa nu exista sau este dezactivata.');
        return availabilityResult(transaction, resource, interval);
      });
    },
    async calendar(user: PublicUser, resourceId: string, range: { startAt: Date; endAt: Date }) {
      return databaseTransaction(client, async (transaction) => {
        await settleBookings(transaction, clock());
        const resource = await transaction.resource.findUnique({ where: { id: resourceId }, include: { availability: { orderBy: [{ dayOfWeek: 'asc' }, { startMinute: 'asc' }] } } });
        if (!resource || (!resource.isActive && user.role !== 'ADMIN')) throw new HttpError(404, 'Resursa nu exista sau este dezactivata.');
        const overlap = { resourceId, startAt: { lt: range.endAt }, endAt: { gt: range.startAt } };
        const [bookings, blocks] = await Promise.all([
          transaction.booking.findMany({ where: { ...overlap, status: { in: ['PENDING', 'APPROVED'] } }, select: { id: true, startAt: true, endAt: true } }),
          transaction.resourceBlock.findMany({ where: overlap, select: { id: true, startAt: true, endAt: true } }),
        ]);
        const events = [
          ...bookings.map(({ id, startAt, endAt }) => ({ id: `booking:${id}`, kind: 'BOOKING' as const, startAt, endAt })),
          ...blocks.map(({ id, startAt, endAt }) => ({ id: `block:${id}`, kind: 'BLOCK' as const, startAt, endAt })),
        ].sort((left, right) => left.startAt.getTime() - right.startAt.getTime());
        return {
          resource: { id: resource.id, name: resource.name, isActive: resource.isActive },
          availability: resource.availability.map(({ dayOfWeek, startMinute, endMinute }) => ({ dayOfWeek, startMinute, endMinute })),
          events,
        };
      });
    },
    async list(user: PublicUser, filters: ReturnType<typeof bookingFilters>) {
      if (filters.scope === 'all' && user.role !== 'ADMIN') throw new HttpError(403, 'Doar administratorii pot vedea toate rezervarile.');
      const where: Prisma.BookingWhereInput = { userId: filters.scope === 'mine' ? user.id : undefined, status: filters.status, resourceId: filters.resourceId };
      return databaseTransaction(client, async (transaction) => {
        await settleBookings(transaction, clock());
        const total = await transaction.booking.count({ where });
        const bookings = await transaction.booking.findMany({ where, include, orderBy: [{ startAt: 'desc' }, { id: 'asc' }], skip: (filters.page - 1) * filters.pageSize, take: filters.pageSize });
        return { total, bookings, page: filters.page, pageSize: filters.pageSize };
      });
    },
    async detail(user: PublicUser, id: string) {
      return databaseTransaction(client, async (transaction) => {
        await settleBookings(transaction, clock());
        const booking = await transaction.booking.findFirst({ where: { id, ...(user.role === 'ADMIN' ? {} : { userId: user.id }) }, include });
        if (!booking) throw new HttpError(404, 'Rezervarea nu exista.');
        return booking;
      });
    },
  };
}
