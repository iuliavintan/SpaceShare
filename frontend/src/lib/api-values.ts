export function readObject(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error('Răspuns API invalid.');
  return value as Record<string, unknown>;
}
export function readString(value: unknown): string { if (typeof value !== 'string') throw new Error('Text invalid în răspuns.'); return value; }
export function readInteger(value: unknown): number { if (typeof value !== 'number' || !Number.isInteger(value)) throw new Error('Număr invalid în răspuns.'); return value; }
export function readBoolean(value: unknown): boolean { if (typeof value !== 'boolean') throw new Error('Valoare invalidă în răspuns.'); return value; }
export function readArray<T>(value: unknown, read: (value: unknown) => T): T[] { if (!Array.isArray(value)) throw new Error('Listă invalidă în răspuns.'); return value.map(read); }
