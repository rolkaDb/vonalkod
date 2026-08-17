/** EAN-8 / UPC-A / EAN-13 / ITF-14 – ezek a bolti hosszak. */
const VALID_LENGTHS = [8, 12, 13, 14];

export function isDigits(code: string): boolean {
  return /^\d+$/.test(code);
}

export function hasValidLength(code: string): boolean {
  return VALID_LENGTHS.includes(code.length);
}

/**
 * GS1 mod-10 ellenőrzőösszeg. Az utolsó számjegy az ellenőrző: a többit jobbról
 * balra felváltva 3-mal és 1-gyel súlyozzuk, és a tízesre kiegészítő szám az
 * ellenőrző jegy. Ez a szabvány mind a négy fenti hosszra ugyanígy működik.
 *
 * Kézi beírásnál ez ér a legtöbbet: egyetlen elgépelt számjegyet szinte mindig
 * kiszúr, így nem küldünk értelmetlen lekérdezést, és nem hisszük tévesen azt,
 * hogy a termék nincs az adatbázisban.
 */
export function hasValidChecksum(code: string): boolean {
  if (!isDigits(code) || !hasValidLength(code)) return false;

  const digits = code.split('').map(Number);
  const check = digits[digits.length - 1];
  const body = digits.slice(0, -1);

  let sum = 0;
  // Jobbról indulva az első súly mindig 3.
  for (let i = body.length - 1, weight = 3; i >= 0; i--, weight = weight === 3 ? 1 : 3) {
    sum += body[i] * weight;
  }

  return (10 - (sum % 10)) % 10 === check;
}

export type BarcodeProblem = 'empty' | 'not_digits' | 'bad_length' | 'bad_checksum' | null;

/** Az űrlap ebből tudja, mit írjon ki – és hogy engedje-e a keresést. */
export function inspectBarcode(raw: string): BarcodeProblem {
  const code = raw.trim();
  if (code.length === 0) return 'empty';
  if (!isDigits(code)) return 'not_digits';
  if (!hasValidLength(code)) return 'bad_length';
  if (!hasValidChecksum(code)) return 'bad_checksum';
  return null;
}
