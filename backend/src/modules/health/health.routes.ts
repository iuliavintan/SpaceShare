import { Router } from 'express';
import { prisma } from '../../db/client.js';

export const healthRouter = Router();

healthRouter.get('/', async (_request, response) => {
  await prisma.$queryRaw`SELECT 1`;
  response.set('Cache-Control', 'no-store');
  response.json({
    status: 'ok',
    service: 'spaceshare-api',
    database: 'connected',
    timestamp: new Date().toISOString(),
  });
});
