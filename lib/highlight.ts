import { worse } from './diet';
import { Verdict } from './types';

export type Highlight = { start: number; end: number; verdict: Verdict };

/** A szöveg egy darabja: `verdict === null` esetén nincs kiemelve. */
export type Segment = { text: string; verdict: Verdict | null };

/**
 * Átfedő kiemelések összevonása. Átfedésnél a **rosszabb** ítélet nyer: ha egy
 * szó egyszerre két szűrőre is találat (a „mogyoróvaj" például földimogyoróra
 * és diófélére is), a súlyosabbat mutatjuk.
 */
export function mergeHighlights(highlights: Highlight[]): Highlight[] {
  const valid = highlights
    .filter((item) => item.end > item.start && item.start >= 0)
    .sort((a, b) => a.start - b.start || a.end - b.end);

  const merged: Highlight[] = [];
  for (const item of valid) {
    const last = merged[merged.length - 1];
    if (last && item.start < last.end) {
      last.end = Math.max(last.end, item.end);
      last.verdict = worse(last.verdict, item.verdict);
    } else {
      merged.push({ ...item });
    }
  }
  return merged;
}

/**
 * A szöveget kiemelt és sima darabokra vágja, a megjelenítéshez.
 * A tartományokat a szöveg hosszához vágjuk – egy elavult gyorsítótár-bejegyzés
 * miatt sose lóghassunk túl a szövegen.
 */
export function splitText(text: string, highlights: Highlight[]): Segment[] {
  const segments: Segment[] = [];
  let cursor = 0;

  for (const item of mergeHighlights(highlights)) {
    const start = Math.min(item.start, text.length);
    const end = Math.min(item.end, text.length);
    if (start >= end) continue;

    if (start > cursor) segments.push({ text: text.slice(cursor, start), verdict: null });
    segments.push({ text: text.slice(start, end), verdict: item.verdict });
    cursor = end;
  }

  if (cursor < text.length) segments.push({ text: text.slice(cursor), verdict: null });
  return segments;
}
