import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { seedDatabase } from '../prisma/seed.js';
import { resolveDatabaseUrl } from '../src/config/database.js';
import { createDatabaseClient } from '../src/db/client.js';

const backendDirectory = dirname(dirname(fileURLToPath(import.meta.url)));

test('SQLite migration, repeatable seed and relational integrity', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'spaceshare-db-test-'));
  const url = resolveDatabaseUrl(`file:${join(directory, 'test.db')}`);
  const client = createDatabaseClient(url);
  try {
    // Run the same empty-file preparation and migration as the dev bootstrap.
    execFileSync(process.execPath, ['--import', 'tsx', 'prisma/prepare.ts'], {
      cwd: backendDirectory, env: { ...process.env, DATABASE_URL: url }, stdio: 'pipe',
    });
    execFileSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy', '--config', 'prisma7.config.ts'], {
      cwd: backendDirectory, env: { ...process.env, DATABASE_URL: url }, stdio: 'pipe',
    });
    await seedDatabase(client);
    assert.equal(await client.category.count(), 4);
    assert.equal(await client.resource.count(), 4);
    assert.equal(await client.availability.count(), 20);
    assert.equal(await client.user.count(), 0);
    await client.resource.update({ where: { id: 'demo-study-room' }, data: { name: 'Edited room', isActive: false } });
    await seedDatabase(client);
    assert.equal(await client.resource.count(), 4);
    assert.equal(await client.availability.count(), 20);
    const room = await client.resource.findUniqueOrThrow({ where: { id: 'demo-study-room' }, include: { category: true } });
    assert.equal(room.name, 'Edited room');
    assert.equal(room.isActive, false);
    assert.deepEqual(room.facilities, ['Wi-Fi', 'Tablă', 'Prize']);
    assert.ok(room.createdAt instanceof Date);

    await assert.rejects(client.resource.update({ where: { id: room.id }, data: { capacity: 0 } }));
    await assert.rejects(client.resource.update({ where: { id: room.id }, data: { facilities: { invalid: true } } }));
    await assert.rejects(client.availability.create({ data: { resourceId: room.id, dayOfWeek: 0, startMinute: 480, endMinute: 720 } }));
    await assert.rejects(client.availability.create({ data: { resourceId: room.id, dayOfWeek: 6, startMinute: 720, endMinute: 480 } }));
    await assert.rejects(client.resource.update({ where: { id: room.id }, data: { categoryId: 'missing-category' } }));
    await assert.rejects(client.category.delete({ where: { id: room.categoryId } }));

    // A disabled login hash is only a fixture; no usable password is stored.
    const user = await client.user.create({ data: { email: 'fixture@example.test', name: 'Test fixture', passwordHash: 'disabled-test-login' } });
    assert.equal(user.role, 'USER');
    await assert.rejects(client.user.create({ data: { email: user.email, name: 'Duplicate', passwordHash: 'disabled-test-login' } }));
    await assert.rejects(client.$executeRaw`UPDATE "User" SET "role" = 'INVALID' WHERE "id" = ${user.id}`);

    const startAt = new Date('2030-01-07T08:00:00.000Z');
    const endAt = new Date('2030-01-07T09:00:00.000Z');
    await assert.rejects(client.booking.create({ data: { userId: user.id, resourceId: room.id, startAt: endAt, endAt: startAt } }));
    await assert.rejects(client.resourceBlock.create({ data: { resourceId: room.id, startAt, endAt: startAt, reason: 'Invalid' } }));
    const booking = await client.booking.create({ data: { userId: user.id, resourceId: room.id, startAt, endAt } });
    assert.equal(booking.status, 'PENDING');
    assert.equal(booking.startAt.toISOString(), startAt.toISOString());
    await assert.rejects(client.user.delete({ where: { id: user.id } }));
    await assert.rejects(client.resource.delete({ where: { id: room.id } }));
    const notification = await client.notification.create({ data: { userId: user.id, bookingId: booking.id, type: 'BOOKING_APPROVED', message: 'Fixture notification' } });
    await client.booking.delete({ where: { id: booking.id } });
    assert.equal((await client.notification.findUniqueOrThrow({ where: { id: notification.id } })).bookingId, null);
    await client.user.delete({ where: { id: user.id } });
    assert.equal(await client.notification.count(), 0);
    await client.resource.delete({ where: { id: room.id } });
    assert.equal(await client.availability.count({ where: { resourceId: room.id } }), 0);
  } finally {
    await client.$disconnect();
    // Only remove the isolated temporary directory created by this test.
    assert.ok(directory.startsWith(join(tmpdir(), 'spaceshare-db-test-')));
    rmSync(directory, { recursive: true, force: true });
  }
});

test('SQLite paths are shared by the CLI and runtime', () => {
  assert.equal(resolveDatabaseUrl('file:./dev.db'), `file:${join(backendDirectory, 'dev.db').replaceAll('\\', '/')}`);
  assert.throws(() => resolveDatabaseUrl('postgresql://invalid'));
  assert.throws(() => resolveDatabaseUrl('file:'));
  assert.throws(() => resolveDatabaseUrl('file:./dev.db?mode=memory'));
});
