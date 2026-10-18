import type { RequestHandler } from 'express';
import { textInput } from '../../shared/validation.js';
import type { resourcesService } from './resources.service.js';
import type { floorplansService } from './floorplans.service.js';
import { resourceFilters, resourceInput, availabilityInput, blockInput } from './resources.validation.js';

export function resourcesController(service: ReturnType<typeof resourcesService>, floorplans: ReturnType<typeof floorplansService>) {
  const list: RequestHandler = async (request, response) => {
    response.json(await service.list(resourceFilters(request.query), request.authUser!.role === 'ADMIN'));
  };
  const detail: RequestHandler = async (request, response) => {
    const resource = await service.detail(textInput(request.params.id, 'ID'), request.authUser!.role === 'ADMIN');
    const { images, ...resourceData } = resource;
    response.json({ resource: { ...resourceData, floorplan: images[0] ? { url: `/api/resources/${encodeURIComponent(resource.id)}/floorplan/image`, altText: images[0].altText } : null } });
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
  const saveFloorplan: RequestHandler = async (request, response) => {
    const contentType = request.get('content-type')?.split(';', 1)[0]?.trim() ?? '';
    const image = await floorplans.save(textInput(request.params.id, 'ID'), contentType, request.body);
    response.status(200).json({ floorplan: { url: `/api/resources/${encodeURIComponent(textInput(request.params.id, 'ID'))}/floorplan/image`, altText: image.altText } });
  };
  const getFloorplanImage: RequestHandler = async (request, response) => {
    const result = await floorplans.read(textInput(request.params.id, 'ID'));
    response.type(result.image.path.slice(result.image.path.lastIndexOf('.') + 1)).send(result.file);
  };
  const deleteFloorplan: RequestHandler = async (request, response) => {
    await floorplans.remove(textInput(request.params.id, 'ID'));
    response.status(204).end();
  };
  return { list, detail, create, update, replaceAvailability, createBlock, deleteBlock, saveFloorplan, getFloorplanImage, deleteFloorplan };
}
