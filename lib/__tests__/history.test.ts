import {
  addEntry,
  filterByDiet,
  HISTORY_LIMIT,
  HistoryEntry,
  parseHistory,
  searchEntries,
} from '../history';

function entry(code: string, overrides: Partial<HistoryEntry> = {}): HistoryEntry {
  return {
    code,
    name: `Termék ${code}`,
    brand: null,
    imageUrl: null,
    verdict: 'safe',
    scannedAt: '2026-08-12T10:00:00.000Z',
    ...overrides,
  };
}

describe('addEntry', () => {
  it('a legfrissebbet teszi előre', () => {
    const history = addEntry(addEntry([], entry('111')), entry('222'));
    expect(history.map((item) => item.code)).toEqual(['222', '111']);
  });

  it('újraolvasásnál nem duplikál, hanem felhozza és frissíti', () => {
    const history = [entry('111'), entry('222'), entry('333')];
    const next = addEntry(history, entry('333', { verdict: 'unsafe' }));

    expect(next.map((item) => item.code)).toEqual(['333', '111', '222']);
    expect(next).toHaveLength(3);
    expect(next[0].verdict).toBe('unsafe');
  });

  it('nem nő a korlát fölé', () => {
    let history: HistoryEntry[] = [];
    for (let i = 0; i < HISTORY_LIMIT + 20; i++) {
      history = addEntry(history, entry(`code-${i}`));
    }
    expect(history).toHaveLength(HISTORY_LIMIT);
    // A legrégebbiek esnek ki, a legfrissebb marad elöl.
    expect(history[0].code).toBe(`code-${HISTORY_LIMIT + 19}`);
  });
});

describe('filterByDiet', () => {
  const items: HistoryEntry[] = [
    { ...entry('111'), verdicts: { gluten: 'safe', lactose: 'unsafe' } },
    { ...entry('222'), verdicts: { gluten: 'unsafe', lactose: 'safe' } },
    { ...entry('333'), verdicts: { gluten: 'caution', lactose: 'safe' } },
    { ...entry('444'), verdicts: { gluten: 'unknown', lactose: 'unknown' } },
    entry('555'), // régi mentés, bontás nélkül
  ];

  it('szűrő nélkül mindent visszaad', () => {
    expect(filterByDiet(items, null)).toHaveLength(5);
  });

  it('csak azt adja vissza, amiről tudjuk, hogy mentes', () => {
    expect(filterByDiet(items, 'gluten').map((item) => item.code)).toEqual(['111']);
    expect(filterByDiet(items, 'lactose').map((item) => item.code)).toEqual(['222', '333']);
  });

  it('a „nyomokban" és a „nincs adat" kimarad', () => {
    // Hiányzó adatból nem következik mentesség – ez a szűrő lényege.
    const codes = filterByDiet(items, 'gluten').map((item) => item.code);
    expect(codes).not.toContain('333');
    expect(codes).not.toContain('444');
  });

  it('a bontás nélküli régi mentés kimarad', () => {
    expect(filterByDiet(items, 'gluten').map((item) => item.code)).not.toContain('555');
  });

  it('a soha ki nem értékelt szűrőre üres listát ad', () => {
    expect(filterByDiet(items, 'sesame')).toEqual([]);
  });
});

describe('searchEntries', () => {
  const items: HistoryEntry[] = [
    { ...entry('5999076610013'), name: 'Túró Rudi', brand: 'Pöttyös' },
    { ...entry('3017620422003'), name: 'Nutella', brand: 'Ferrero' },
    { ...entry('034000452996'), name: null, brand: null },
  ];

  it('üres keresésre mindent visszaad', () => {
    expect(searchEntries(items, '')).toHaveLength(3);
    expect(searchEntries(items, '   ')).toHaveLength(3);
  });

  it('névre keres', () => {
    expect(searchEntries(items, 'nutella').map((item) => item.name)).toEqual(['Nutella']);
  });

  it('ékezet nélkül is megtalálja az ékezetes nevet', () => {
    // Telefonon senki nem akar ékezetet pötyögni kereséshez.
    expect(searchEntries(items, 'turo').map((item) => item.name)).toEqual(['Túró Rudi']);
    expect(searchEntries(items, 'pottyos').map((item) => item.name)).toEqual(['Túró Rudi']);
  });

  it('márkára és vonalkódra is keres', () => {
    expect(searchEntries(items, 'ferrero')).toHaveLength(1);
    expect(searchEntries(items, '034000')).toHaveLength(1);
  });

  it('a saját jegyzet nevét is átnézi', () => {
    // A névtelen terméket csak így lehet megtalálni.
    const notes = {
      '034000452996': {
        code: '034000452996',
        name: 'Reese’s szelet',
        diets: {} as never,
        ingredients: '',
        comment: '',
        updatedAt: '',
      },
    };
    expect(searchEntries(items, 'reese', notes).map((item) => item.code)).toEqual([
      '034000452996',
    ]);
  });

  it('nem egyező keresésre üres listát ad', () => {
    expect(searchEntries(items, 'kenyér')).toEqual([]);
  });
});

describe('parseHistory', () => {
  it('üres mentésnél üres listát ad', () => {
    expect(parseHistory(null)).toEqual([]);
    expect(parseHistory('')).toEqual([]);
  });

  it('sérült JSON-nál nem dob hibát', () => {
    expect(parseHistory('{{{')).toEqual([]);
  });

  it('nem tömb esetén is üres listát ad', () => {
    expect(parseHistory('{"code":"111"}')).toEqual([]);
  });

  it('kidobja a hiányos elemeket, a jókat megtartja', () => {
    const raw = JSON.stringify([entry('111'), { name: 'kód nélkül' }, null, entry('222')]);
    expect(parseHistory(raw).map((item) => item.code)).toEqual(['111', '222']);
  });
});
