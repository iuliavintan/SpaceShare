import { HttpError } from './http-error.js';

export function objectInput(value: unknown, allowed: string[]): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new HttpError(400, 'Datele trebuie trimise ca obiect JSON.');
  if (Object.keys(value).some((key) => !allowed.includes(key))) throw new HttpError(400, 'Cererea contine campuri nepermise.');
  return value as Record<string, unknown>;
}

export function textInput(value: unknown, label: string, maximum = 120): string {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > maximum) throw new HttpError(400, `${label}: text obligatoriu, maximum ${maximum} caractere.`);
  return value.trim();
}
