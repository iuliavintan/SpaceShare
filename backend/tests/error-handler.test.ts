import assert from 'node:assert/strict';
import { once } from 'node:events';
import express from 'express';
import { test } from 'node:test';
import { Prisma } from '../generated/prisma/client.js';
import { errorHandler } from '../src/middleware/error-handler.js';

function triggerError(marker: string) {
  return new Prisma.PrismaClientKnownRequestError('Foreign key constraint violated on the foreign key', {
    code: 'P2003', clientVersion: 'test', meta: {
      modelName: 'Booking',
      driverAdapterError: { name: 'DriverAdapterError', cause: { originalCode: 'SQLITE_CONSTRAINT_TRIGGER', originalMessage: marker, kind: 'ForeignKeyConstraintViolation', constraint: { foreignKey: {} } } },
    },
  });
}

async function responseStatus(error: Error) {
  const app = express();
  app.get('/probe', (_request, _response, next) => next(error));
  app.use(errorHandler);
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  try { return (await fetch(`http://127.0.0.1:${address.port}/probe`)).status; }
  finally { await new Promise<void>((resolve) => { server.close(() => resolve()); server.closeAllConnections(); }); }
}

test('SQLite overlap trigger errors become 409 while real foreign-key errors remain 400', async () => {
  assert.equal(await responseStatus(triggerError('SPACESHARE_BOOKING_CONFLICT')), 409);
  assert.equal(await responseStatus(triggerError('SPACESHARE_BLOCK_CONFLICT')), 409);
  assert.equal(await responseStatus(new Prisma.PrismaClientKnownRequestError('foreign key', { code: 'P2003', clientVersion: 'test' })), 400);
});
