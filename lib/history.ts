import { NoteMap } from './notes';
import { normalize } from './text';
import { DietKey, Verdict } from './types';

export type HistoryEntry = {
  code: string;
  name: string | null;
  brand: string | null;
  imageUrl: string | null;
  /** Az összesített ítélet a beolvasás pillanatában érvényes szűrőkkel. */
  verdict: Verdict;
  /**
   * Étrendenkénti bontás – enélkül a listán nem lehetne arra szűrni, hogy
   * „mutasd, ami gluténmentes". Régi mentésekben hiányzik, ezért részleges.
   */
  verdicts?: Partial<Record<DietKey, Verdict>>;
  /** ISO időbélyeg. */
  scannedAt: string;
};

/** Nem a tárhely miatt, hanem hogy a lista görgethető maradjon. */
export const HISTORY_LIMIT = 100;

/**
 * Legfrissebb elöl, **kódonként egyszer**. Az újraolvasás nem duplikál, hanem
 * felviszi a tetejére a frissebb ítélettel – a boltban ugyanazt a terméket
 * gyakran többször is a kamera elé kapja az ember.
 */
export function addEntry(history: HistoryEntry[], entry: HistoryEntry): HistoryEntry[] {
  const others = history.filter((item) => item.code !== entry.code);
  return [entry, ...others].slice(0, HISTORY_LIMIT);
}

/**
 * Csak azt tartjuk meg, amiről **tudjuk**, hogy mentes. A hiányzó bontás
 * (régi mentés) és a „nincs elég adat" is kiesik – egy „mutasd, ami
 * gluténmentes" listába nem kerülhet be olyasmi, amiről nincs információnk.
 */
export function filterByDiet(
  entries: HistoryEntry[],
  diet: DietKey | null,
): HistoryEntry[] {
  if (diet === null) return entries;
  return entries.filter((entry) => entry.verdicts?.[diet] === 'safe');
}

/**
 * Keresés névre, márkára, vonalkódra és a saját jegyzet nevére is.
 *
 * Ékezetre érzéketlen: a „turo" is megtalálja a „Túró Rudi"-t. Magyar
 * szövegnél ez nem kényelmi kérdés – a telefonon senki nem akar ékezetet
 * pötyögni keresés közben.
 */
export function searchEntries(
  entries: HistoryEntry[],
  query: string,
  notes: NoteMap = {},
): HistoryEntry[] {
  const needle = normalize(query).trim();
  if (needle.length === 0) return entries;

  return entries.filter((entry) => {
    const haystack = [entry.name, entry.brand, entry.code, notes[entry.code]?.name]
      .filter((value): value is string => typeof value === 'string' && value.length > 0)
      .map(normalize)
      .join(' ');
    return haystack.includes(needle);
  });
}

function isEntry(value: unknown): value is HistoryEntry {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.code === 'string' && typeof candidate.scannedAt === 'string';
}

/** Sérült mentésnél inkább üres listát adunk, mint hogy összeomoljunk. */
export function parseHistory(raw: string | null): HistoryEntry[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isEntry).slice(0, HISTORY_LIMIT);
  } catch {
    return [];
  }
}
