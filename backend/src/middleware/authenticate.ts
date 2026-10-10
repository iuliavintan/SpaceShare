import type { CookieOptions, RequestHandler } from 'express';
import type { Role } from '../../generated/prisma/client.js';
import type { AuthConfig } from '../config/auth.js';
import type { AuthService } from '../modules/auth/auth.service.js';
import { HttpError } from '../shared/http-error.js';

export const sessionCookie = 'spaceshare_session';
export function cookieOptions(config: AuthConfig): CookieOptions {
  return { httpOnly: true, sameSite: 'strict', secure: config.secureCookie, path: '/api' };
}

export function authenticate(service: AuthService, config: AuthConfig): RequestHandler {
  return async (request, response, next) => {
    const cookie = request.headers.cookie?.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${sessionCookie}=`));
    try {
      if (!cookie) throw new HttpError(401, 'Autentificarea este necesara.');
      request.authUser = await service.authenticate(cookie.slice(sessionCookie.length + 1));
      next();
    } catch (error: unknown) {
      if (cookie && error instanceof HttpError && error.status === 401) response.clearCookie(sessionCookie, cookieOptions(config));
      next(error);
    }
  };
}

export function requireRole(...roles: Role[]): RequestHandler {
  return (request, _response, next) => {
    if (!request.authUser) return next(new HttpError(401, 'Autentificarea este necesara.'));
    if (!roles.includes(request.authUser.role)) return next(new HttpError(403, 'Nu ai permisiunea pentru aceasta actiune.'));
    next();
  };
}
