import { Router } from 'express';
import type { PrismaClient } from '../../../generated/prisma/client.js';
import { requireRole } from '../../middleware/authenticate.js';
import { resourcesService } from './resources.service.js';
import { resourcesController } from './resources.controller.js';
import { floorplansService } from './floorplans.service.js';

// Authentication is applied once by the parent API router.
export function createResourcesRouter(client: PrismaClient, floorplanDirectory: string) {
  const router = Router();
  const controller = resourcesController(resourcesService(client), floorplansService(client, floorplanDirectory));
  router.use((request, response, next) => {
    if (['GET', 'HEAD'].includes(request.method)) return next();
    return requireRole('ADMIN')(request, response, next);
  });
  router.get('/', controller.list);
  router.get('/:id', controller.detail);
  router.get('/:id/floorplan/image', controller.getFloorplanImage);
  router.post('/', controller.create);
  router.patch('/:id', controller.update);
  router.put('/:id/floorplan', controller.saveFloorplan);
  router.delete('/:id/floorplan', controller.deleteFloorplan);
  router.put('/:id/availability', controller.replaceAvailability);
  router.post('/:id/blocks', controller.createBlock);
  router.delete('/:id/blocks/:blockId', controller.deleteBlock);
  return router;
}
