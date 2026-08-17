import { normalize, tokenize, tokenizeWithOffsets } from '../text';

describe('normalize', () => {
  it('leszedi a magyar ékezeteket és kisbetűsít', () => {
    expect(normalize('BÚZALISZT')).toBe('buzaliszt');
    expect(normalize('Tönkölybúza')).toBe('tonkolybuza');
    expect(normalize('tejsavó')).toBe('tejsavo');
    expect(normalize('Árpamaláta')).toBe('arpamalata');
  });

  it('a hosszú és rövid ékezetet ugyanoda hozza', () => {
    expect(normalize('ő')).toBe(normalize('ö'));
    expect(normalize('ű')).toBe(normalize('ü'));
  });

  it('nem bántja az ékezet nélküli szöveget', () => {
    expect(normalize('wheat flour 12%')).toBe('wheat flour 12%');
  });
});

describe('tokenize', () => {
  it('vesszőnél, zárójelnél és százaléknál is vág', () => {
    expect(tokenize('búzaliszt (55%), cukor, só')).toEqual([
      'buzaliszt',
      '55',
      'cukor',
      'so',
    ]);
  });

  it('a kötőjelet is elválasztónak veszi', () => {
    expect(tokenize('gluten-free')).toEqual(['gluten', 'free']);
  });

  it('üres szövegre üres tömböt ad', () => {
    expect(tokenize('')).toEqual([]);
    expect(tokenize('   ,,,  ')).toEqual([]);
  });
});

describe('tokenizeWithOffsets', () => {
  it('a pozíciók az EREDETI szövegre mutatnak', () => {
    const text = 'Cukor, BÚZAliszt, só';
    const tokens = tokenizeWithOffsets(text);
    const buza = tokens.find((token) => token.text === 'buzaliszt');

    expect(buza).toBeDefined();
    expect(text.slice(buza!.start, buza!.end)).toBe('BÚZAliszt');
  });

  it('minden ékezetes csere egy karakter marad', () => {
    // Ha az „ő"-ből két karakter lenne, az összes utána jövő pozíció elcsúszna.
    const text = 'tönkölybúza és zöldség';
    for (const token of tokenizeWithOffsets(text)) {
      expect(token.end - token.start).toBe(token.text.length);
    }
    expect(normalize('ß')).toHaveLength(1);
  });

  it('ugyanazokat a szavakat adja, mint a tokenize', () => {
    const text = 'búzaliszt (55%), gluten-free, só';
    expect(tokenizeWithOffsets(text).map((token) => token.text)).toEqual(tokenize(text));
  });
});
