import { hasValidLength, isDigits } from './barcode';
import { Product } from './types';

const ENDPOINT = 'https://world.openfoodfacts.org/api/v2/product';

/** Csak azt kérjük le, amit használunk – a teljes termékrekord több száz mező. */
const FIELDS = [
  'code',
  'product_name',
  'product_name_hu',
  'brands',
  'quantity',
  'image_front_small_url',
  'allergens_tags',
  'traces_tags',
  'labels_tags',
  // A vegán/vegetáriánus besorolást az OFF maga számolja ki az összetevőkből.
  'ingredients_analysis_tags',
  'ingredients_text',
  'ingredients_text_hu',
  // Az `ingredients_text` a termék fő nyelvén jön. Külföldi árunál előfordul,
  // hogy csak az angol nyelvi változatba vitték fel a szöveget.
  'ingredients_text_en',
  // A termék fő nyelve – ebből tudjuk, hogy értjük-e egyáltalán a szöveget.
  'lang',
].join(',');

/** Az OpenFoodFacts használati feltétele, hogy az app azonosítsa magát. */
const USER_AGENT = 'Mentes/1.0 (Expo; hobbi projekt)';

const TIMEOUT_MS = 12_000;

export type FetchResult =
  | { status: 'found'; product: Product }
  | { status: 'not_found' }
  | { status: 'error'; message: string };

/**
 * Csak számjegy, bolti hosszal. Az ellenőrzőösszeget itt **nem** követeljük meg:
 * a kamera úgyis csak érvényes kódot olvas be, és ritkán bár, de előfordul
 * szabálytalan kód is az adatbázisban. A kézi beírásnál viszont figyelmeztetünk
 * rá – lásd `lib/barcode.ts`.
 */
export function isPlausibleBarcode(code: string): boolean {
  return isDigits(code) && hasValidLength(code);
}

function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim().length > 0) return value.trim();
  }
  return null;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

/**
 * Melyik összetevő-szöveget használjuk, és milyen nyelven van.
 *
 * A nyelvet együtt kell kiolvasni a szöveggel: ha a magyar mező üres és az
 * általánosat vesszük, az a termék fő nyelvén van – ami lehet olyasmi, amit a
 * szótárunk nem ismer. Ezt a `diet.ts` használja, hogy ilyenkor ne mondjon
 * „mentes"-t.
 */
function pickIngredients(raw: Record<string, unknown>): {
  ingredientsText: string | null;
  ingredientsLang: string | null;
} {
  const hungarian = firstString(raw.ingredients_text_hu);
  if (hungarian) return { ingredientsText: hungarian, ingredientsLang: 'hu' };

  const main = firstString(raw.ingredients_text);
  if (main) return { ingredientsText: main, ingredientsLang: firstString(raw.lang) };

  const english = firstString(raw.ingredients_text_en);
  if (english) return { ingredientsText: english, ingredientsLang: 'en' };

  return { ingredientsText: null, ingredientsLang: null };
}

export function toProduct(code: string, raw: Record<string, unknown>): Product {
  return {
    code,
    // A magyar név gyakran hiányzik, ilyenkor az általános mező marad.
    name: firstString(raw.product_name_hu, raw.product_name),
    brand: firstString(raw.brands),
    imageUrl: firstString(raw.image_front_small_url),
    quantity: firstString(raw.quantity),
    allergenTags: stringArray(raw.allergens_tags),
    traceTags: stringArray(raw.traces_tags),
    labelTags: stringArray(raw.labels_tags),
    analysisTags: stringArray(raw.ingredients_analysis_tags),
    ...pickIngredients(raw),
  };
}

export async function fetchProduct(code: string): Promise<FetchResult> {
  if (!isPlausibleBarcode(code)) {
    return { status: 'error', message: 'Ez nem tűnik érvényes termék-vonalkódnak.' };
  }

  // Az AbortController azért kell, mert a fetch magától sosem jár le:
  // gyenge térerőn a bolt közepén a képernyő különben örökké töltene.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${ENDPOINT}/${code}.json?fields=${FIELDS}&lc=hu`, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      signal: controller.signal,
    });

    if (response.status === 404) return { status: 'not_found' };
    if (!response.ok) {
      return { status: 'error', message: `Az adatbázis nem válaszolt (${response.status}).` };
    }

    const body = (await response.json()) as { status?: number; product?: Record<string, unknown> };
    if (body.status !== 1 || !body.product) return { status: 'not_found' };

    return { status: 'found', product: toProduct(code, body.product) };
  } catch (error) {
    const aborted = error instanceof Error && error.name === 'AbortError';
    return {
      status: 'error',
      message: aborted
        ? 'Az adatbázis nem válaszolt időben. Van internet?'
        : 'Nem sikerült elérni az adatbázist. Ellenőrizd a kapcsolatot.',
    };
  } finally {
    clearTimeout(timer);
  }
}
