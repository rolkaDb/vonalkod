/**
 * Helyi idő szerinti nap-azonosító. Szándékosan NEM az ISO string első 10
 * karaktere: az UTC szerint vágna, így este 10 után már a következő napra
 * sorolná a beolvasást.
 */
export function dayKey(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

/** „Ma" / „Tegnap" / „2026. 08. 12." – érvénytelen időbélyegre üres sztring. */
export function formatScanDate(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';

  const key = dayKey(date);
  if (key === dayKey(now)) return 'Ma';
  if (key === dayKey(addDays(now, -1))) return 'Tegnap';

  return `${date.getFullYear()}. ${`${date.getMonth() + 1}`.padStart(2, '0')}. ${`${date.getDate()}`.padStart(2, '0')}.`;
}
