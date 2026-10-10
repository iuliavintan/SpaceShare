import './database.js';

export interface AuthConfig {
  secret: string;
  origins: string[];
  secureCookie: boolean;
}

export function getAuthConfig(): AuthConfig {
  const secret = process.env.JWT_SECRET;
  if (!secret || Buffer.byteLength(secret) < 32) {
    throw new Error('JWT_SECRET trebuie sa aiba minimum 32 bytes. Porneste cu npm run dev pentru configurarea locala.');
  }
  const origins = (process.env.APP_ORIGINS ?? 'http://127.0.0.1:5173,http://localhost:5173,http://127.0.0.1:4173,http://localhost:4173').split(',').map((value) => value.trim());
  for (const origin of origins) {
    const url = new URL(origin);
    if (!['http:', 'https:'].includes(url.protocol) || url.origin !== origin) throw new Error('APP_ORIGINS contine o origine invalida.');
  }
  return { secret, origins, secureCookie: process.env.NODE_ENV === 'production' };
}
