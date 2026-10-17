import { Router } from 'express';
import type { PrismaClient } from '../../../generated/prisma/client.js';
import { requireRole } from '../../middleware/authenticate.js';
import { categoriesService } from './categories.service.js';
import { categoriesController } from './categories.controller.js';

export function createCategoriesRouter(client: PrismaClient) {
  const router = Router();
  const controller = categoriesController(categoriesService(client));
  router.get('/', controller.list);
  router.use(requireRole('ADMIN'));
  router.post('/', controller.create);
  router.patch('/:id', controller.update);
  return router;
}
