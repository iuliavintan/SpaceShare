import type { RequestHandler } from 'express';
import { textInput } from '../../shared/validation.js';
import type { categoriesService } from './categories.service.js';
import { categoryInput } from './categories.validation.js';

export function categoriesController(service: ReturnType<typeof categoriesService>) {
  const list: RequestHandler = async (_request, response) => {
    response.json({ categories: await service.list() });
  };
  const create: RequestHandler = async (request, response) => {
    response.status(201).json({ category: await service.create(categoryInput(request.body)) });
  };
  const update: RequestHandler = async (request, response) => {
    response.json({ category: await service.update(textInput(request.params.id, 'ID'), categoryInput(request.body)) });
  };
  return { list, create, update };
}
