import type { RequestHandler } from 'express';
import { HttpError } from '../shared/http-error.js';

export function authRateLimit(limit = 30, windowMs = 15 * 60 * 1000): RequestHandler {
  const attempts = new Map<string, { count: number; until: number }>();
  return (request, response, next) => {
    const now = Date.now();
    for (const [key, value] of attempts) if (value.until <= now) attempts.delete(key);
    const key = request.socket.remoteAddress ?? 'local';
    const attempt = attempts.get(key) ?? { count: 0, until: now + windowMs };
    attempts.set(key, attempt);
    attempt.count += 1;
    if (attempt.count > limit) {
      response.set('Retry-After', String(Math.ceil((attempt.until - now) / 1000)));
      return next(new HttpError(429, 'Prea multe incercari. Incearca din nou mai tarziu.'));
    }
    next();
  };
}
