import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomBytes } from 'node:crypto';
import { backendDirectory } from '../src/config/database.js';

const path = resolve(backendDirectory, '.env');
const content = existsSync(path) ? readFileSync(path, 'utf8') : '';
if (!/^\s*JWT_SECRET\s*=/m.test(content)) {
  appendFileSync(path, `\nJWT_SECRET="${randomBytes(48).toString('hex')}"\n`, { mode: 0o600 });
  console.log('Cheia JWT a fost generata in .env local.');
}
