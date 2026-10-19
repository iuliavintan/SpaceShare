import type { Prisma } from '../../../generated/prisma/client.js';

type ScheduledResource = Prisma.ResourceGetPayload<{ include: { availability: true } }>;
type Interval = { startAt: Date; endAt: Date };
const formatter = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Bucharest', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Check every real minute, so midnight and repeated/skipped DST hours follow
// Bucharest's calendar rather than the server's local timezone.
function withinOpeningHours(resource: ScheduledResource, interval: Interval) {
  for (let timestamp = interval.startAt.getTime(); timestamp < interval.endAt.getTime(); timestamp += 60000) {
    const parts = Object.fromEntries(formatter.formatToParts(new Date(timestamp)).map((part) => [part.type, part.value]));
    const dayOfWeek = days.indexOf(parts.weekday!) + 1;
    const minute = Number(parts.hour) * 60 + Number(parts.minute);
    if (!resource.availability.some((window) => window.dayOfWeek === dayOfWeek && window.startMinute <= minute && minute < window.endMinute)) return false;
  }
  return true;
}

export async function availabilityResult(transaction: Prisma.TransactionClient, resource: ScheduledResource, interval: Interval, excludeBookingId?: string) {
  if (!resource.isActive) return { available: false, code: 'INACTIVE', message: 'Resursa este dezactivata.' };
  if (!withinOpeningHours(resource, interval)) return { available: false, code: 'OUTSIDE_HOURS', message: 'Intervalul orar nu este inclus integral in program.' };
  const overlap = { resourceId: resource.id, startAt: { lt: interval.endAt }, endAt: { gt: interval.startAt } };
  if (await transaction.resourceBlock.count({ where: overlap })) return { available: false, code: 'RESOURCE_BLOCK', message: 'Resursa este blocata in acest interval.' };
  if (await transaction.booking.count({ where: { ...overlap, id: excludeBookingId ? { not: excludeBookingId } : undefined, status: { in: ['PENDING', 'APPROVED'] } } })) return { available: false, code: 'BOOKING_CONFLICT', message: 'Exista deja o rezervare in acest interval.' };
  return { available: true, code: 'AVAILABLE', message: 'Intervalul este disponibil. Disponibilitatea este verificata din nou la rezervare.' };
}
