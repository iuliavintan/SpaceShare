import { Router } from 'express';
import type { PrismaClient } from '../../../generated/prisma/client.js';
import { requireRole } from '../../middleware/authenticate.js';
import { resourcesService } from './resources.service.js';
import { resourcesController } from './resources.controller.js';

// Authentication is applied once by the parent API router.
export function createResourcesRouter(client: PrismaClient) {
  const router = Router();
  const controller = resourcesController(resourcesService(client));
  router.use((request, response, next) => {
    if (['GET', 'HEAD'].includes(request.method)) return next();
    return requireRole('ADMIN')(request, response, next);
  });
  router.get('/', controller.list);
  router.get('/:id', controller.detail);
  router.post('/', controller.create);
  router.patch('/:id', controller.update);
  router.put('/:id/availability', controller.replaceAvailability);
  router.post('/:id/blocks', controller.createBlock);
  router.delete('/:id/blocks/:blockId', controller.deleteBlock);
  return router;
}
