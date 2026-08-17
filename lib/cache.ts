import { Product } from './types';

/**
 * A „nincs az adatbázisban" eredményt is eltesszük. Enélkül egy ismeretlen
 * termék offline hálózati hibát adna, holott pontosan tudjuk róla, hogy nincs
 * felvive – és a saját jegyzeted így is meg tudna szólalni.
 */
export type CacheEntry =
  | { status: 'found'; product: Product; fetchedAt: string }
  | { status: 'not_found'; fetchedAt: string };

export type ProductCache = Record<string, CacheEntry>;

/** Nagyjából 200 termék: bőven több, mint amit egy bevásárlás beolvas. */
export const CACHE_LIMIT = 200;

/** A legrégebben lekérdezett tételek esnek ki, ha megtelt. */
export function prune(cache: ProductCache, limit: number = CACHE_LIMIT): ProductCache {
  const codes = Object.keys(cache);
  if (codes.length <= limit) return cache;

  const newestFirst = codes.sort((a, b) => (cache[a].fetchedAt < cache[b].fetchedAt ? 1 : -1));
  const kept: ProductCache = {};
  for (const code of newestFirst.slice(0, limit)) kept[code] = cache[code];
  return kept;
}

export function putEntry(cache: ProductCache, code: string, entry: CacheEntry): ProductCache {
  return prune({ ...cache, [code]: entry });
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

/** Régi vagy sérült mentésből is használható terméket épít, vagy `null`-t ad. */
function parseProduct(value: unknown): Product | null {
  if (typeof value !== 'object' || value === null) return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw.code !== 'string') return null;

  return {
    code: raw.code,
    name: stringOrNull(raw.name),
    brand: stringOrNull(raw.brand),
    imageUrl: stringOrNull(raw.imageUrl),
    quantity: stringOrNull(raw.quantity),
    allergenTags: stringArray(raw.allergenTags),
    traceTags: stringArray(raw.traceTags),
    labelTags: stringArray(raw.labelTags),
    analysisTags: stringArray(raw.analysisTags),
    ingredientsLang: stringOrNull(raw.ingredientsLang),
    ingredientsText: stringOrNull(raw.ingredientsText),
  };
}

function parseEntry(value: unknown): CacheEntry | null {
  if (typeof value !== 'object' || value === null) return null;
  const raw = value as Record<string, unknown>;
  const fetchedAt = typeof raw.fetchedAt === 'string' ? raw.fetchedAt : null;
  if (!fetchedAt) return null;

  if (raw.status === 'not_found') return { status: 'not_found', fetchedAt };
  if (raw.status === 'found') {
    const product = parseProduct(raw.product);
    return product ? { status: 'found', product, fetchedAt } : null;
  }
  return null;
}

export function parseCache(raw: string | null): ProductCache {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {};

    const cache: ProductCache = {};
    for (const [code, value] of Object.entries(parsed as Record<string, unknown>)) {
      const entry = parseEntry(value);
      if (entry) cache[code] = entry;
    }
    return prune(cache);
  } catch {
    return {};
  }
}
