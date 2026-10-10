import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'node:crypto';
import { Prisma, type PrismaClient } from '../../../generated/prisma/client.js';
import type { AuthConfig } from '../../config/auth.js';
import { HttpError } from '../../shared/http-error.js';
import { publicUser } from '../users/user.types.js';
import type { registrationInput, loginInput } from './auth.validation.js';

export const sessionSeconds = 60 * 60;
const issuer = 'spaceshare-api';
const audience = 'spaceshare-web';

export function handleDuplicateEmail(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new HttpError(409, 'Exista deja un cont cu aceasta adresa de email.');
  throw error;
}

export function createAuthService(client: PrismaClient, config: AuthConfig) {
  // Compare unknown accounts too, so login failures follow the same hashing path.
  const dummyHash = bcrypt.hash(randomBytes(32).toString('hex'), 12);

  function session(user: { id: string; tokenVersion: number }) {
    return jwt.sign({ version: user.tokenVersion }, config.secret, {
      algorithm: 'HS256', subject: user.id, expiresIn: sessionSeconds, issuer, audience,
    });
  }

  return {
    async register(data: ReturnType<typeof registrationInput>) {
      const passwordHash = await bcrypt.hash(data.password, 12);
      try {
        const user = await client.user.create({ data: { name: data.name, email: data.email, passwordHash, role: 'USER' } });
        return { user: publicUser(user), token: session(user) };
      } catch (error: unknown) { return handleDuplicateEmail(error); }
    },
    async login(data: ReturnType<typeof loginInput>) {
      const user = await client.user.findUnique({ where: { email: data.email } });
      const valid = await bcrypt.compare(data.password, user?.passwordHash ?? await dummyHash);
      if (!user || !valid) throw new HttpError(401, 'Email sau parola incorecta.');
      return { user: publicUser(user), token: session(user) };
    },
    async authenticate(token: string) {
      let payload: jwt.JwtPayload | string;
      try { payload = jwt.verify(token, config.secret, { algorithms: ['HS256'], issuer, audience }); }
      catch { throw new HttpError(401, 'Sesiunea a expirat sau nu este valida.'); }
      if (typeof payload === 'string' || typeof payload.sub !== 'string' || !Number.isInteger(payload.version) || typeof payload.exp !== 'number') throw new HttpError(401, 'Sesiunea nu este valida.');
      const user = await client.user.findUnique({ where: { id: payload.sub } });
      if (!user || user.tokenVersion !== payload.version) throw new HttpError(401, 'Sesiunea nu mai este activa.');
      return publicUser(user);
    },
    async logout(userId: string) {
      await client.user.update({ where: { id: userId }, data: { tokenVersion: { increment: 1 } } });
    },
  };
}

export type AuthService = ReturnType<typeof createAuthService>;
