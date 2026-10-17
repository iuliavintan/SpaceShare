import { createApp } from '../../src/app.js';
import { createDatabaseClient } from '../../src/db/client.js';
import type { AuthConfig } from '../../src/config/auth.js';

const url = process.env.DATABASE_URL!;
const config = JSON.parse(process.env.SPACESHARE_TEST_CONFIG!) as AuthConfig;
const client = createDatabaseClient(url);
const server = createApp(client, config, () => new Date('2030-01-01T00:00:00Z')).listen(0, '127.0.0.1', () => {
  const address = server.address();
  if (address && typeof address !== 'string') process.send?.({ type: 'ready', base: `http://127.0.0.1:${address.port}/api` });
});

process.on('message', async (message: unknown) => {
  if (typeof message !== 'object' || message === null || !('type' in message) || message.type !== 'lock') return;
  const lock = createDatabaseClient(url);
  await lock.$executeRawUnsafe('BEGIN IMMEDIATE');
  process.send?.({ type: 'locked' });
  setTimeout(() => { void lock.$executeRawUnsafe('COMMIT').then(() => lock.$disconnect()); }, 250);
});

process.on('disconnect', () => {
  server.close(() => { void client.$disconnect(); });
  server.closeAllConnections();
});
