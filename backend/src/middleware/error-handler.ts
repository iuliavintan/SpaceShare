import type { ErrorRequestHandler } from 'express';
import { HttpError } from '../shared/http-error.js';
import { Prisma } from '../../generated/prisma/client.js';

function overlapTriggerMessage(error: Prisma.PrismaClientKnownRequestError): string | undefined {
  if (error.code !== 'P2003' || !error.meta) return undefined;
  const adapter = error.meta.driverAdapterError;
  if (typeof adapter !== 'object' || adapter === null || !('cause' in adapter)) return undefined;
  const cause = adapter.cause;
  if (typeof cause !== 'object' || cause === null || !('originalCode' in cause) || !('originalMessage' in cause)) return undefined;
  // The SQLite adapter reports RAISE(ABORT) triggers as P2003. Match only
  // SpaceShare's markers so genuine foreign-key failures remain HTTP 400.
  if (cause.originalCode !== 'SQLITE_CONSTRAINT_TRIGGER') return undefined;
  if (cause.originalMessage === 'SPACESHARE_BOOKING_CONFLICT') return 'Rezervarea se suprapune unei rezervari active sau unei blocari.';
  if (cause.originalMessage === 'SPACESHARE_BLOCK_CONFLICT') return 'Blocarea se suprapune unei rezervari active sau altei blocari.';
  return undefined;
}

export const errorHandler: ErrorRequestHandler = (error: unknown, _request, response, _next) => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const overlap = overlapTriggerMessage(error);
    if (overlap) error = new HttpError(409, overlap);
    else if (error.code === 'P2002') error = new HttpError(409, 'Aceasta valoare exista deja.');
    else if (error.code === 'P2003') error = new HttpError(400, 'Referinta la datele asociate nu este valida.');
    else if (error.code === 'P2025') error = new HttpError(404, 'Inregistrarea nu exista.');
  }
  const invalidJson = error instanceof SyntaxError && 'status' in error && error.status === 400;
  const tooLarge = typeof error === 'object' && error !== null && 'type' in error && error.type === 'entity.too.large';
  response.status(error instanceof HttpError ? error.status : invalidJson ? 400 : tooLarge ? 413 : 500).json({
    error: error instanceof HttpError ? error.message : invalidJson ? 'Corpul cererii nu este JSON valid.' : tooLarge ? 'Cererea este prea mare.' : 'A aparut o eroare interna.',
  });
};
