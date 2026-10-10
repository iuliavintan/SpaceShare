import type { ErrorRequestHandler } from 'express';

export const errorHandler: ErrorRequestHandler = (error: unknown, _request, response, _next) => {
  const invalidJson = error instanceof SyntaxError && 'status' in error && error.status === 400;
  response.status(invalidJson ? 400 : 500).json({
    error: invalidJson ? 'Corpul cererii nu este JSON valid.' : 'A aparut o eroare interna.',
  });
};
