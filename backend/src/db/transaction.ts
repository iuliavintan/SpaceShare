import { setTimeout } from 'node:timers/promises';
import { Prisma, type PrismaClient } from '../../generated/prisma/client.js';
import { HttpError } from '../shared/http-error.js';

// Retry the whole transaction with a fresh snapshot, never just its last write.
// Callbacks must contain database work only, with no external side effects.
export async function databaseTransaction<T>(client: PrismaClient, work: (transaction: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try { return await client.$transaction(work); }
    catch (error: unknown) {
      const transient = error instanceof Prisma.PrismaClientKnownRequestError && ['P1008', 'P2034'].includes(error.code);
      if (!transient) throw error;
      if (attempt >= 5) throw new HttpError(503, 'Baza de date este ocupata. Incearca din nou.');
      await setTimeout(25 * 2 ** attempt);
    }
  }
}
