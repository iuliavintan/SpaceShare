import type { AuthUser } from './auth.types';
import { request } from '../../lib/http';
export { ApiError } from '../../lib/http';

function readUser(data: unknown): AuthUser {
  if (typeof data !== 'object' || data === null || !('user' in data)) throw new Error('Răspuns invalid.');
  const user = data.user;
  if (typeof user !== 'object' || user === null ||
    !('id' in user) || typeof user.id !== 'string' ||
    !('name' in user) || typeof user.name !== 'string' ||
    !('email' in user) || typeof user.email !== 'string' ||
    !('role' in user) || (user.role !== 'USER' && user.role !== 'ADMIN') ||
    !('createdAt' in user) || typeof user.createdAt !== 'string') throw new Error('Răspuns invalid.');
  return { id: user.id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt };
}

export const authApi = {
  async me(signal?: AbortSignal) { return readUser(await request('/users/me', 'GET', undefined, signal)); },
  async login(data: { email: string; password: string }) { return readUser(await request('/auth/login', 'POST', data)); },
  async register(data: { name: string; email: string; password: string }) { return readUser(await request('/auth/register', 'POST', data)); },
  async updateProfile(data: { name: string; email: string }) { return readUser(await request('/users/me', 'PATCH', data)); },
  async logout() { await request('/auth/logout', 'POST', {}); },
};
