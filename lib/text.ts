/**
 * Az OpenFoodFacts adatai hol ékezetesek, hol nem, és a kis/nagybetű is vegyes.
 * Ezért mindent ékezet nélküli kisbetűs alakra hozunk az összehasonlítás előtt.
 *
 * Szándékosan kézi térkép, nem `String.prototype.normalize('NFD')`:
 * a Hermes motor Unicode-normalizálása nem megbízható minden RN-verzióban.
 *
 * **Minden csere pontosan egy karakter egy karakterre.** Ez nem szépészeti
 * kérdés: a találatokat ki akarjuk emelni az EREDETI szövegben, ehhez pedig a
 * normalizált alak karakterindexeinek egyeznie kell az eredetiével. Ezért lesz
 * az „ß"-ből is „s" és nem „ss".
 */
const ACCENTS: Record<string, string> = {
  á: 'a', â: 'a', à: 'a', ä: 'a', å: 'a', ã: 'a', ą: 'a', ă: 'a', ā: 'a', ǎ: 'a',
  é: 'e', ê: 'e', è: 'e', ë: 'e', ę: 'e', ě: 'e', ē: 'e', ė: 'e',
  í: 'i', î: 'i', ì: 'i', ï: 'i', ī: 'i', į: 'i',
  ó: 'o', ö: 'o', ő: 'o', ô: 'o', ò: 'o', õ: 'o', ø: 'o', ō: 'o',
  ú: 'u', ü: 'u', ű: 'u', û: 'u', ù: 'u', ů: 'u', ū: 'u', ų: 'u',
  ç: 'c', ñ: 'n', ý: 'y', ß: 's',
  // Közép- és kelet-európai betűk. Ezek nélkül a lengyel „pszenica" és a cseh
  // „mléko" fel sem ismerhető – márpedig a magyar polcon sok ilyen termék van.
  š: 's', ś: 's', ș: 's', ş: 's',
  ž: 'z', ź: 'z', ż: 'z',
  č: 'c', ć: 'c', ĉ: 'c',
  ř: 'r', ŕ: 'r',
  ť: 't', ț: 't', ţ: 't',
  ď: 'd', đ: 'd', ð: 'd',
  ň: 'n', ń: 'n',
  ľ: 'l', ĺ: 'l', ł: 'l',
  ğ: 'g', ĝ: 'g',
};

export function normalize(input: string): string {
  let out = '';
  for (const ch of input.toLowerCase()) {
    out += ACCENTS[ch] ?? ch;
  }
  return out;
}

export type Token = {
  /** Normalizált alak – ezen fut az összehasonlítás. */
  text: string;
  /** Kezdő- és záróindex az EREDETI szövegben, a kiemeléshez. */
  start: number;
  end: number;
};

/**
 * Szavakra bontás pozícióval együtt. Normalizálás után minden betű a-z, így
 * minden más (szóköz, vessző, zárójel, százalékjel, kötőjel) elválasztó.
 *
 * A kötőjel is elválasztó: a „gluten-free" így két szó lesz, amit a
 * tagadás-figyelő (`diet.ts`) a rákövetkező „free" szó alapján kiszűr.
 */
export function tokenizeWithOffsets(input: string): Token[] {
  const normalized = normalize(input);
  const tokens: Token[] = [];

  let start = -1;
  for (let i = 0; i <= normalized.length; i++) {
    const ch = i < normalized.length ? normalized[i] : '';
    const isWordChar = (ch >= 'a' && ch <= 'z') || (ch >= '0' && ch <= '9');

    if (isWordChar && start === -1) start = i;
    else if (!isWordChar && start !== -1) {
      tokens.push({ text: normalized.slice(start, i), start, end: i });
      start = -1;
    }
  }

  return tokens;
}

export function tokenize(input: string): string[] {
  return tokenizeWithOffsets(input).map((token) => token.text);
}
