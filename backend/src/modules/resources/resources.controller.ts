import type { RequestHandler } from 'express';
import { textInput } from '../../shared/validation.js';
import type { resourcesService } from './resources.service.js';
import { resourceFilters, resourceInput, availabilityInput, blockInput } from './resources.validation.js';

export function resourcesController(service: ReturnType<typeof resourcesService>) {
  const list: RequestHandler = async (request, response) => {
    response.json(await service.list(resourceFilters(request.query), request.authUser!.role === 'ADMIN'));
  };
  const detail: RequestHandler = async (request, response) => {
    response.json({ resource: await service.detail(textInput(request.params.id, 'ID'), request.authUser!.role === 'ADMIN') });
  };
  const create: RequestHandler = async (request, response) => {
    response.status(201).json({ resource: await service.create(resourceInput(request.body)) });
  };
  const update: RequestHandler = async (request, response) => {
    response.json({ resource: await service.update(textInput(request.params.id, 'ID'), resourceInput(request.body, true)) });
  };
  const replaceAvailability: RequestHandler = async (request, response) => {
    response.json({ availability: await service.replaceAvailability(textInput(request.params.id, 'ID'), availabilityInput(request.body)) });
  };
  const createBlock: RequestHandler = async (request, response) => {
    response.status(201).json({ block: await service.createBlock(textInput(request.params.id, 'ID'), blockInput(request.body)) });
  };
  const deleteBlock: RequestHandler = async (request, response) => {
    await service.deleteBlock(textInput(request.params.id, 'ID'), textInput(request.params.blockId, 'ID'));
    response.status(204).end();
  };
  return { list, detail, create, update, replaceAvailability, createBlock, deleteBlock };
}
