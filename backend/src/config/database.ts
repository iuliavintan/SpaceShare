import { existsSync } from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';

// The source and compiled files both resolve paths against the backend root.
let backendDirectory = fileURLToPath(new URL('.', import.meta.url));
while (!existsSync(resolve(backendDirectory, 'package.json'))) {
  const parent = dirname(backendDirectory);
  if (parent === backendDirectory) throw new Error('Directorul backend nu a fost gasit.');
  backendDirectory = parent;
}
config({ path: resolve(backendDirectory, '.env'), quiet: true });

export function resolveDatabaseUrl(value: string): string {
  if (!value.startsWith('file:') || value.length === 5) {
    throw new Error('DATABASE_URL trebuie sa indice un fisier SQLite (file:./dev.db).');
  }
  const path = value.slice(5);
  if (path.includes('?') || path.includes('#') || path === ':memory:') {
    throw new Error('DATABASE_URL trebuie sa indice un fisier local, fara parametri.');
  }
  const absolutePath = isAbsolute(path) ? path : resolve(backendDirectory, path);
  return `file:${absolutePath.replaceAll('\\', '/')}`;
}

export const databaseUrl = resolveDatabaseUrl(process.env.DATABASE_URL ?? 'file:./dev.db');
