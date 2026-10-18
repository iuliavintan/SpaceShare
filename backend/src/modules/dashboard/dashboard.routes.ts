import { Router } from 'express';
import type { PrismaClient } from '../../../generated/prisma/client.js';
import type { AuthService } from '../auth/auth.service.js';
import type { AuthConfig } from '../../config/auth.js';
import { authenticate } from '../../middleware/authenticate.js';
import { dashboardService } from './dashboard.service.js';

export function createDashboardRouter(client: PrismaClient, auth: AuthService, config: AuthConfig, clock: () => Date) {
  const router = Router();
  const service = dashboardService(client, clock);
  router.use(authenticate(auth, config));
  router.get('/', async (request, response) => { response.json(await service.get(request.authUser!)); });
  return router;
}
