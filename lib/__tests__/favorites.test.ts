import { FavoriteMap, kindOf, listByKind, parseFavorites, toggleFavorite } from '../favorites';
import { HistoryEntry } from '../history';

function entry(code: string): HistoryEntry {
  return {
    code,
    name: `Termék ${code}`,
    brand: null,
    imageUrl: null,
    verdict: 'safe',
    scannedAt: '2026-08-12T10:00:00.000Z',
  };
}

describe('toggleFavorite', () => {
  it('felveszi a jelölést', () => {
    const favorites = toggleFavorite({}, entry('111'), 'favorite');
    expect(kindOf(favorites, '111')).toBe('favorite');
  });

  it('ugyanarra a jelölésre koppintva leveszi', () => {
    let favorites = toggleFavorite({}, entry('111'), 'favorite');
    favorites = toggleFavorite(favorites, entry('111'), 'favorite');
    expect(kindOf(favorites, '111')).toBeNull();
    expect(Object.keys(favorites)).toHaveLength(0);
  });

  it('a másikra váltva átsorol, nem duplikál', () => {
    // Egy termék nem lehet egyszerre kedvenc és kerülendő.
    let favorites = toggleFavorite({}, entry('111'), 'favorite');
    favorites = toggleFavorite(favorites, entry('111'), 'avoid');
    expect(kindOf(favorites, '111')).toBe('avoid');
    expect(Object.keys(favorites)).toHaveLength(1);
  });

  it('nem módosítja az eredeti térképet', () => {
    const original: FavoriteMap = {};
    toggleFavorite(original, entry('111'), 'favorite');
    expect(original).toEqual({});
  });
});

describe('listByKind', () => {
  it('csak a kért fajtát adja, legutóbb hozzáadott elöl', () => {
    let favorites = toggleFavorite({}, entry('111'), 'favorite', new Date('2026-08-10T10:00:00Z'));
    favorites = toggleFavorite(favorites, entry('222'), 'avoid', new Date('2026-08-11T10:00:00Z'));
    favorites = toggleFavorite(favorites, entry('333'), 'favorite', new Date('2026-08-12T10:00:00Z'));

    expect(listByKind(favorites, 'favorite').map((item) => item.code)).toEqual(['333', '111']);
    expect(listByKind(favorites, 'avoid').map((item) => item.code)).toEqual(['222']);
  });
});

describe('parseFavorites', () => {
  it('üres vagy sérült mentésnél üres térképet ad', () => {
    expect(parseFavorites(null)).toEqual({});
    expect(parseFavorites('nem json')).toEqual({});
    expect(parseFavorites('[1,2]')).toEqual({});
  });

  it('visszaolvassa a mentett jelöléseket', () => {
    const raw = JSON.stringify(toggleFavorite({}, entry('111'), 'avoid'));
    expect(kindOf(parseFavorites(raw), '111')).toBe('avoid');
  });

  it('kidobja az ismeretlen fajtájú tételeket', () => {
    const raw = JSON.stringify({ '111': { kind: 'valami' }, '222': { kind: 'favorite' } });
    expect(Object.keys(parseFavorites(raw))).toEqual(['222']);
  });

  it('az ismeretlen ítéletet „nincs adat"-ra hozza', () => {
    const raw = JSON.stringify({ '111': { kind: 'favorite', verdict: 'zold' } });
    expect(parseFavorites(raw)['111'].verdict).toBe('unknown');
  });
});
