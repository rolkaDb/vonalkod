/**
 * Fénykép → szöveg.
 *
 * Szándékosan egyetlen függvény mögé rejtve, mert **két megvalósítása lesz**:
 *
 *  - most: felhős felismerés egyszerű HTTP-hívással. Ez fut Expo Go-ban is,
 *    tehát build és fejlesztői fiók nélkül tesztelhető.
 *  - később: eszközön futó felismerés (ML Kit). Offline, semmi nem megy ki a
 *    telefonról, viszont natív modul – saját buildet igényel.
 *
 * A hívó oldal (a képernyő, a szerkeszthető szöveg, az ítélet) mindkettővel
 * változatlan marad; csak ez a fájl cserélődik.
 */

const ENDPOINT = 'https://api.ocr.space/parse/image';

/** Az `EXPO_PUBLIC_` előtagú változók befordulnak a kliensbe – ez nem titok. */
const API_KEY = process.env.EXPO_PUBLIC_OCR_API_KEY ?? '';

/** Gyenge térerőn a fotó feltöltése sokáig tarthat, de nem a végtelenségig. */
const TIMEOUT_MS = 45_000;

export type OcrResult =
  | { status: 'ok'; text: string }
  | { status: 'empty' }
  | { status: 'unavailable' }
  | { status: 'error'; message: string };

export function isOcrAvailable(): boolean {
  return API_KEY.length > 0;
}

type OcrSpaceResponse = {
  IsErroredOnProcessing?: boolean;
  ErrorMessage?: string | string[];
  ParsedResults?: { ParsedText?: string }[];
};

function errorMessageOf(body: OcrSpaceResponse): string {
  const raw = body.ErrorMessage;
  if (Array.isArray(raw)) return raw.join(' ');
  if (typeof raw === 'string' && raw.length > 0) return raw;
  return 'A szövegfelismerés nem sikerült.';
}

/**
 * A felismert sortöréseket szóközre cseréljük: az összetevőlista a csomagoláson
 * több sorba tördelve áll, de egyetlen felsorolás – a szótárnak így könnyebb,
 * és a kiemelés is olvashatóbb marad.
 */
function tidy(text: string): string {
  return text
    .replace(/\r/g, '')
    .replace(/\s*\n\s*/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export async function recognizeText(imageUri: string): Promise<OcrResult> {
  if (!isOcrAvailable()) return { status: 'unavailable' };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const form = new FormData();
    // React Nativeben a fájlt ebben az alakban várja a FormData.
    form.append('file', {
      uri: imageUri,
      name: 'label.jpg',
      type: 'image/jpeg',
    } as unknown as Blob);
    form.append('language', 'hun');
    form.append('isOverlayRequired', 'false');
    form.append('detectOrientation', 'true');
    form.append('scale', 'true');

    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { apikey: API_KEY },
      body: form,
      signal: controller.signal,
    });

    if (!response.ok) {
      return { status: 'error', message: `A szolgáltatás nem válaszolt (${response.status}).` };
    }

    const body = (await response.json()) as OcrSpaceResponse;
    if (body.IsErroredOnProcessing) return { status: 'error', message: errorMessageOf(body) };

    const text = tidy((body.ParsedResults ?? []).map((part) => part.ParsedText ?? '').join(' '));
    return text.length === 0 ? { status: 'empty' } : { status: 'ok', text };
  } catch (error) {
    const aborted = error instanceof Error && error.name === 'AbortError';
    return {
      status: 'error',
      message: aborted
        ? 'A felismerés túl sokáig tartott. Gyenge a térerő?'
        : 'Nem sikerült elérni a szövegfelismerőt.',
    };
  } finally {
    clearTimeout(timer);
  }
}
