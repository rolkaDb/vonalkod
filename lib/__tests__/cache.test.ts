import { CACHE_LIMIT, CacheEntry, parseCache, prune, ProductCache, putEntry } from '../cache';
import { Product } from '../types';

function product(code: string, overrides: Partial<Product> = {}): Product {
  return {
    code,
    name: `Termék ${code}`,
    brand: null,
    imageUrl: null,
    quantity: null,
    allergenTags: [],
    traceTags: [],
    labelTags: [],
    analysisTags: [],
    ingredientsText: null,
    ingredientsLang: null,
    ...overrides,
  };
}

function found(code: string, fetchedAt: string): CacheEntry {
  return { status: 'found', product: product(code), fetchedAt };
}

describe('putEntry', () => {
  it('elteszi a terméket a kódja alá', () => {
    const cache = putEntry({}, '111', found('111', '2026-08-12T10:00:00.000Z'));
    expect(cache['111'].status).toBe('found');
  });

  it('felülírja a korábbi mentést', () => {
    let cache = putEntry({}, '111', found('111', '2026-08-11T10:00:00.000Z'));
    cache = putEntry(cache, '111', found('111', '2026-08-12T10:00:00.000Z'));
    expect(Object.keys(cache)).toHaveLength(1);
    expect(cache['111'].fetchedAt).toBe('2026-08-12T10:00:00.000Z');
  });

  it('a „nincs az adatbázisban" eredményt is megjegyzi', () => {
    // Enélkül offline hálózati hibát mutatnánk olyan termékre, amiről
    // pontosan tudjuk, hogy nincs felvive.
    const cache = putEntry({}, '111', { status: 'not_found', fetchedAt: '2026-08-12T10:00:00.000Z' });
    expect(cache['111'].status).toBe('not_found');
  });
});

describe('prune', () => {
  it('a legrégebbieket dobja ki, ha megtelt', () => {
    let cache: ProductCache = {};
    for (let i = 0; i < 5; i++) {
      // Az `i` növekedésével egyre frissebb időbélyeg.
      cache = putEntry(cache, `code-${i}`, found(`code-${i}`, `2026-08-1${i}T10:00:00.000Z`));
    }
    const kept = prune(cache, 3);
    expect(Object.keys(kept).sort()).toEqual(['code-2', 'code-3', 'code-4']);
  });

  it('a korlát alatt nem nyúl hozzá', () => {
    const cache = putEntry({}, '111', found('111', '2026-08-12T10:00:00.000Z'));
    expect(prune(cache, 10)).toBe(cache);
  });

  it('a putEntry magától betartja a korlátot', () => {
    let cache: ProductCache = {};
    for (let i = 0; i < CACHE_LIMIT + 10; i++) {
      const stamp = new Date(Date.UTC(2026, 0, 1) + i * 60_000).toISOString();
      cache = putEntry(cache, `code-${i}`, found(`code-${i}`, stamp));
    }
    expect(Object.keys(cache)).toHaveLength(CACHE_LIMIT);
  });
});

describe('parseCache', () => {
  it('üres vagy sérült mentésnél üres gyorsítótárat ad', () => {
    expect(parseCache(null)).toEqual({});
    expect(parseCache('nem json')).toEqual({});
    expect(parseCache('[1,2]')).toEqual({});
  });

  it('visszaolvassa a mentett terméket', () => {
    const raw = JSON.stringify(putEntry({}, '111', found('111', '2026-08-12T10:00:00.000Z')));
    const cache = parseCache(raw);
    expect(cache['111'].status).toBe('found');
    expect(cache['111'].status === 'found' && cache['111'].product.name).toBe('Termék 111');
  });

  it('kidobja a hiányzó időbélyegű vagy ismeretlen státuszú tételeket', () => {
    const raw = JSON.stringify({
      '111': { status: 'found', product: product('111') },
      '222': { status: 'valami', fetchedAt: '2026-08-12T10:00:00.000Z' },
      '333': { status: 'not_found', fetchedAt: '2026-08-12T10:00:00.000Z' },
    });
    expect(Object.keys(parseCache(raw))).toEqual(['333']);
  });

  it('a hiányos termékmezőket biztonságos alapértékre hozza', () => {
    // Régebbi appverzió mentése is használható maradjon.
    const raw = JSON.stringify({
      '111': { status: 'found', fetchedAt: '2026-08-12T10:00:00.000Z', product: { code: '111' } },
    });
    const entry = parseCache(raw)['111'];
    expect(entry.status === 'found' && entry.product).toEqual({
      code: '111',
      name: null,
      brand: null,
      imageUrl: null,
      quantity: null,
      allergenTags: [],
      traceTags: [],
      labelTags: [],
      analysisTags: [],
      ingredientsText: null,
      ingredientsLang: null,
    });
  });
});
