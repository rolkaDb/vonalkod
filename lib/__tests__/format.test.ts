import { dayKey, formatScanDate } from '../format';

describe('dayKey', () => {
  it('helyi idő szerint azonosít napot', () => {
    // Késő este: UTC szerint már a következő nap lenne, helyi idő szerint nem.
    const late = new Date(2026, 7, 12, 23, 30);
    expect(dayKey(late)).toBe('2026-08-12');
  });

  it('nullával tölti a hónapot és a napot', () => {
    expect(dayKey(new Date(2026, 0, 3))).toBe('2026-01-03');
  });
});

describe('formatScanDate', () => {
  const now = new Date(2026, 7, 12, 14, 0);

  it('a mai napot „Ma"-ként írja', () => {
    expect(formatScanDate(new Date(2026, 7, 12, 9, 0).toISOString(), now)).toBe('Ma');
  });

  it('a tegnapit „Tegnap"-ként', () => {
    expect(formatScanDate(new Date(2026, 7, 11, 20, 0).toISOString(), now)).toBe('Tegnap');
  });

  it('a hónapfordulón is helyesen számol vissza', () => {
    const firstOfMonth = new Date(2026, 8, 1, 8, 0);
    expect(formatScanDate(new Date(2026, 7, 31, 8, 0).toISOString(), firstOfMonth)).toBe('Tegnap');
  });

  it('a régebbit dátumként', () => {
    expect(formatScanDate(new Date(2026, 7, 3, 8, 0).toISOString(), now)).toBe('2026. 08. 03.');
  });

  it('érvénytelen időbélyegre üres sztringet ad, nem omlik össze', () => {
    expect(formatScanDate('ez nem dátum', now)).toBe('');
  });
});
