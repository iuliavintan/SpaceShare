import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { backendDirectory, databaseUrl } from '../src/config/database.js';

const databasePath = databaseUrl.slice('file:'.length);
if (!existsSync(databasePath)) {
  throw new Error('Baza SQLite nu exista inca. Ruleaza npm run dev pentru a o pregati.');
}

// Studio 7.10 expects a complete file:// URL, unlike Prisma Migrate/the adapter.
const studio = spawn(process.execPath, [
  resolve(backendDirectory, 'node_modules/prisma/build/index.js'),
  'studio',
  '--config', resolve(backendDirectory, 'prisma7.config.ts'),
  '--url', pathToFileURL(databasePath).href,
  '--browser', 'none',
  ...process.argv.slice(2),
], { cwd: backendDirectory, stdio: 'inherit' });

studio.once('error', (error) => {
  console.error(`Prisma Studio nu poate porni: ${error.message}`);
  process.exitCode = 1;
});
studio.once('exit', (code) => { process.exitCode = code ?? 0; });
process.once('SIGINT', () => { studio.kill('SIGINT'); });
process.once('SIGTERM', () => { studio.kill('SIGTERM'); });
