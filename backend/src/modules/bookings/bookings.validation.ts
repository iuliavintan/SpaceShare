import type { BookingStatus } from '../../../generated/prisma/client.js';
import { dateInput } from '../../shared/date-input.js';
import { HttpError } from '../../shared/http-error.js';
import { objectInput, textInput } from '../../shared/validation.js';

const statuses: BookingStatus[] = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'COMPLETED'];

export function bookingInterval(data: Record<string, unknown>) {
  const startAt = dateInput(data.startAt), endAt = dateInput(data.endAt);
  if (startAt >= endAt || endAt.getTime() - startAt.getTime() > 86400000) throw new HttpError(400, 'Intervalul trebuie sa fie pozitiv si de maximum 24 de ore.');
  if (startAt.getTime() % 60000 || endAt.getTime() % 60000) throw new HttpError(400, 'Orele rezervarii trebuie sa aiba precizie de un minut.');
  return { startAt, endAt };
}

export function bookingInput(value: unknown) {
  const data = objectInput(value, ['resourceId', 'startAt', 'endAt', 'reason']);
  return { resourceId: textInput(data.resourceId, 'Resursa'), ...bookingInterval(data), reason: data.reason === undefined || data.reason === '' ? null : textInput(data.reason, 'Scop', 500) };
}

export function bookingFilters(value: unknown) {
  const data = objectInput(value, ['scope', 'status', 'resourceId', 'page', 'pageSize']);
  const scope = data.scope ?? 'mine';
  if (scope !== 'mine' && scope !== 'all') throw new HttpError(400, 'Lista de rezervari este invalida.');
  const status = data.status === undefined ? undefined : statuses.find((item) => item === data.status);
  if (data.status !== undefined && !status) throw new HttpError(400, 'Status de rezervare invalid.');
  function pageValue(key: string, fallback: number, max: number) {
    if (data[key] === undefined) return fallback;
    if (typeof data[key] !== 'string' || !/^\d+$/.test(data[key])) throw new HttpError(400, 'Pagina invalida.');
    const number = Number(data[key]);
    if (number < 1 || number > max) throw new HttpError(400, 'Pagina invalida.');
    return number;
  }
  return { scope, status, resourceId: data.resourceId === undefined ? undefined : textInput(data.resourceId, 'Resursa'), page: pageValue('page', 1, 100000), pageSize: pageValue('pageSize', 12, 50) };
}
