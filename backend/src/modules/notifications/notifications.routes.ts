import { Router } from 'express';
import type { PrismaClient } from '../../../generated/prisma/client.js';
import type { AuthService } from '../auth/auth.service.js';
import type { AuthConfig } from '../../config/auth.js';
import { authenticate } from '../../middleware/authenticate.js';
import { textInput } from '../../shared/validation.js';
import { notificationsService } from './notifications.service.js';

export function createNotificationsRouter(client: PrismaClient, auth: AuthService, config: AuthConfig, clock: () => Date) {
  const router = Router();
  const service = notificationsService(client, clock);
  router.use(authenticate(auth, config));
  router.get('/', async (request, response) => { response.json(await service.list(request.authUser!)); });
  router.patch('/:id/read', async (request, response) => {
    response.json(await service.markRead(request.authUser!, textInput(request.params.id, 'ID')));
  });
  return router;
}
