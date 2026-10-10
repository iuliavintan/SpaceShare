import { Router } from 'express';
import type { PrismaClient } from '../../../generated/prisma/client.js';
import type { AuthConfig } from '../../config/auth.js';
import { authenticate } from '../../middleware/authenticate.js';
import type { AuthService } from '../auth/auth.service.js';
import { profileInput } from '../auth/auth.validation.js';
import { usersService } from './users.service.js';

export function createUsersRouter(client: PrismaClient, service: AuthService, config: AuthConfig) {
  const router = Router();
  const users = usersService(client);
  router.use(authenticate(service, config));
  router.get('/me', (request, response) => response.json({ user: request.authUser }));
  router.patch('/me', async (request, response) => {
    const data = profileInput(request.body);
    const user = await users.updateProfile(request.authUser!.id, data);
    response.json({ user });
  });
  return router;
}
