import express from 'express';
import { join } from 'node:path';
import { errorHandler } from './middleware/error-handler.js';
import { createHealthRouter } from './modules/health/health.routes.js';
import type { PrismaClient } from '../generated/prisma/client.js';
import type { AuthConfig } from './config/auth.js';
import { getAuthConfig } from './config/auth.js';
import { prisma } from './db/client.js';
import { csrfProtection } from './middleware/csrf.js';
import { createAuthRouter } from './modules/auth/auth.routes.js';
import { createUsersRouter } from './modules/users/users.routes.js';
import { authenticate } from './middleware/authenticate.js';
import { createResourcesRouter } from './modules/resources/resources.routes.js';
import { createCategoriesRouter } from './modules/categories/categories.routes.js';
import { createBookingsRouter, createBookingAvailabilityRouter } from './modules/bookings/bookings.routes.js';
import { createDashboardRouter } from './modules/dashboard/dashboard.routes.js';
import { createNotificationsRouter } from './modules/notifications/notifications.routes.js';

export function createApp(client: PrismaClient = prisma, config: AuthConfig = getAuthConfig(), clock: () => Date = () => new Date(), floorplanDirectory = join(process.cwd(), 'uploads', 'floorplans')) {
  const app = express();
  app.disable('x-powered-by');
  app.use('/api', (_request, response, next) => {
    response.set('Cache-Control', 'no-store');
    next();
  });
  app.use('/api', csrfProtection(config));
  app.use('/api/resources/:id/floorplan', express.raw({ type: ['image/png', 'image/jpeg', 'image/webp'], limit: '5mb' }));
  app.use(express.json({ limit: '100kb' }));
  app.use('/api/health', createHealthRouter(client));
  const auth = createAuthRouter(client, config);
  app.use('/api/auth', auth.router);
  app.use('/api/users', createUsersRouter(client, auth.service, config));
  app.use('/api/resources', authenticate(auth.service, config), createResourcesRouter(client, floorplanDirectory), createBookingAvailabilityRouter(client, clock));
  app.use('/api/categories', authenticate(auth.service, config), createCategoriesRouter(client));
  app.use('/api/bookings', authenticate(auth.service, config), createBookingsRouter(client, clock));
  app.use('/api/dashboard', createDashboardRouter(client, auth.service, config, clock));
  app.use('/api/notifications', createNotificationsRouter(client, auth.service, config, clock));
  app.use((_request, response) => {
    response.status(404).json({ error: 'Ruta nu exista.' });
  });
  app.use(errorHandler);
  return app;
}
