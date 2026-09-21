/**
 * Felhős szövegfelismerés (ocr.space).
 *
 * Ez az **áthidaló** megoldás: sima HTTP-hívás, ezért Expo Go-ban is fut, tehát
 * build és fejlesztői fiók nélkül tesztelhető. Két ára van, és mindkettőt ki
 * kell mondani a felhasználónak: a kép elhagyja a telefont, a kulcs pedig
 * befordul a kliensbe. Éles kiadásban az eszközön futó felismerés váltja le.
 */

const ENDPOINT = 'https://api.ocr.space/parse/image';

/** Az `EXPO_PUBLIC_` előtagú változók befordulnak a kliensbe – ez nem titok. */
const API_KEY = process.env.EXPO_PUBLIC_OCR_API_KEY ?? '';

/** Gyenge térerőn a fotó feltöltése sokáig tarthat, de nem a végtelenségig. */
const TIMEOUT_MS = 45_000;

export function isCloudOcrAvailable(): boolean {
  return API_KEY.length > 0;
}

export type CloudOcrOutcome = { ok: true; text: string } | { ok: false; message: string };

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

export async function recognizeInCloud(imageUri: string): Promise<CloudOcrOutcome> {
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
      return { ok: false, message: `A szolgáltatás nem válaszolt (${response.status}).` };
    }

    const body = (await response.json()) as OcrSpaceResponse;
    if (body.IsErroredOnProcessing) return { ok: false, message: errorMessageOf(body) };

    return { ok: true, text: (body.ParsedResults ?? []).map((p) => p.ParsedText ?? '').join(' ') };
  } catch (error) {
    const aborted = error instanceof Error && error.name === 'AbortError';
    return {
      ok: false,
      message: aborted
        ? 'A felismerés túl sokáig tartott. Gyenge a térerő?'
        : 'Nem sikerült elérni a szövegfelismerőt.',
    };
  } finally {
    clearTimeout(timer);
  }
}
