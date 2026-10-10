import type { AuthUser } from './auth.types';

export class ApiError extends Error {
  constructor(public readonly status: number, message: string) { super(message); }
}

async function request(path: string, method = 'GET', body?: object, signal?: AbortSignal): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      method, credentials: 'same-origin', cache: 'no-store',
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(10000)]) : AbortSignal.timeout(10000),
      headers: body ? { 'Content-Type': 'application/json', 'X-SpaceShare-Request': '1' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch { throw new ApiError(0, 'Serverul nu poate fi contactat. Verifică conexiunea și încearcă din nou.'); }
  if (response.status === 204) return null;
  const data: unknown = await response.json();
  if (!response.ok) {
    const message = typeof data === 'object' && data !== null && 'error' in data && typeof data.error === 'string' ? data.error : 'Cererea nu a putut fi procesată.';
    throw new ApiError(response.status, message);
  }
  return data;
}

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
