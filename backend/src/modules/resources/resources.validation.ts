import { HttpError } from '../../shared/http-error.js';
import { objectInput, textInput } from '../../shared/validation.js';
import { dateInput } from '../../shared/date-input.js';

function integerInput(value: unknown, label: string, minimum = 1, maximum = 100000): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < minimum || value > maximum) throw new HttpError(400, `${label}: numar intreg intre ${minimum} si ${maximum}.`);
  return value;
}

export function resourceFilters(query: unknown) {
  const data = objectInput(query, ['q', 'categoryId', 'location', 'minCapacity', 'requiresApproval', 'status', 'page', 'pageSize']);
  function number(key: string, fallback: number, maximum: number) {
    if (data[key] === undefined) return fallback;
    if (typeof data[key] !== 'string' || !/^\d+$/.test(data[key])) throw new HttpError(400, `Filtrul ${key} este invalid.`);
    return integerInput(Number(data[key]), key, 1, maximum);
  }
  function optionalText(key: string) { return data[key] === undefined ? undefined : textInput(data[key], key); }
  const status = data.status ?? 'active';
  if (!['active', 'inactive', 'all'].includes(String(status)) || typeof status !== 'string') throw new HttpError(400, 'Status invalid.');
  if (data.requiresApproval !== undefined && data.requiresApproval !== 'true' && data.requiresApproval !== 'false') throw new HttpError(400, 'Filtrul de aprobare este invalid.');
  return {
    q: optionalText('q'), categoryId: optionalText('categoryId'), location: optionalText('location'),
    minCapacity: number('minCapacity', 1, 100000), status,
    requiresApproval: data.requiresApproval === undefined ? undefined : data.requiresApproval === 'true',
    page: number('page', 1, 100000), pageSize: number('pageSize', 12, 50),
  };
}

export type ResourceFilters = ReturnType<typeof resourceFilters>;

interface ResourceInput {
  name: string;
  description: string;
  categoryId: string;
  location: string;
  capacity: number;
  facilities: string[];
  requiresApproval: boolean;
  isActive: boolean;
}

export function resourceInput(value: unknown, partial: true): Partial<ResourceInput>;
export function resourceInput(value: unknown, partial?: false): ResourceInput;
export function resourceInput(value: unknown, partial = false): Partial<ResourceInput> {
  const data = objectInput(value, ['name', 'description', 'categoryId', 'location', 'capacity', 'facilities', 'requiresApproval', 'isActive']);
  if (partial && !Object.keys(data).length) throw new HttpError(400, 'Trimite cel putin un camp de modificat.');
  const result: Partial<ResourceInput> = {};
  for (const field of ['name', 'description', 'categoryId', 'location'] as const) {
    if (!partial || field in data) result[field] = textInput(data[field], field, field === 'description' ? 2000 : 120);
  }
  if (!partial || 'capacity' in data) result.capacity = integerInput(data.capacity, 'Capacitate');
  for (const field of ['requiresApproval', 'isActive'] as const) {
    if (field in data) {
      if (typeof data[field] !== 'boolean') throw new HttpError(400, `${field} trebuie sa fie boolean.`);
      result[field] = data[field];
    } else if (!partial) result[field] = field === 'isActive';
  }
  if ('facilities' in data) {
    if (!Array.isArray(data.facilities) || data.facilities.length > 30) throw new HttpError(400, 'Facilitati: lista cu maximum 30 de elemente.');
    result.facilities = [...new Set(data.facilities.map((item: unknown) => textInput(item, 'Facilitate', 80)))];
  } else if (!partial) result.facilities = [];
  return result;
}

export function availabilityInput(value: unknown) {
  const data = objectInput(value, ['windows']);
  if (!Array.isArray(data.windows) || data.windows.length > 70) throw new HttpError(400, 'Programul trebuie sa contina maximum 70 de intervale.');
  const windows = data.windows.map((item: unknown) => {
    const row = objectInput(item, ['dayOfWeek', 'startMinute', 'endMinute']);
    const window = {
      dayOfWeek: integerInput(row.dayOfWeek, 'Zi', 1, 7),
      startMinute: integerInput(row.startMinute, 'Inceput', 0, 1439),
      endMinute: integerInput(row.endMinute, 'Sfarsit', 1, 1440),
    };
    if (window.startMinute >= window.endMinute) throw new HttpError(400, 'Ora de inceput trebuie sa fie inaintea orei de sfarsit.');
    return window;
  }).sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startMinute - b.startMinute);
  for (let index = 1; index < windows.length; index++) {
    const previous = windows[index - 1]!;
    const current = windows[index]!;
    if (previous.dayOfWeek === current.dayOfWeek && previous.endMinute > current.startMinute) throw new HttpError(400, 'Intervalele programului nu se pot suprapune.');
  }
  return windows;
}

export function blockInput(value: unknown) {
  const data = objectInput(value, ['startAt', 'endAt', 'reason']);
  const startAt = dateInput(data.startAt), endAt = dateInput(data.endAt);
  if (startAt >= endAt || endAt.getTime() <= Date.now()) throw new HttpError(400, 'Blocarea trebuie sa aiba un interval valid, care nu s-a incheiat.');
  return { startAt, endAt, reason: textInput(data.reason, 'Motiv', 500) };
}
