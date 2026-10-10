import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '../../generated/prisma/client.js';
import { databaseUrl } from '../config/database.js';

export function createDatabaseClient(url = databaseUrl) {
  const adapter = new PrismaBetterSqlite3({ url }, { timestampFormat: 'unixepoch-ms' });
  return new PrismaClient({ adapter });
}

export const prisma = createDatabaseClient();
