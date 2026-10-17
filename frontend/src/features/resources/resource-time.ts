export const weekdays = ['Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă', 'Duminică'];
export const formatMinute = (minute: number) => `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
export function parseMinute(value: string, allowMidnight = false) {
  if (allowMidnight && value === '24:00') return 1440;
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) throw new Error('Ora trebuie să fie în format HH:MM.');
  return Number(value.slice(0, 2)) * 60 + Number(value.slice(3));
}
const localFormatter = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Bucharest', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
function localParts(date: Date) {
  const parts = Object.fromEntries(localFormatter.formatToParts(date).map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}
// Resolve using Intl's timezone rules, independently of the computer's timezone.
export function bucharestToUtc(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) throw new Error('Completează data și ora.');
  const nominal = new Date(`${value}:00Z`).getTime();
  if (!Number.isFinite(nominal)) throw new Error('Data nu este validă.');
  const offsets = new Set([-86400000, 0, 86400000].map((delta) => {
    const sample = nominal + delta;
    return new Date(`${localParts(new Date(sample))}:00Z`).getTime() - sample;
  }));
  const candidates = [...offsets].map((offset) => new Date(nominal - offset)).filter((date) => localParts(date) === value);
  if (candidates.length !== 1) throw new Error('Ora aleasă nu există sau este ambiguă la schimbarea orei. Alege altă oră.');
  return candidates[0]!.toISOString();
}
export const formatDateTime = (value: string) => new Intl.DateTimeFormat('ro-RO', { timeZone: 'Europe/Bucharest', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
