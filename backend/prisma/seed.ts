import { pathToFileURL } from 'node:url';
import type { PrismaClient } from '../generated/prisma/client.js';
import { createDatabaseClient } from '../src/db/client.js';
import { demoResources } from './seed-data.js';

export async function seedDatabase(client: PrismaClient) {
  await client.$transaction(async (transaction) => {
    for (const demo of demoResources) {
      const { category: categoryName, ...resourceData } = demo;
      const category = await transaction.category.upsert({
        where: { name: categoryName }, update: {}, create: { name: categoryName },
      });
      // Repeated seeding preserves edits to existing demo resources and schedules.
      await transaction.resource.upsert({
        where: { id: demo.id }, update: {},
        create: {
          ...resourceData, categoryId: category.id,
          availability: { create: [1, 2, 3, 4, 5].map((dayOfWeek) => ({
            dayOfWeek, startMinute: 8 * 60, endMinute: 20 * 60,
          })) },
        },
      });
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const client = createDatabaseClient();
  try {
    await seedDatabase(client);
    console.log('Date demonstrative pregatite: 4 categorii si 4 resurse.');
  } catch (error: unknown) {
    console.error('Seed esuat:', error instanceof Error ? error.message : 'Eroare necunoscuta.');
    process.exitCode = 1;
  } finally {
    await client.$disconnect();
  }
}
