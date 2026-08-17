import { canReadIngredients } from './diet';
import { Product, Translation } from './types';

/**
 * Az n8n workflow végpontja. Az `EXPO_PUBLIC_` előtagú változók befordulnak a
 * kliensbe – ez nem titok, csak egy cím. Ha nincs beállítva, a fordítás
 * egyszerűen kimarad, és az app ugyanúgy működik, mint korábban.
 */
const ENDPOINT = process.env.EXPO_PUBLIC_N8N_URL ?? '';

/** Rövidebb, mint az OCR-é: ez csak egy szöveg, és a bolt közepén állunk. */
const TIMEOUT_MS = 15_000;

export type TranslateResult =
  | { status: 'ok'; translation: Translation }
  /** Nincs mit fordítani, vagy értjük az eredetit – nem is hívtuk meg. */
  | { status: 'skipped' }
  /** Hálózat, kvóta, formátum – bármi. Marad a mai `unknown` ítélet. */
  | { status: 'failed' };

/**
 * Csak akkor fordítunk, ha van szöveg, de a szótárunk nem érti a nyelvét.
 *
 * Ez szándékosan szűk feltétel: pont azt az esetet fedi le, ahol ma `unknown`
 * ítéletet adnánk. Egy átlagos bevásárlás alatt így jó eséllyel egyszer sem
 * hívjuk meg a szolgáltatást – a napi ingyenes kvóta bőven elég marad.
 */
export function needsTranslation(product: Product): boolean {
  if (ENDPOINT.length === 0) return false;
  if (product.translation !== null) return false;
  if ((product.ingredientsText ?? '').trim().length === 0) return false;
  return !canReadIngredients(product);
}

export async function translateIngredients(product: Product): Promise<TranslateResult> {
  if (!needsTranslation(product)) return { status: 'skipped' };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        code: product.code,
        lang: product.ingredientsLang,
        ingredientsText: product.ingredientsText,
      }),
      signal: controller.signal,
    });

    if (!response.ok) return { status: 'failed' };

    const body = (await response.json()) as Record<string, unknown>;

    // A szolgáltatás akkor is 200-at ad, ha ő maga nem boldogult (nem érthető
    // szöveg, rossz formátum). Az `ok` mezőt kell néznünk, nem a HTTP kódot.
    if (body.ok !== true) return { status: 'failed' };

    const text = typeof body.translatedText === 'string' ? body.translatedText.trim() : '';
    if (text.length === 0) return { status: 'failed' };

    const traces =
      typeof body.translatedTraces === 'string' ? body.translatedTraces.trim() : '';

    return {
      status: 'ok',
      translation: {
        text,
        traces: traces.length > 0 ? traces : null,
        fromLang: product.ingredientsLang,
        at: typeof body.translatedAt === 'string' ? body.translatedAt : new Date().toISOString(),
      },
    };
  } catch {
    // Időtúllépés vagy hálózati hiba. Nem szólunk külön: fordítás nélkül az app
    // ugyanazt az `unknown` ítéletet adja, mint eddig – ez biztonságos irány.
    return { status: 'failed' };
  } finally {
    clearTimeout(timer);
  }
}
