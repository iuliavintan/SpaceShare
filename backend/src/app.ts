import express from 'express';
import { errorHandler } from './middleware/error-handler.js';
import { createHealthRouter } from './modules/health/health.routes.js';
import type { PrismaClient } from '../generated/prisma/client.js';
import type { AuthConfig } from './config/auth.js';
import { getAuthConfig } from './config/auth.js';
import { prisma } from './db/client.js';
import { csrfProtection } from './middleware/csrf.js';
import { createAuthRouter } from './modules/auth/auth.routes.js';
import { createUsersRouter } from './modules/users/users.routes.js';

export function createApp(client: PrismaClient = prisma, config: AuthConfig = getAuthConfig()) {
  const app = express();
  app.disable('x-powered-by');
  app.use('/api', (_request, response, next) => {
    response.set('Cache-Control', 'no-store');
    next();
  });
  app.use('/api', csrfProtection(config));
  app.use(express.json({ limit: '100kb' }));
  app.use('/api/health', createHealthRouter(client));
  const auth = createAuthRouter(client, config);
  app.use('/api/auth', auth.router);
  app.use('/api/users', createUsersRouter(client, auth.service, config));
  app.use((_request, response) => {
    response.status(404).json({ error: 'Ruta nu exista.' });
  });
  app.use(errorHandler);
  return app;
}
