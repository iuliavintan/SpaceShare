import type { RequestHandler } from 'express';
import { objectInput, textInput } from '../../shared/validation.js';
import type { bookingsService, BookingAction } from './bookings.service.js';
import { bookingFilters, bookingInput, bookingInterval } from './bookings.validation.js';

export function bookingsController(service: ReturnType<typeof bookingsService>) {
  const create: RequestHandler = async (request, response) => {
    response.status(201).json({ booking: await service.create(request.authUser!, bookingInput(request.body)) });
  };
  const list: RequestHandler = async (request, response) => {
    response.json(await service.list(request.authUser!, bookingFilters(request.query)));
  };
  const detail: RequestHandler = async (request, response) => {
    response.json({ booking: await service.detail(request.authUser!, textInput(request.params.id, 'ID')) });
  };
  const availability: RequestHandler = async (request, response) => {
    response.json(await service.availability(request.authUser!, textInput(request.params.id, 'ID'), bookingInterval(objectInput(request.query, ['startAt', 'endAt']))));
  };
  const transition = (action: BookingAction): RequestHandler => async (request, response) => {
    objectInput(request.body, []);
    response.json({ booking: await service.transition(request.authUser!, textInput(request.params.id, 'ID'), action) });
  };
  return { create, list, detail, availability, transition };
}
