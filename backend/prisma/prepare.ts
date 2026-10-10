import { createDatabaseClient } from '../src/db/client.js';

// Prisma 7.10 on this Windows setup needs the SQLite file to exist before deploy.
// Opening it through the adapter creates an empty file without changing existing data.
const client = createDatabaseClient();
try {
  await client.$queryRaw`SELECT 1`;
} finally {
  await client.$disconnect();
}
