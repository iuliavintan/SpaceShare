import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { once } from 'node:events';
import { randomBytes } from 'node:crypto';
import { test } from 'node:test';
import { createApp } from '../src/app.js';
import { createDatabaseClient } from '../src/db/client.js';
import { resolveDatabaseUrl } from '../src/config/database.js';
import { seedDatabase } from '../prisma/seed.js';
import { seedAdmin } from '../prisma/seed-admin.js';

test('resource API', async (suite) => {
  const directory = mkdtempSync(join(tmpdir(), 'spaceshare-resources-'));
  const root = dirname(dirname(fileURLToPath(import.meta.url)));
  const url = resolveDatabaseUrl(`file:${join(directory, 'test.db')}`);
  const client = createDatabaseClient(url);
  const config = { secret: randomBytes(48).toString('hex'), origins: ['http://127.0.0.1:5173'], secureCookie: false };
  const env = { ...process.env, DATABASE_URL: url };
  const app = createApp(client, config);
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}/api`;
  function call(path: string, method = 'GET', body?: object, cookie?: string) {
    return fetch(`${base}${path}`, {
      method, headers: { ...(body ? { 'Content-Type': 'application/json', 'X-SpaceShare-Request': '1', Origin: config.origins[0]! } : {}), ...(cookie ? { Cookie: cookie } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
  }
  try {
    execFileSync(process.execPath, ['--import', 'tsx', 'prisma/prepare.ts'], { cwd: root, env, stdio: 'pipe' });
    execFileSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy', '--config', 'prisma7.config.ts'], { cwd: root, env, stdio: 'pipe' });
    await seedDatabase(client);
    const password = randomBytes(16).toString('hex');
    await seedAdmin(client, { email: 'admin@example.test', password });
    const registration = await call('/auth/register', 'POST', { name: 'Student', email: 'student@example.test', password });
    const userCookie = registration.headers.get('set-cookie')!.split(';')[0]!;
    const adminLogin = await call('/auth/login', 'POST', { email: 'admin@example.test', password });
    const adminCookie = adminLogin.headers.get('set-cookie')!.split(';')[0]!;

    await suite.test('authenticated users can browse and filter actual resources', async () => {
      assert.equal((await call('/resources')).status, 401);
      const response = await call('/resources', 'GET', undefined, userCookie);
      assert.equal(response.status, 200);
      const list = await response.json();
      assert.equal(list.total, 4);
      const filtered = await (await call('/resources?q=A101&minCapacity=8', 'GET', undefined, userCookie)).json();
      assert.equal(filtered.total, 1);
      assert.equal(filtered.resources[0].id, 'demo-study-room');
      assert.equal((await call('/resources?minCapacity=-1', 'GET', undefined, userCookie)).status, 400);
      const categories = await (await call('/categories', 'GET', undefined, userCookie)).json();
      assert.equal(categories.categories.length, 4);
      const details = await (await call('/resources/demo-study-room', 'GET', undefined, userCookie)).json();
      assert.equal(details.resource.availability.length, 5);
      assert.equal((await call('/resources', 'POST', {}, userCookie)).status, 403);
      assert.equal((await call('/resources?status=all', 'GET', undefined, userCookie)).status, 403);
      assert.equal((await call('/resources?status=all', 'GET', undefined, adminCookie)).status, 200);
    });

    await suite.test('admins manage categories and resource status without deleting history', async () => {
      assert.equal((await call('/categories', 'POST', { name: 'New category' }, userCookie)).status, 403);
      const categoryResponse = await call('/categories', 'POST', { name: 'New category' }, adminCookie);
      assert.equal(categoryResponse.status, 201);
      const { category } = await categoryResponse.json();
      assert.equal((await call('/categories', 'POST', { name: 'New category' }, adminCookie)).status, 409);
      assert.equal((await call(`/categories/${category.id}`, 'PATCH', { name: 'Renamed category' }, adminCookie)).status, 200);
      const input = { name: 'Test room', description: 'A real test resource', categoryId: category.id, location: 'Building Z', capacity: 10, facilities: ['Wi-Fi'], requiresApproval: true };
      assert.equal((await call('/resources', 'POST', { ...input, capacity: 0 }, adminCookie)).status, 400);
      assert.equal((await call('/resources', 'POST', { ...input, categoryId: 'missing' }, adminCookie)).status, 400);
      assert.equal((await call('/resources', 'POST', { ...input, facilities: [''] }, adminCookie)).status, 400);
      const response = await call('/resources', 'POST', input, adminCookie);
      assert.equal(response.status, 201);
      const { resource } = await response.json();
      assert.equal(resource.isActive, true);
      assert.deepEqual(resource.facilities, ['Wi-Fi']);
      assert.equal((await call(`/resources/${resource.id}`, 'PATCH', { capacity: 20 }, userCookie)).status, 403);
      assert.equal((await call(`/resources/${resource.id}`, 'PATCH', { role: 'ADMIN' }, adminCookie)).status, 400);
      const updated = await (await call(`/resources/${resource.id}`, 'PATCH', { capacity: 20 }, adminCookie)).json();
      assert.equal(updated.resource.capacity, 20);
      const student = await client.user.findUniqueOrThrow({ where: { email: 'student@example.test' } });
      await client.booking.create({ data: { resourceId: resource.id, userId: student.id, startAt: new Date('2030-01-07T08:00:00Z'), endAt: new Date('2030-01-07T09:00:00Z'), status: 'APPROVED' } });
      assert.equal((await call(`/resources/${resource.id}`, 'PATCH', { isActive: false }, adminCookie)).status, 200);
      assert.equal((await call(`/resources/${resource.id}`, 'GET', undefined, userCookie)).status, 404);
      const adminDetail = await (await call(`/resources/${resource.id}`, 'GET', undefined, adminCookie)).json();
      assert.equal(adminDetail.resource._count.bookings, 1);
      assert.equal(adminDetail.resource.createdAt, resource.createdAt);
      const inactive = await (await call('/resources?status=inactive', 'GET', undefined, adminCookie)).json();
      assert.equal(inactive.total, 1);
      assert.equal((await call(`/resources/${resource.id}`, 'PATCH', { isActive: true }, adminCookie)).status, 200);
      assert.equal((await call(`/resources/${resource.id}`, 'GET', undefined, userCookie)).status, 200);
      const filtered = await (await call(`/resources?categoryId=${category.id}&location=Building&minCapacity=20&requiresApproval=true`, 'GET', undefined, userCookie)).json();
      assert.equal(filtered.total, 1);
      assert.equal((await call('/resources/missing', 'PATCH', { capacity: 10 }, adminCookie)).status, 404);
    });

    await suite.test('admins atomically replace opening hours and manage safe maintenance blocks', async () => {
      const path = '/resources/demo-study-room';
      const windows = [{ dayOfWeek: 1, startMinute: 480, endMinute: 1200 }, { dayOfWeek: 2, startMinute: 600, endMinute: 900 }];
      assert.equal((await call(`${path}/availability`, 'PUT', { windows }, userCookie)).status, 403);
      assert.equal((await call(`${path}/availability`, 'PUT', { windows }, adminCookie)).status, 200);
      const invalid = [{ dayOfWeek: 1, startMinute: 480, endMinute: 720 }, { dayOfWeek: 1, startMinute: 600, endMinute: 800 }];
      assert.equal((await call(`${path}/availability`, 'PUT', { windows: invalid }, adminCookie)).status, 400);
      const detail = await (await call(path, 'GET', undefined, userCookie)).json();
      assert.equal(detail.resource.availability.length, 2);
      assert.equal((await call(`${path}/availability`, 'PUT', { windows: [{ dayOfWeek: 9, startMinute: 0, endMinute: 1440 }] }, adminCookie)).status, 400);
      const block = { startAt: '2030-01-07T10:00:00+02:00', endAt: '2030-01-07T11:00:00+02:00', reason: 'Maintenance' };
      assert.equal((await call(`${path}/blocks`, 'POST', block, userCookie)).status, 403);
      assert.equal((await call(`${path}/blocks`, 'POST', { ...block, endAt: block.startAt }, adminCookie)).status, 400);
      assert.equal((await call(`${path}/blocks`, 'POST', { ...block, startAt: '2030-02-30T10:00:00Z' }, adminCookie)).status, 400);
      assert.equal((await call(`${path}/blocks`, 'POST', { ...block, startAt: '2030-01-07T10:00' }, adminCookie)).status, 400);
      const created = await call(`${path}/blocks`, 'POST', block, adminCookie);
      assert.equal(created.status, 201);
      const { block: saved } = await created.json();
      assert.equal(saved.startAt, '2030-01-07T08:00:00.000Z');
      assert.equal((await call(`${path}/blocks`, 'POST', block, adminCookie)).status, 409);
      const shown = await (await call(path, 'GET', undefined, userCookie)).json();
      assert.equal(shown.resource.blocks.length, 1);
      assert.equal((await call(`/resources/demo-lab/blocks/${saved.id}`, 'DELETE', undefined, adminCookie)).status, 403); // CSRF header is required even for DELETE.
      assert.equal((await call(`/resources/demo-lab/blocks/${saved.id}`, 'DELETE', {}, adminCookie)).status, 404);
      assert.equal((await call(`${path}/blocks/${saved.id}`, 'DELETE', {}, adminCookie)).status, 204);
      const student = await client.user.findUniqueOrThrow({ where: { email: 'student@example.test' } });
      await client.booking.create({ data: { resourceId: 'demo-study-room', userId: student.id, startAt: new Date('2030-01-07T08:00:00Z'), endAt: new Date('2030-01-07T09:00:00Z'), status: 'APPROVED' } });
      assert.equal((await call(`${path}/blocks`, 'POST', block, adminCookie)).status, 409);
      // Adjacent half-open intervals are allowed.
      assert.equal((await call(`${path}/blocks`, 'POST', { ...block, startAt: '2030-01-07T09:00:00Z', endAt: '2030-01-07T10:00:00Z' }, adminCookie)).status, 201);
      assert.equal((await call(`${path}/availability`, 'PUT', { windows: [] }, adminCookie)).status, 409);
    });

    await suite.test('concurrent overlapping block requests persist exactly one block', async () => {
      const path = '/resources/demo-lab/blocks';
      const input = { startAt: '2030-01-08T08:00:00Z', endAt: '2030-01-08T09:00:00Z', reason: 'Concurrent maintenance' };
      const responses = await Promise.all([
        call(path, 'POST', input, adminCookie),
        call(path, 'POST', input, adminCookie),
      ]);
      assert.deepEqual(responses.map((response) => response.status).sort(), [201, 409]);
      assert.equal(await client.resourceBlock.count({ where: { resourceId: 'demo-lab' } }), 1);
    });
  } finally {
    await new Promise<void>((resolve) => { server.close(() => resolve()); server.closeAllConnections(); });
    await client.$disconnect();
    assert.equal(dirname(directory), tmpdir());
    assert.ok(directory.startsWith(join(tmpdir(), 'spaceshare-resources-')));
    rmSync(directory, { recursive: true, force: true });
  }
});
