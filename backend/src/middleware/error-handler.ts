import type { ErrorRequestHandler } from 'express';
import { HttpError } from '../shared/http-error.js';
import { Prisma } from '../../generated/prisma/client.js';

export const errorHandler: ErrorRequestHandler = (error: unknown, _request, response, _next) => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') error = new HttpError(409, 'Aceasta valoare exista deja.');
    else if (error.code === 'P2003') error = new HttpError(400, 'Referinta la datele asociate nu este valida.');
    else if (error.code === 'P2025') error = new HttpError(404, 'Inregistrarea nu exista.');
  }
  const invalidJson = error instanceof SyntaxError && 'status' in error && error.status === 400;
  const tooLarge = typeof error === 'object' && error !== null && 'type' in error && error.type === 'entity.too.large';
  response.status(error instanceof HttpError ? error.status : invalidJson ? 400 : tooLarge ? 413 : 500).json({
    error: error instanceof HttpError ? error.message : invalidJson ? 'Corpul cererii nu este JSON valid.' : tooLarge ? 'Cererea este prea mare.' : 'A aparut o eroare interna.',
  });
};
