export class ApiError extends Error {
  constructor(public readonly status: number, message: string) { super(message); }
}

export async function request(path: string, method = 'GET', body?: object | Blob, signal?: AbortSignal): Promise<unknown> {
  let response: Response;
  const fileBody = typeof Blob !== 'undefined' && body instanceof Blob ? body : undefined;
  try {
    response = await fetch(`/api${path}`, {
      method, credentials: 'same-origin', cache: 'no-store',
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(10000)]) : AbortSignal.timeout(10000),
      headers: body ? { 'Content-Type': fileBody?.type ?? 'application/json', 'X-SpaceShare-Request': '1' } : undefined,
      body: fileBody ?? (body ? JSON.stringify(body) : undefined),
    });
  } catch { throw new ApiError(0, 'Serverul nu poate fi contactat. Verifică conexiunea și încearcă din nou.'); }
  if (response.status === 204) return null;
  let data: unknown;
  try { data = await response.json(); }
  catch { throw new ApiError(response.status, 'Serverul a trimis un răspuns neașteptat. Încearcă din nou.'); }
  if (!response.ok) {
    const message = typeof data === 'object' && data !== null && 'error' in data && typeof data.error === 'string' ? data.error : 'Cererea nu a putut fi procesată.';
    throw new ApiError(response.status, message);
  }
  return data;
}
