import { request } from '../../lib/http';
import type { AvailabilityWindow, Category, Resource, ResourceBlock, ResourceDetail, ResourceFilters, ResourceInput, ResourceList } from './resources.types';

import { readObject as object, readString as string, readInteger as number, readBoolean as boolean, readArray as array } from '../../lib/api-values';
function category(value: unknown): Category { const row = object(value); return { id: string(row.id), name: string(row.name) }; }
function resource(value: unknown): Resource {
  const row = object(value);
  return { id: string(row.id), name: string(row.name), description: string(row.description), location: string(row.location), categoryId: string(row.categoryId), capacity: number(row.capacity), facilities: array(row.facilities, string), isActive: boolean(row.isActive), requiresApproval: boolean(row.requiresApproval), category: category(row.category) };
}
function window(value: unknown): AvailabilityWindow { const row = object(value); return { id: string(row.id), dayOfWeek: number(row.dayOfWeek), startMinute: number(row.startMinute), endMinute: number(row.endMinute) }; }
function block(value: unknown): ResourceBlock { const row = object(value); return { id: string(row.id), startAt: string(row.startAt), endAt: string(row.endAt), reason: string(row.reason) }; }
const path = (id: string) => `/resources/${encodeURIComponent(id)}`;

export const resourcesApi = {
  async categories(signal?: AbortSignal): Promise<Category[]> { return array(object(await request('/categories', 'GET', undefined, signal)).categories, category); },
  async saveCategory(name: string, id?: string) { return category(object(await request(id ? `/categories/${encodeURIComponent(id)}` : '/categories', id ? 'PATCH' : 'POST', { name })).category); },
  async list(filters: ResourceFilters, signal?: AbortSignal): Promise<ResourceList> {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) if (value !== undefined && value !== '') query.set(key, String(value));
    const data = object(await request(`/resources?${query}`, 'GET', undefined, signal));
    return { resources: array(data.resources, resource), total: number(data.total), page: number(data.page), pageSize: number(data.pageSize) };
  },
  async detail(id: string, signal?: AbortSignal): Promise<ResourceDetail> {
    const row = object(object(await request(path(id), 'GET', undefined, signal)).resource);
    return { ...resource(row), availability: array(row.availability, window), blocks: array(row.blocks, block) };
  },
  async create(data: ResourceInput) { return resource(object(await request('/resources', 'POST', data)).resource); },
  async update(id: string, data: Partial<ResourceInput>) { return resource(object(await request(path(id), 'PATCH', data)).resource); },
  async saveAvailability(id: string, windows: AvailabilityWindow[]) { await request(`${path(id)}/availability`, 'PUT', { windows: windows.map(({ dayOfWeek, startMinute, endMinute }) => ({ dayOfWeek, startMinute, endMinute })) }); },
  async createBlock(id: string, data: Omit<ResourceBlock, 'id'>) { await request(`${path(id)}/blocks`, 'POST', data); },
  async deleteBlock(id: string, blockId: string) { await request(`${path(id)}/blocks/${encodeURIComponent(blockId)}`, 'DELETE', {}); },
};
