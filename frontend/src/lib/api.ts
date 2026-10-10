import type { HealthResponse } from '../types/health';

export async function getHealth(signal: AbortSignal): Promise<HealthResponse> {
  const response = await fetch('/api/health', { signal, cache: 'no-store' });
  if (!response.ok) throw new Error(`Serverul a răspuns cu HTTP ${response.status}.`);
  const data: unknown = await response.json();
  if (
    typeof data !== 'object' || data === null ||
    !('status' in data) || data.status !== 'ok' ||
    !('service' in data) || data.service !== 'spaceshare-api' ||
    !('timestamp' in data) || typeof data.timestamp !== 'string' ||
    !Number.isFinite(Date.parse(data.timestamp))
  ) throw new Error('Răspunsul serverului nu are formatul așteptat.');
  return { status: data.status, service: data.service, timestamp: data.timestamp };
}
