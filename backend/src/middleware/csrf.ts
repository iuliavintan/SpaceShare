import type { RequestHandler } from 'express';
import type { AuthConfig } from '../config/auth.js';
import { HttpError } from '../shared/http-error.js';

export function csrfProtection(config: AuthConfig): RequestHandler {
  return (request, _response, next) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return next();
    const origin = request.get('origin');
    // A custom header requires a cross-origin preflight; this API enables no CORS.
    if (request.get('x-spaceshare-request') !== '1' || (origin && !config.origins.includes(origin))) {
      return next(new HttpError(403, 'Originea cererii nu este permisa.'));
    }
    if (!request.is('application/json') && !request.is(['image/png', 'image/jpeg', 'image/webp'])) {
      return next(new HttpError(415, 'Cererea trebuie trimisa ca JSON sau imagine PNG, JPEG ori WebP.'));
    }
    next();
  };
}
