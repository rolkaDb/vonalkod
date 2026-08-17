import { DIET_KEYS, DietKey } from './types';

/**
 * A felhasználó saját megállapítása egy termékről, miután elolvasta a
 * csomagolást. Az `unset` azt jelenti: nem nyilatkozott, maradjon az adatbázis
 * (vagy annak hiánya) az irányadó.
 */
export type NoteVerdict = 'safe' | 'unsafe' | 'unset';

export type ProductNote = {
  code: string;
  name: string;
  diets: Record<DietKey, NoteVerdict>;
  /**
   * A csomagolásról beírt (vagy később fényképről kiolvasott) összetevőlista.
   *
   * Ez többet ér, mint az étrendenkénti kézi jelölés: egyszer beírod, és az app
   * mind a 16 szűrőre maga vonja le a következtetést – akkor is, ha később
   * kapcsolsz be egy újat.
   */
  ingredients: string;
  comment: string;
  updatedAt: string;
};

export type NoteMap = Record<string, ProductNote>;

export function emptyNote(code: string, name = ''): ProductNote {
  const diets = {} as Record<DietKey, NoteVerdict>;
  for (const diet of DIET_KEYS) diets[diet] = 'unset';
  return {
    code,
    name,
    diets,
    ingredients: '',
    comment: '',
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Üres jegyzetet nem mentünk el – különben minden megnyitott, majd
 * mentés nélkül elhagyott űrlap szemetet hagyna maga után.
 */
export function isBlank(note: ProductNote): boolean {
  const hasVerdict = DIET_KEYS.some((diet) => note.diets[diet] !== 'unset');
  return (
    !hasVerdict &&
    note.name.trim().length === 0 &&
    note.comment.trim().length === 0 &&
    note.ingredients.trim().length === 0
  );
}

/**
 * Van-e a jegyzetben tényleges étrend-megjelölés. A puszta név vagy megjegyzés
 * nem számít: az nem befolyásolja az ítéletet, tehát nem is szabad úgy jelölni.
 */
export function hasVerdict(note: ProductNote | null | undefined): boolean {
  if (!note) return false;
  return DIET_KEYS.some((diet) => note.diets[diet] !== 'unset');
}

function isVerdict(value: unknown): value is NoteVerdict {
  return value === 'safe' || value === 'unsafe' || value === 'unset';
}

function parseNote(code: string, value: unknown): ProductNote | null {
  if (typeof value !== 'object' || value === null) return null;
  const candidate = value as Record<string, unknown>;
  const note = emptyNote(code);

  if (typeof candidate.name === 'string') note.name = candidate.name;
  if (typeof candidate.comment === 'string') note.comment = candidate.comment;
  if (typeof candidate.ingredients === 'string') note.ingredients = candidate.ingredients;
  if (typeof candidate.updatedAt === 'string') note.updatedAt = candidate.updatedAt;

  const diets = candidate.diets;
  if (typeof diets === 'object' && diets !== null) {
    for (const diet of DIET_KEYS) {
      const stored = (diets as Record<string, unknown>)[diet];
      if (isVerdict(stored)) note.diets[diet] = stored;
    }
  }

  return note;
}

export function parseNotes(raw: string | null): NoteMap {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {};

    const notes: NoteMap = {};
    for (const [code, value] of Object.entries(parsed as Record<string, unknown>)) {
      const note = parseNote(code, value);
      if (note) notes[code] = note;
    }
    return notes;
  } catch {
    return {};
  }
}
