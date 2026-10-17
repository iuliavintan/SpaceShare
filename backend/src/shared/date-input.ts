import { HttpError } from './http-error.js';

export function dateInput(value: unknown): Date {
  if (typeof value !== 'string') throw new HttpError(400, 'Data si fusul orar sunt obligatorii.');
  const match = /^(\d{4})-(\d{2})-(\d{2})T([01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,3})?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.exec(value);
  const date = new Date(value);
  const year = Number(match?.[1]), month = Number(match?.[2]), day = Number(match?.[3]);
  const calendarDate = new Date(Date.UTC(year, month - 1, day));
  if (!match || !Number.isFinite(date.getTime()) || calendarDate.getUTCFullYear() !== year || calendarDate.getUTCMonth() !== month - 1 || calendarDate.getUTCDate() !== day) throw new HttpError(400, 'Data trebuie sa fie ISO valida, cu fus orar explicit.');
  return date;
}
