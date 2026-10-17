import assert from 'node:assert/strict';
import { execFileSync, fork } from 'node:child_process';
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

test('booking API', async (suite) => {
  const directory = mkdtempSync(join(tmpdir(), 'spaceshare-bookings-'));
  const root = dirname(dirname(fileURLToPath(import.meta.url)));
  const url = resolveDatabaseUrl(`file:${join(directory, 'test.db')}`);
  const client = createDatabaseClient(url);
  const config = { secret: randomBytes(48).toString('hex'), origins: ['http://127.0.0.1:5173'], secureCookie: false };
  const env = { ...process.env, DATABASE_URL: url };
  let instant = new Date('2030-01-01T00:00:00Z');
  const servers = [createApp(client, config, () => new Date(instant)).listen(0, '127.0.0.1')];
  const child = fork(join(root, 'tests/fixtures/booking-process.ts'), [], { execArgv: ['--import', 'tsx'], env: { ...env, SPACESHARE_TEST_CONFIG: JSON.stringify(config) }, stdio: ['ignore', 'ignore', 'pipe', 'ipc'] });
  let childError = '';
  child.stderr?.on('data', (chunk: Buffer) => { childError += chunk.toString(); });
  const ready = once(child, 'message');
  await Promise.all(servers.map((server) => once(server, 'listening')));
  const bases = servers.map((server) => {
    const address = server.address();
    assert.ok(address && typeof address !== 'string');
    return `http://127.0.0.1:${address.port}/api`;
  });
  function call(path: string, method = 'GET', body?: object, cookie?: string, instance = 0) {
    return fetch(`${bases[instance]}${path}`, {
      method, headers: { ...(body ? { 'Content-Type': 'application/json', 'X-SpaceShare-Request': '1', Origin: config.origins[0]! } : {}), ...(cookie ? { Cookie: cookie } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
  }
  try {
    const [message] = await ready;
    assert.ok(typeof message === 'object' && message !== null && 'base' in message && typeof message.base === 'string', childError);
    bases.push(message.base);
    execFileSync(process.execPath, ['--import', 'tsx', 'prisma/prepare.ts'], { cwd: root, env, stdio: 'pipe' });
    execFileSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy', '--config', 'prisma7.config.ts'], { cwd: root, env, stdio: 'pipe' });
    await seedDatabase(client);
    const password = randomBytes(16).toString('hex');
    await seedAdmin(client, { email: 'admin@example.test', password });
    async function session(email: string, register = true) {
      const response = await call(register ? '/auth/register' : '/auth/login', 'POST', { ...(register ? { name: 'Student' } : {}), email, password });
      assert.equal(response.status, register ? 201 : 200);
      return response.headers.get('set-cookie')!.split(';')[0]!;
    }
    const user = await session('student@example.test');
    const stranger = await session('other@example.test');
    const admin = await session('admin@example.test', false);
    const input = { resourceId: 'demo-study-room', startAt: '2030-01-07T08:00:00Z', endAt: '2030-01-07T09:00:00Z', reason: 'Group study' };

    await suite.test('users book available resources and can retrieve only their own records', async () => {
      assert.equal((await call('/bookings', 'POST', input)).status, 401);
      const created = await call('/bookings', 'POST', input, user);
      assert.equal(created.status, 201);
      const { booking } = await created.json();
      assert.equal(booking.status, 'APPROVED');
      assert.equal(booking.resource.name, 'Sala de studiu A101');
      assert.equal((await call(`/bookings/${booking.id}`, 'GET', undefined, stranger)).status, 404);
      const shown = await (await call(`/bookings/${booking.id}`, 'GET', undefined, user)).json();
      assert.equal(shown.booking.id, booking.id);
      assert.equal('passwordHash' in shown.booking, false);
      const mine = await (await call('/bookings', 'GET', undefined, user)).json();
      assert.equal(mine.total, 1);
      assert.equal((await call('/bookings?scope=all', 'GET', undefined, user)).status, 403);
      assert.equal((await call('/bookings?scope=all', 'GET', undefined, admin)).status, 200);
    });
    await suite.test('availability respects opening hours, pending requests and maintenance without exposing owners', async () => {
      const check = (resourceId: string, startAt: string, endAt: string) => call(`/resources/${resourceId}/availability?${new URLSearchParams({ startAt, endAt })}`, 'GET', undefined, stranger);
      assert.equal((await call('/bookings', 'POST', input, user)).status, 409);
      assert.equal((await call('/bookings', 'POST', { ...input, startAt: '2030-01-07T09:00:00Z', endAt: '2030-01-07T10:00:00Z' }, user)).status, 201);
      for (const dates of [
        { startAt: '2030-01-07T05:00:00Z', endAt: '2030-01-07T06:00:00Z' },
        { startAt: '2030-01-06T08:00:00Z', endAt: '2030-01-06T09:00:00Z' },
      ]) assert.equal((await call('/bookings', 'POST', { ...input, ...dates }, user)).status, 409);
      const unavailable = await (await check(input.resourceId, input.startAt, input.endAt)).json();
      assert.equal(unavailable.available, false);
      assert.equal(unavailable.code, 'BOOKING_CONFLICT');
      assert.equal(JSON.stringify(unavailable).includes('student@example.test'), false);
      assert.equal((await (await check(input.resourceId, '2030-01-07T10:00:00Z', '2030-01-07T11:00:00Z')).json()).available, true);
      const pending = await (await call('/bookings', 'POST', { ...input, resourceId: 'demo-lab' }, user)).json();
      assert.equal(pending.booking.status, 'PENDING');
      assert.equal((await call('/bookings', 'POST', { ...input, resourceId: 'demo-lab' }, stranger)).status, 409);
      assert.equal((await call('/resources/demo-projector/blocks', 'POST', { startAt: input.startAt, endAt: input.endAt, reason: 'Maintenance' }, admin)).status, 201);
      assert.equal((await call('/bookings', 'POST', { ...input, resourceId: 'demo-projector' }, user)).status, 409);
      assert.equal((await call('/bookings', 'POST', { ...input, userId: 'somebody-else' }, user)).status, 400);
      for (const dates of [
        { startAt: '2020-01-07T08:00:00Z' },
        { endAt: input.startAt },
        { startAt: '2030-02-30T08:00:00Z' },
        { startAt: '2030-01-07T08:00' },
        { startAt: '2030-01-07T08:00:30Z' },
        { endAt: '2030-01-09T09:00:00Z' },
      ]) assert.equal((await call('/bookings', 'POST', { ...input, ...dates }, user)).status, 400);
    });
    await suite.test('only owners cancel and only admins decide, with terminal transitions protected', async () => {
      const dates = { ...input, resourceId: 'demo-lab', startAt: '2030-01-08T08:00:00Z', endAt: '2030-01-08T09:00:00Z' };
      const { booking } = await (await call('/bookings', 'POST', dates, user)).json();
      const path = `/bookings/${booking.id}`;
      assert.equal((await call(`${path}/approve`, 'POST', {}, user)).status, 403);
      assert.equal((await call(`${path}/cancel`, 'POST', {}, stranger)).status, 404);
      const approved = await call(`${path}/approve`, 'POST', {}, admin);
      assert.equal(approved.status, 200);
      const decision = (await approved.json()).booking;
      assert.equal(decision.status, 'APPROVED');
      assert.equal(decision.decidedBy.name, 'Administrator SpaceShare');
      assert.equal(decision.decidedAt, instant.toISOString());
      assert.equal((await call(`${path}/reject`, 'POST', {}, admin)).status, 409);
      assert.equal((await call(`${path}/cancel`, 'POST', { status: 'COMPLETED' }, user)).status, 400);
      assert.equal((await call(`${path}/cancel`, 'POST', {}, user)).status, 200);
      assert.equal((await call(`${path}/approve`, 'POST', {}, admin)).status, 409);
      assert.equal((await call('/bookings', 'POST', dates, stranger)).status, 201);
      const rejectedDates = { ...dates, startAt: '2030-01-08T10:00:00Z', endAt: '2030-01-08T11:00:00Z' };
      const rejected = (await (await call('/bookings', 'POST', rejectedDates, user)).json()).booking;
      assert.equal((await call(`/bookings/${rejected.id}/reject`, 'POST', {}, admin)).status, 200);
      assert.equal((await call('/bookings', 'POST', rejectedDates, stranger)).status, 201);
      assert.equal((await call(`/bookings/${rejected.id}/cancel`, 'POST', {}, user)).status, 409);
      const inactiveDates = { ...dates, resourceId: 'demo-meeting-room' };
      const inactive = (await (await call('/bookings', 'POST', inactiveDates, user)).json()).booking;
      assert.equal((await call('/resources/demo-meeting-room', 'PATCH', { isActive: false }, admin)).status, 200);
      assert.equal((await call(`/bookings/${inactive.id}/approve`, 'POST', {}, admin)).status, 409);
      assert.equal((await call('/bookings', 'POST', { ...inactiveDates, startAt: '2030-01-08T12:00:00Z', endAt: '2030-01-08T13:00:00Z' }, user)).status, 404);
      assert.equal((await call(`/bookings/${inactive.id}/cancel`, 'POST', {}, admin)).status, 200);
      assert.equal((await call(`/bookings/${inactive.id}`, 'GET', undefined, user)).status, 200);
    });
    await suite.test('database constraints reject overlapping inserts and updates in both directions', async () => {
      const mine = await (await call('/bookings', 'GET', undefined, user)).json();
      const userId = mine.bookings[0].userId;
      const data = { userId, resourceId: 'demo-projector', startAt: new Date('2030-01-11T08:00:00Z'), endAt: new Date('2030-01-11T09:00:00Z'), status: 'APPROVED' as const };
      await client.booking.create({ data });
      await assert.rejects(client.booking.create({ data }));
      const cancelled = await client.booking.create({ data: { ...data, status: 'CANCELLED' } });
      await assert.rejects(client.booking.update({ where: { id: cancelled.id }, data: { status: 'PENDING' } }));
      const adjacent = await client.booking.create({ data: { ...data, startAt: data.endAt, endAt: new Date('2030-01-11T10:00:00Z') } });
      await assert.rejects(client.booking.update({ where: { id: adjacent.id }, data: { startAt: new Date('2030-01-11T08:30:00Z') } }));
      await assert.rejects(client.resourceBlock.create({ data: { resourceId: data.resourceId, startAt: data.startAt, endAt: data.endAt, reason: 'Must fail' } }));
      const block = await client.resourceBlock.create({ data: { resourceId: data.resourceId, startAt: new Date('2030-01-11T10:00:00Z'), endAt: new Date('2030-01-11T11:00:00Z'), reason: 'Maintenance' } });
      await assert.rejects(client.booking.create({ data: { ...data, startAt: block.startAt, endAt: block.endAt } }));
      await assert.rejects(client.resourceBlock.update({ where: { id: block.id }, data: { startAt: data.startAt } }));
      await assert.rejects(client.resourceBlock.create({ data: { resourceId: data.resourceId, startAt: block.startAt, endAt: block.endAt, reason: 'Duplicate' } }));
    });
    await suite.test('concurrent independent API instances accept one overlapping booking or block', async () => {
      for (const instance of [0, 1]) {
        const startAt = instance ? '2030-01-14T10:00:00Z' : '2030-01-14T08:00:00Z';
        const dates = { ...input, resourceId: 'demo-projector', startAt, endAt: instance ? '2030-01-14T11:00:00Z' : '2030-01-14T09:00:00Z' };
        const responses = await Promise.all([call('/bookings', 'POST', dates, user), call('/bookings', 'POST', dates, stranger, instance)]);
        assert.deepEqual(responses.map((response) => response.status).sort(), [201, 409]);
        const list = await (await call('/bookings?scope=all&resourceId=demo-projector', 'GET', undefined, admin)).json();
        assert.equal(list.bookings.filter((booking: { startAt: string }) => booking.startAt === new Date(startAt).toISOString()).length, 1);
      }
      const dates = { ...input, resourceId: 'demo-projector', startAt: '2030-01-15T08:00:00Z', endAt: '2030-01-15T09:00:00Z' };
      const race = await Promise.all([
        call('/bookings', 'POST', dates, user),
        call('/resources/demo-projector/blocks', 'POST', { startAt: dates.startAt, endAt: dates.endAt, reason: 'Concurrent maintenance' }, admin, 1),
      ]);
      assert.deepEqual(race.map((response) => response.status).sort(), [201, 409]);
      const block = { startAt: '2030-01-16T08:00:00Z', endAt: '2030-01-16T09:00:00Z', reason: 'Concurrent blocks' };
      const blocks = await Promise.all([call('/resources/demo-projector/blocks', 'POST', block, admin), call('/resources/demo-projector/blocks', 'POST', block, admin, 1)]);
      assert.deepEqual(blocks.map((response) => response.status).sort(), [201, 409]);
      const pending = (await (await call('/bookings', 'POST', { ...dates, resourceId: 'demo-lab' }, user)).json()).booking;
      const decisions = await Promise.all([call(`/bookings/${pending.id}/approve`, 'POST', {}, admin), call(`/bookings/${pending.id}/reject`, 'POST', {}, admin, 1)]);
      assert.deepEqual(decisions.map((response) => response.status).sort(), [200, 409]);
    });
    await suite.test('a transient SQLite write lock is retried rather than returned as an internal error', async () => {
      await client.$queryRawUnsafe('PRAGMA busy_timeout = 1');
      const locked = once(child, 'message');
      child.send({ type: 'lock' });
      await locked;
      const response = await call('/bookings', 'POST', { ...input, resourceId: 'demo-projector', startAt: '2030-01-17T08:00:00Z', endAt: '2030-01-17T09:00:00Z' }, user);
      assert.equal(response.status, 201);
    });
    await suite.test('opening hours cover midnight and real Bucharest daylight-saving minutes', async () => {
      const categories = (await (await call('/categories', 'GET', undefined, admin)).json()).categories;
      async function scheduled(name: string, windows: object[]) {
        const response = await call('/resources', 'POST', { name, categoryId: categories[0].id, description: name, location: 'Test campus', capacity: 1 }, admin);
        assert.equal(response.status, 201);
        const resource = (await response.json()).resource;
        assert.equal((await call(`/resources/${resource.id}/availability`, 'PUT', { windows }, admin)).status, 200);
        return resource.id as string;
      }
      const overnight = await scheduled('Night room', [{ dayOfWeek: 1, startMinute: 1320, endMinute: 1440 }, { dayOfWeek: 2, startMinute: 0, endMinute: 120 }]);
      assert.equal((await call('/bookings', 'POST', { ...input, resourceId: overnight, startAt: '2030-01-07T21:00:00Z', endAt: '2030-01-08T00:00:00Z' }, user)).status, 201);
      assert.equal((await call('/bookings', 'POST', { ...input, resourceId: overnight, startAt: '2030-01-08T00:00:00Z', endAt: '2030-01-08T00:01:00Z' }, user)).status, 409);
      const spring = await scheduled('Spring DST room', [{ dayOfWeek: 7, startMinute: 120, endMinute: 240 }]);
      assert.equal((await call('/bookings', 'POST', { ...input, resourceId: spring, startAt: '2030-03-31T00:30:00Z', endAt: '2030-03-31T01:00:00Z' }, user)).status, 201);
      const autumn = await scheduled('Autumn DST room', [{ dayOfWeek: 7, startMinute: 180, endMinute: 240 }]);
      assert.equal((await call('/bookings', 'POST', { ...input, resourceId: autumn, startAt: '2030-10-27T00:00:00Z', endAt: '2030-10-27T02:00:00Z' }, user)).status, 201);
    });

    await suite.test('time settles completed and expired requests and limits cancellation after starting', async () => {
      const data = { ...input, resourceId: 'demo-projector', startAt: '2030-01-18T08:00:00Z', endAt: '2030-01-18T09:00:00Z' };
      const approved = (await (await call('/bookings', 'POST', data, user)).json()).booking;
      const pending = (await (await call('/bookings', 'POST', { ...data, resourceId: 'demo-lab' }, user)).json()).booking;
      instant = new Date('2030-01-18T08:30:00Z');
      assert.equal((await call(`/bookings/${approved.id}/cancel`, 'POST', {}, user)).status, 409);
      const expired = await (await call(`/bookings/${pending.id}`, 'GET', undefined, user)).json();
      assert.equal(expired.booking.status, 'REJECTED');
      assert.equal(expired.booking.decidedBy, null);
      assert.equal((await call(`/bookings/${pending.id}/approve`, 'POST', {}, admin)).status, 409);
      assert.equal((await call(`/bookings/${approved.id}/cancel`, 'POST', {}, admin)).status, 200);
      const future = { ...data, startAt: '2030-01-18T09:00:00Z', endAt: '2030-01-18T10:00:00Z' };
      const completed = (await (await call('/bookings', 'POST', future, user)).json()).booking;
      instant = new Date('2030-01-18T10:00:00Z');
      const shown = await (await call(`/bookings/${completed.id}`, 'GET', undefined, user)).json();
      assert.equal(shown.booking.status, 'COMPLETED');
      assert.equal((await call(`/bookings/${completed.id}/cancel`, 'POST', {}, admin)).status, 409);
      const history = await (await call('/bookings?status=COMPLETED', 'GET', undefined, user)).json();
      assert.ok(history.total >= 1);
    });
  } finally {
    await Promise.all(servers.map((server) => new Promise<void>((resolve) => { server.close(() => resolve()); server.closeAllConnections(); })));
    const exited = once(child, 'exit');
    child.kill();
    await exited;
    await client.$disconnect();
    assert.equal(dirname(directory), tmpdir());
    assert.ok(directory.startsWith(join(tmpdir(), 'spaceshare-bookings-')));
    rmSync(directory, { recursive: true, force: true });
  }
});
