import { copyFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { PrismaClient } from '../generated/prisma/client.js';
import { createDatabaseClient } from '../src/db/client.js';
import { demoResources } from './seed-data.js';
import { seedAdmin } from './seed-admin.js';

const demoFloorplans = [
  { resourceId: 'demo-study-room', filename: 'demo-study-room.svg', altText: 'Schiță orientativă a sălii de studiu A101, cu patru mese pentru opt persoane.' },
  { resourceId: 'demo-lab', filename: 'demo-lab.svg', altText: 'Schiță orientativă a laboratorului B201, cu douăsprezece posturi duble pentru 24 de persoane.' },
  { resourceId: 'demo-meeting-room', filename: 'demo-meeting-room.svg', altText: 'Schiță orientativă a sălii C102, cu o masă de ședință pentru 12 persoane.' },
];

export async function seedDatabase(client: PrismaClient, floorplanDirectory = join(process.cwd(), 'uploads', 'floorplans')) {
  await mkdir(floorplanDirectory, { recursive: true });
  for (const plan of demoFloorplans) {
    await copyFile(fileURLToPath(new URL(`./floorplans/${plan.filename}`, import.meta.url)), join(floorplanDirectory, plan.filename));
  }
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
    for (const plan of demoFloorplans) {
      if (await transaction.resourceImage.findFirst({ where: { resourceId: plan.resourceId, position: 0 } })) continue;
      await transaction.resourceImage.create({ data: { resourceId: plan.resourceId, path: plan.filename, altText: plan.altText, position: 0 } });
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const client = createDatabaseClient();
  try {
    await seedDatabase(client);
    await seedAdmin(client);
    console.log('Date demonstrative pregatite: 4 categorii si 4 resurse.');
  } catch (error: unknown) {
    console.error('Seed esuat:', error instanceof Error ? error.message : 'Eroare necunoscuta.');
    process.exitCode = 1;
  } finally {
    await client.$disconnect();
  }
}
