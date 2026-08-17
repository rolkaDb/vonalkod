import { mergeHighlights, splitText } from '../highlight';

describe('mergeHighlights', () => {
  it('sorrendbe teszi a tartományokat', () => {
    const merged = mergeHighlights([
      { start: 10, end: 15, verdict: 'unsafe' },
      { start: 0, end: 5, verdict: 'caution' },
    ]);
    expect(merged.map((item) => item.start)).toEqual([0, 10]);
  });

  it('átfedésnél összevon, és a rosszabb ítélet nyer', () => {
    // A „mogyoróvaj" egyszerre lehet földimogyoró- és diófélé-találat.
    const merged = mergeHighlights([
      { start: 0, end: 10, verdict: 'caution' },
      { start: 5, end: 14, verdict: 'unsafe' },
    ]);
    expect(merged).toEqual([{ start: 0, end: 14, verdict: 'unsafe' }]);
  });

  it('az egymás melletti, nem átfedő tartományokat külön hagyja', () => {
    const merged = mergeHighlights([
      { start: 0, end: 5, verdict: 'unsafe' },
      { start: 5, end: 9, verdict: 'unsafe' },
    ]);
    expect(merged).toHaveLength(2);
  });

  it('eldobja az értelmetlen tartományokat', () => {
    expect(mergeHighlights([{ start: 5, end: 5, verdict: 'unsafe' }])).toEqual([]);
    expect(mergeHighlights([{ start: 8, end: 3, verdict: 'unsafe' }])).toEqual([]);
    expect(mergeHighlights([{ start: -2, end: 3, verdict: 'unsafe' }])).toEqual([]);
  });
});

describe('splitText', () => {
  it('kiemelt és sima darabokra vág', () => {
    const segments = splitText('cukor, tejpor, só', [{ start: 7, end: 13, verdict: 'unsafe' }]);
    expect(segments).toEqual([
      { text: 'cukor, ', verdict: null },
      { text: 'tejpor', verdict: 'unsafe' },
      { text: ', só', verdict: null },
    ]);
  });

  it('kiemelés nélkül egyetlen sima darabot ad', () => {
    expect(splitText('cukor, só', [])).toEqual([{ text: 'cukor, só', verdict: null }]);
  });

  it('a szöveg elején kezdődő kiemelést is kezeli', () => {
    expect(splitText('tejpor, cukor', [{ start: 0, end: 6, verdict: 'unsafe' }])).toEqual([
      { text: 'tejpor', verdict: 'unsafe' },
      { text: ', cukor', verdict: null },
    ]);
  });

  it('a szöveg hosszához vágja a túlnyúló tartományt', () => {
    // Elavult gyorsítótár-bejegyzésnél előfordulhat, hogy a pozíció már nem stimmel.
    expect(splitText('rövid', [{ start: 2, end: 999, verdict: 'unsafe' }])).toEqual([
      { text: 'rö', verdict: null },
      { text: 'vid', verdict: 'unsafe' },
    ]);
  });

  it('a szövegen kívüli tartományt figyelmen kívül hagyja', () => {
    expect(splitText('rövid', [{ start: 50, end: 60, verdict: 'unsafe' }])).toEqual([
      { text: 'rövid', verdict: null },
    ]);
  });

  it('az összefűzött darabok kiadják az eredeti szöveget', () => {
    const text = 'búzaliszt (55%), tejpor, só';
    const segments = splitText(text, [
      { start: 0, end: 9, verdict: 'unsafe' },
      { start: 17, end: 23, verdict: 'unsafe' },
    ]);
    expect(segments.map((segment) => segment.text).join('')).toBe(text);
  });
});
