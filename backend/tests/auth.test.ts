import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { once } from 'node:events';
import { test } from 'node:test';
import { randomBytes } from 'node:crypto';
import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/app.js';
import { createDatabaseClient } from '../src/db/client.js';
import { resolveDatabaseUrl } from '../src/config/database.js';
import { authenticate, requireRole } from '../src/middleware/authenticate.js';
import { authRateLimit } from '../src/middleware/auth-rate-limit.js';
import { errorHandler } from '../src/middleware/error-handler.js';
import { createAuthService } from '../src/modules/auth/auth.service.js';
import { seedAdmin } from '../prisma/seed-admin.js';

test('auth API: registration, cookies, profile, roles and revocation', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'spaceshare-auth-test-'));
  const root = dirname(dirname(fileURLToPath(import.meta.url)));
  const url = resolveDatabaseUrl(`file:${join(directory, 'auth.db')}`);
  const client = createDatabaseClient(url);
  const config = { secret: randomBytes(48).toString('hex'), origins: ['http://127.0.0.1:5173'], secureCookie: false };
  const env = { ...process.env, DATABASE_URL: url };
  let server: ReturnType<ReturnType<typeof express>['listen']> | undefined;
  try {
    execFileSync(process.execPath, ['--import', 'tsx', 'prisma/prepare.ts'], { cwd: root, env, stdio: 'pipe' });
    execFileSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy', '--config', 'prisma7.config.ts'], { cwd: root, env, stdio: 'pipe' });
    const wrapper = express();
    const service = createAuthService(client, config);
    wrapper.get('/admin-test', authenticate(service, config), requireRole('ADMIN'), (_request, response) => { response.json({ access: 'granted' }); });
    wrapper.post('/rate-test', authRateLimit(2), (_request, response) => { response.json({ ok: true }); });
    wrapper.use(createApp(client, config));
    wrapper.use(errorHandler);
    server = wrapper.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const address = server.address();
    assert.ok(address && typeof address !== 'string');
    const base = `http://127.0.0.1:${address.port}`;

    function call(path: string, method = 'GET', body?: object, cookie?: string, extra: Record<string, string> = {}) {
      return fetch(`${base}${path}`, {
        method, headers: { ...(body ? { 'Content-Type': 'application/json', 'X-SpaceShare-Request': '1', Origin: config.origins[0]! } : {}), ...(cookie ? { Cookie: cookie } : {}), ...extra },
        body: body ? JSON.stringify(body) : undefined,
      });
    }
    const data = { name: 'Student Test', email: ' Student@Example.test ', password: randomBytes(16).toString('hex') };
    assert.equal((await call('/api/users/me')).status, 401);
    assert.equal((await call('/admin-test')).status, 401);
    assert.equal((await call('/api/auth/register', 'POST', { ...data, role: 'ADMIN' })).status, 400);
    assert.equal((await call('/api/auth/register', 'POST', { ...data, password: 'short' })).status, 400);
    assert.equal((await call('/api/auth/register', 'POST', { ...data, password: 'ă'.repeat(40) })).status, 400);
    assert.equal((await call('/api/auth/register', 'POST', { ...data, email: 'invalid' })).status, 400);
    assert.equal((await call('/api/auth/register', 'POST', data, undefined, { 'X-SpaceShare-Request': '' })).status, 403);
    assert.equal((await call('/api/auth/register', 'POST', data, undefined, { Origin: 'https://evil.example' })).status, 403);

    const response = await call('/api/auth/register', 'POST', data);
    assert.equal(response.status, 201);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    const body = await response.json();
    assert.equal(body.user.role, 'USER');
    assert.equal(body.user.email, 'student@example.test');
    assert.equal(body.user.passwordHash, undefined);
    assert.equal(body.user.tokenVersion, undefined);
    assert.equal(body.token, undefined);
    const setCookie = response.headers.get('set-cookie')!;
    assert.match(setCookie, /HttpOnly/);
    assert.match(setCookie, /SameSite=Strict/);
    assert.match(setCookie, /Path=\/api/);
    const cookie = setCookie.split(';')[0]!;
    const stored = await client.user.findUniqueOrThrow({ where: { id: body.user.id } });
    assert.notEqual(stored.passwordHash, data.password);
    assert.ok(await bcrypt.compare(data.password, stored.passwordHash));
    assert.equal((await call('/api/auth/register', 'POST', data)).status, 409);
    const duplicateRace = await Promise.all([1, 2].map(() => call('/api/auth/register', 'POST', { ...data, email: 'race@example.test' })));
    assert.deepEqual(duplicateRace.map((result) => result.status).sort(), [201, 409]);
    assert.equal((await call('/api/users/me', 'GET', undefined, cookie)).status, 200);
    assert.equal((await call('/admin-test', 'GET', undefined, cookie)).status, 403);

    const wrong = await call('/api/auth/login', 'POST', { email: stored.email, password: 'incorrect-password' });
    const missing = await call('/api/auth/login', 'POST', { email: 'unknown@example.test', password: 'incorrect-password' });
    assert.equal(wrong.status, 401);
    assert.equal(missing.status, 401);
    assert.deepEqual(await wrong.json(), await missing.json());
    const login = await call('/api/auth/login', 'POST', { email: stored.email.toUpperCase(), password: data.password });
    assert.equal(login.status, 200);
    const secondCookie = login.headers.get('set-cookie')!.split(';')[0]!;

    assert.equal((await call('/api/users/me', 'PATCH', { name: 'Admin', email: stored.email, role: 'ADMIN' }, cookie)).status, 400);
    assert.equal((await call('/api/users/me', 'PATCH', { name: 'Admin', email: stored.email, id: 'another-user' }, cookie)).status, 400);
    const updated = await call('/api/users/me', 'PATCH', { name: 'Updated Student', email: 'updated@example.test' }, cookie);
    assert.equal(updated.status, 200);
    assert.equal((await updated.json()).user.name, 'Updated Student');
    const other = await client.user.create({ data: { name: 'Other User', email: 'other@example.test', passwordHash: 'disabled-test-login' } });
    assert.equal((await call('/api/users/me', 'PATCH', { name: 'Conflict', email: other.email }, cookie)).status, 409);
    assert.equal((await client.user.findUniqueOrThrow({ where: { id: other.id } })).name, 'Other User');
    assert.equal((await call('/api/users/me', 'GET', undefined, 'spaceshare_session=tampered')).status, 401);
    const expired = jwt.sign({ version: 0 }, config.secret, { algorithm: 'HS256', subject: stored.id, issuer: 'spaceshare-api', audience: 'spaceshare-web', expiresIn: -1 });
    assert.equal((await call('/api/users/me', 'GET', undefined, `spaceshare_session=${expired}`)).status, 401);
    const wrongAlgorithm = jwt.sign({ version: 0 }, config.secret, { algorithm: 'HS384', subject: stored.id, issuer: 'spaceshare-api', audience: 'spaceshare-web', expiresIn: 3600 });
    assert.equal((await call('/api/users/me', 'GET', undefined, `spaceshare_session=${wrongAlgorithm}`)).status, 401);
    const forged = jwt.sign({ version: 0 }, randomBytes(48).toString('hex'), { subject: stored.id, issuer: 'spaceshare-api', audience: 'spaceshare-web', expiresIn: 3600 });
    assert.equal((await call('/api/users/me', 'GET', undefined, `spaceshare_session=${forged}`)).status, 401);

    const adminSettings = { email: 'admin@example.test', password: randomBytes(16).toString('hex') };
    await seedAdmin(client, adminSettings);
    await seedAdmin(client, adminSettings);
    assert.equal(await client.user.count({ where: { role: 'ADMIN' } }), 1);
    await assert.rejects(seedAdmin(client, { email: 'updated@example.test', password: adminSettings.password }));
    const adminLogin = await call('/api/auth/login', 'POST', adminSettings);
    assert.equal(adminLogin.status, 200);
    const adminCookie = adminLogin.headers.get('set-cookie')!.split(';')[0]!;
    assert.equal((await call('/admin-test', 'GET', undefined, adminCookie)).status, 200);
    // Authorization reads the current DB role, not a stale claim in the JWT.
    await client.user.update({ where: { email: adminSettings.email }, data: { role: 'USER' } });
    assert.equal((await call('/admin-test', 'GET', undefined, adminCookie)).status, 403);

    const logout = await call('/api/auth/logout', 'POST', {}, cookie);
    assert.equal(logout.status, 204);
    assert.match(logout.headers.get('set-cookie')!, /Expires=/);
    assert.equal((await call('/api/users/me', 'GET', undefined, cookie)).status, 401);
    assert.equal((await call('/api/users/me', 'GET', undefined, secondCookie)).status, 401);
    const malformed = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-SpaceShare-Request': '1' }, body: '{' });
    assert.equal(malformed.status, 400);
    assert.equal((await call('/rate-test', 'POST')).status, 200);
    assert.equal((await call('/rate-test', 'POST')).status, 200);
    assert.equal((await call('/rate-test', 'POST')).status, 429);
  } finally {
    if (server) { await new Promise<void>((resolve) => { server!.close(() => resolve()); server!.closeAllConnections(); }); }
    await client.$disconnect();
    assert.equal(dirname(directory), tmpdir());
    assert.ok(directory.startsWith(join(tmpdir(), 'spaceshare-auth-test-')));
    rmSync(directory, { recursive: true, force: true });
  }
});
