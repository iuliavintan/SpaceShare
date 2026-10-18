import type { Prisma, PrismaClient } from '../../../generated/prisma/client.js';
import { HttpError } from '../../shared/http-error.js';
import type { ResourceFilters, resourceInput, availabilityInput, blockInput } from './resources.validation.js';
import { databaseTransaction } from '../../db/transaction.js';

export function resourcesService(client: PrismaClient) {
  return {
    async list(filters: ResourceFilters, admin: boolean) {
      if (!admin && filters.status !== 'active') throw new HttpError(403, 'Doar administratorii pot vedea resursele inactive.');
      const where: Prisma.ResourceWhereInput = {
        ...(filters.status === 'all' ? {} : { isActive: filters.status === 'active' }),
        categoryId: filters.categoryId, location: filters.location ? { contains: filters.location } : undefined,
        capacity: { gte: filters.minCapacity }, requiresApproval: filters.requiresApproval,
        ...(filters.q ? { OR: ['name', 'description', 'location'].map((field) => ({ [field]: { contains: filters.q } })) } : {}),
      };
      const [total, resources] = await client.$transaction([
        client.resource.count({ where }),
        client.resource.findMany({ where, include: { category: true }, orderBy: [{ name: 'asc' }, { id: 'asc' }], skip: (filters.page - 1) * filters.pageSize, take: filters.pageSize }),
      ]);
      return { resources, total, page: filters.page, pageSize: filters.pageSize };
    },
    async detail(id: string, admin: boolean) {
      const resource = await client.resource.findFirst({
        where: { id, ...(admin ? {} : { isActive: true }) },
        include: { category: true, availability: { orderBy: [{ dayOfWeek: 'asc' }, { startMinute: 'asc' }] }, blocks: { orderBy: { startAt: 'asc' } }, images: { where: { position: 0 }, select: { altText: true } }, ...(admin ? { _count: { select: { bookings: true } } } : {}) },
      });
      if (!resource) throw new HttpError(404, 'Resursa nu exista sau este dezactivata.');
      return resource;
    },
    async create(data: ReturnType<typeof resourceInput>) {
      return client.resource.create({ data, include: { category: true } });
    },
    async update(id: string, data: Partial<ReturnType<typeof resourceInput>>) {
      return client.resource.update({ where: { id }, data, include: { category: true } });
    },
    async replaceAvailability(resourceId: string, windows: ReturnType<typeof availabilityInput>) {
      return databaseTransaction(client, async (transaction) => {
        if (!await transaction.resource.findUnique({ where: { id: resourceId } })) throw new HttpError(404, 'Resursa nu exista.');
        // Until booking policies are implemented, preserve schedules used by active bookings.
        const count = await transaction.booking.count({ where: { resourceId, status: { in: ['PENDING', 'APPROVED'] }, endAt: { gt: new Date() } } });
        if (count) throw new HttpError(409, 'Programul nu poate fi inlocuit cat timp exista rezervari active viitoare.');
        await transaction.availability.deleteMany({ where: { resourceId } });
        if (windows.length) await transaction.availability.createMany({ data: windows.map((window) => ({ ...window, resourceId })) });
        return transaction.availability.findMany({ where: { resourceId }, orderBy: [{ dayOfWeek: 'asc' }, { startMinute: 'asc' }] });
      });
    },
    async createBlock(resourceId: string, data: ReturnType<typeof blockInput>) {
      return databaseTransaction(client, async (transaction) => {
        if (!await transaction.resource.findUnique({ where: { id: resourceId } })) throw new HttpError(404, 'Resursa nu exista.');
        const overlap = { resourceId, startAt: { lt: data.endAt }, endAt: { gt: data.startAt } };
        if (await transaction.booking.count({ where: { ...overlap, status: { in: ['PENDING', 'APPROVED'] } } })) throw new HttpError(409, 'Blocarea se suprapune unei rezervari active.');
        if (await transaction.resourceBlock.count({ where: overlap })) throw new HttpError(409, 'Exista deja o blocare in acest interval.');
        return transaction.resourceBlock.create({ data: { ...data, resourceId } });
      });
    },
    async deleteBlock(resourceId: string, id: string) {
      const deleted = await client.resourceBlock.deleteMany({ where: { id, resourceId } });
      if (!deleted.count) throw new HttpError(404, 'Blocarea nu exista pentru aceasta resursa.');
    },
  };
}
