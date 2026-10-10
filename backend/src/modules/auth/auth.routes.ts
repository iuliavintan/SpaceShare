import { Router } from 'express';
import type { PrismaClient } from '../../../generated/prisma/client.js';
import type { AuthConfig } from '../../config/auth.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authRateLimit } from '../../middleware/auth-rate-limit.js';
import { createAuthService } from './auth.service.js';
import { authController } from './auth.controller.js';

export function createAuthRouter(client: PrismaClient, config: AuthConfig) {
  const router = Router();
  const service = createAuthService(client, config);
  const rateLimit = authRateLimit();
  const controller = authController(service, config);
  router.post('/register', rateLimit, controller.register);
  router.post('/login', rateLimit, controller.login);
  router.post('/logout', authenticate(service, config), controller.logout);
  return { router, service };
}
