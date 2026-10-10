import { HttpError } from '../../shared/http-error.js';

function object(value: unknown, allowed: string[]): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new HttpError(400, 'Datele trimise trebuie sa fie un obiect JSON.');
  if (Object.keys(value).some((key) => !allowed.includes(key))) throw new HttpError(400, 'Cererea contine campuri nepermise.');
  return value as Record<string, unknown>;
}

function email(value: unknown): string {
  if (typeof value !== 'string') throw new HttpError(400, 'Adresa de email este obligatorie.');
  const normalized = value.trim().toLowerCase();
  if (normalized.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) throw new HttpError(400, 'Adresa de email nu este valida.');
  return normalized;
}

export function validatePassword(value: unknown): string {
  if (typeof value !== 'string' || value.length < 8 || Buffer.byteLength(value, 'utf8') > 72) {
    throw new HttpError(400, 'Parola trebuie sa aiba minimum 8 caractere si maximum 72 bytes.');
  }
  return value;
}

function name(value: unknown): string {
  if (typeof value !== 'string' || value.trim().length < 2 || value.trim().length > 80) throw new HttpError(400, 'Numele trebuie sa aiba intre 2 si 80 de caractere.');
  return value.trim();
}

export function registrationInput(value: unknown) {
  const data = object(value, ['name', 'email', 'password']);
  return { name: name(data.name), email: email(data.email), password: validatePassword(data.password) };
}

export function loginInput(value: unknown) {
  const data = object(value, ['email', 'password']);
  return { email: email(data.email), password: validatePassword(data.password) };
}

export function profileInput(value: unknown) {
  const data = object(value, ['name', 'email']);
  return { name: name(data.name), email: email(data.email) };
}
