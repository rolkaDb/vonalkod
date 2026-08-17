import { emptyNote, isBlank, parseNotes } from '../notes';
import { DIET_KEYS } from '../types';

describe('emptyNote', () => {
  it('minden étrendet „nem tudom" állapotban hoz létre', () => {
    const note = emptyNote('111');
    expect(Object.keys(note.diets).sort()).toEqual([...DIET_KEYS].sort());
    expect(Object.values(note.diets).every((value) => value === 'unset')).toBe(true);
    expect(note.code).toBe('111');
  });

  it('átveszi a javasolt nevet', () => {
    expect(emptyNote('111', 'Reese’s').name).toBe('Reese’s');
  });
});

describe('isBlank', () => {
  it('a frissen nyitott űrlap üres', () => {
    expect(isBlank(emptyNote('111'))).toBe(true);
  });

  it('a csak szóközből álló név sem számít kitöltésnek', () => {
    expect(isBlank({ ...emptyNote('111'), name: '   ' })).toBe(true);
  });

  it('bármelyik étrend megjelölése kitöltéssé teszi', () => {
    const note = emptyNote('111');
    note.diets.gluten = 'safe';
    expect(isBlank(note)).toBe(false);
  });

  it('a puszta megjegyzés is kitöltés', () => {
    expect(isBlank({ ...emptyNote('111'), comment: 'tejport tartalmaz' })).toBe(false);
  });
});

describe('parseNotes', () => {
  it('üres vagy sérült mentésnél üres térképet ad', () => {
    expect(parseNotes(null)).toEqual({});
    expect(parseNotes('nem json')).toEqual({});
    expect(parseNotes('[1,2,3]')).toEqual({});
  });

  it('visszaolvassa a mentett jegyzetet', () => {
    const raw = JSON.stringify({
      '111': {
        name: 'Reese’s',
        comment: 'tejcsokoládé',
        diets: { gluten: 'safe', lactose: 'unsafe' },
        updatedAt: '2026-08-12T10:00:00.000Z',
      },
    });
    const notes = parseNotes(raw);
    expect(notes['111'].name).toBe('Reese’s');
    expect(notes['111'].diets.gluten).toBe('safe');
    expect(notes['111'].diets.lactose).toBe('unsafe');
  });

  it('az újonnan felvett étrendekre „nem tudom" kerül', () => {
    // A régi, kétszűrős jegyzet is betöltődik: a hiányzó kulcsok kitöltődnek.
    const raw = JSON.stringify({ '111': { diets: { gluten: 'safe', lactose: 'unsafe' } } });
    expect(parseNotes(raw)['111'].diets.sesame).toBe('unset');
  });

  it('az ismeretlen ítéletértéket „nem tudom"-ra állítja', () => {
    const raw = JSON.stringify({ '111': { diets: { gluten: 'talan', lactose: 'safe' } } });
    const diets = parseNotes(raw)['111'].diets;
    expect(diets.gluten).toBe('unset');
    expect(diets.lactose).toBe('safe');
  });

  it('a kulcsot használja kódnak, akkor is ha a rekordban más állna', () => {
    const raw = JSON.stringify({ '111': { code: '999', name: 'X' } });
    expect(parseNotes(raw)['111'].code).toBe('111');
  });
});
