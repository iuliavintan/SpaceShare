import { Router } from 'express';
import type { PrismaClient } from '../../../generated/prisma/client.js';
import { bookingsController } from './bookings.controller.js';
import { bookingsService } from './bookings.service.js';
import { requireRole } from '../../middleware/authenticate.js';

export function createBookingsRouter(client: PrismaClient, clock: () => Date) {
  const router = Router();
  const controller = bookingsController(bookingsService(client, clock));
  router.get('/', controller.list);
  router.get('/:id', controller.detail);
  router.post('/', controller.create);
  router.post('/:id/cancel', controller.transition('cancel'));
  router.post('/:id/approve', requireRole('ADMIN'), controller.transition('approve'));
  router.post('/:id/reject', requireRole('ADMIN'), controller.transition('reject'));
  return router;
}

export function createBookingAvailabilityRouter(client: PrismaClient, clock: () => Date) {
  const router = Router();
  const controller = bookingsController(bookingsService(client, clock));
  router.get('/:id/calendar', controller.calendar);
  router.get('/:id/availability', controller.availability);
  return router;
}
