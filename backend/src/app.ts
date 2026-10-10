import express from 'express';
import { errorHandler } from './middleware/error-handler.js';
import { healthRouter } from './modules/health/health.routes.js';

export const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '100kb' }));
app.use('/api/health', healthRouter);
app.use((_request, response) => {
  response.status(404).json({ error: 'Ruta nu exista.' });
});
app.use(errorHandler);
