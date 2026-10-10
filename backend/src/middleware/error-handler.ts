import type { ErrorRequestHandler } from 'express';
import { HttpError } from '../shared/http-error.js';

export const errorHandler: ErrorRequestHandler = (error: unknown, _request, response, _next) => {
  const invalidJson = error instanceof SyntaxError && 'status' in error && error.status === 400;
  const tooLarge = typeof error === 'object' && error !== null && 'type' in error && error.type === 'entity.too.large';
  response.status(error instanceof HttpError ? error.status : invalidJson ? 400 : tooLarge ? 413 : 500).json({
    error: error instanceof HttpError ? error.message : invalidJson ? 'Corpul cererii nu este JSON valid.' : tooLarge ? 'Cererea este prea mare.' : 'A aparut o eroare interna.',
  });
};
