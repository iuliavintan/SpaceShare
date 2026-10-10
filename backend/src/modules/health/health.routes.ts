import { Router } from 'express';

export const healthRouter = Router();

healthRouter.get('/', (_request, response) => {
  response.set('Cache-Control', 'no-store');
  response.json({
    status: 'ok',
    service: 'spaceshare-api',
    timestamp: new Date().toISOString(),
  });
});
