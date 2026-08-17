import { HistoryEntry } from './history';

/** „Kedvenc" = rendszeresen veszem, „kerülendő" = tudom, hogy nem jó nekem. */
export type FavoriteKind = 'favorite' | 'avoid';

export type FavoriteEntry = HistoryEntry & { kind: FavoriteKind; addedAt: string };

export type FavoriteMap = Record<string, FavoriteEntry>;

/**
 * Ugyanarra a jelölésre koppintva levesszük, a másikra váltva átsoroljuk.
 * Egy termék egyszerre nem lehet kedvenc és kerülendő is.
 */
export function toggleFavorite(
  favorites: FavoriteMap,
  entry: HistoryEntry,
  kind: FavoriteKind,
  now: Date = new Date(),
): FavoriteMap {
  const next = { ...favorites };
  const current = next[entry.code];

  if (current?.kind === kind) {
    delete next[entry.code];
    return next;
  }

  next[entry.code] = { ...entry, kind, addedAt: now.toISOString() };
  return next;
}

export function kindOf(favorites: FavoriteMap, code: string): FavoriteKind | null {
  return favorites[code]?.kind ?? null;
}

/** Legutóbb hozzáadott elöl. */
export function listByKind(favorites: FavoriteMap, kind: FavoriteKind): FavoriteEntry[] {
  return Object.values(favorites)
    .filter((entry) => entry.kind === kind)
    .sort((a, b) => (a.addedAt < b.addedAt ? 1 : -1));
}

function parseEntry(code: string, value: unknown): FavoriteEntry | null {
  if (typeof value !== 'object' || value === null) return null;
  const raw = value as Record<string, unknown>;
  if (raw.kind !== 'favorite' && raw.kind !== 'avoid') return null;

  const text = (key: string): string | null =>
    typeof raw[key] === 'string' && (raw[key] as string).length > 0 ? (raw[key] as string) : null;

  return {
    code,
    name: text('name'),
    brand: text('brand'),
    imageUrl: text('imageUrl'),
    verdict:
      raw.verdict === 'safe' || raw.verdict === 'caution' || raw.verdict === 'unsafe'
        ? raw.verdict
        : 'unknown',
    scannedAt: text('scannedAt') ?? new Date(0).toISOString(),
    kind: raw.kind,
    addedAt: text('addedAt') ?? new Date(0).toISOString(),
  };
}

export function parseFavorites(raw: string | null): FavoriteMap {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {};

    const favorites: FavoriteMap = {};
    for (const [code, value] of Object.entries(parsed as Record<string, unknown>)) {
      const entry = parseEntry(code, value);
      if (entry) favorites[code] = entry;
    }
    return favorites;
  } catch {
    return {};
  }
}
