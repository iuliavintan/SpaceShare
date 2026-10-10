import bcrypt from 'bcrypt';
import type { PrismaClient } from '../generated/prisma/client.js';
import { registrationInput } from '../src/modules/auth/auth.validation.js';

export async function seedAdmin(client: PrismaClient, settings = { email: process.env.SEED_ADMIN_EMAIL, password: process.env.SEED_ADMIN_PASSWORD }) {
  if (!settings.email && !settings.password) return;
  const data = registrationInput({ name: 'Administrator SpaceShare', email: settings.email, password: settings.password });
  const existing = await client.user.findUnique({ where: { email: data.email } });
  if (existing) {
    if (existing.role !== 'ADMIN') throw new Error('Emailul pentru seed ADMIN este folosit deja de un utilizator. Alege o alta adresa.');
    return; // Do not reset an existing administrator's profile or password.
  }
  await client.user.create({ data: { name: data.name, email: data.email, passwordHash: await bcrypt.hash(data.password, 12), role: 'ADMIN' } });
}
