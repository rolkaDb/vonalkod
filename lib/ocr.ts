import { isCloudOcrAvailable, recognizeInCloud } from './ocr-cloud';
import { isDeviceOcrAvailable, recognizeOnDevice } from './ocr-device';

/**
 * Fénykép → szöveg, két motorral.
 *
 * A hívó oldal (a képernyő, a szerkeszthető szöveg, az ítélet) nem tudja és nem
 * is érdekli, melyik fut – egyedül a felhasználónak szóló szöveg különbözik,
 * mert a két motornak **más az adatvédelmi következménye**.
 */
export type OcrEngine = 'device' | 'cloud';

export type OcrResult =
  | { status: 'ok'; text: string; engine: OcrEngine }
  | { status: 'empty'; engine: OcrEngine }
  | { status: 'unavailable' }
  | { status: 'error'; message: string; engine: OcrEngine };

/**
 * Az eszközön futó motor **mindig előnyt élvez**: ingyenes, offline, és a kép
 * nem hagyja el a telefont. A felhős csak akkor jön, ha az nem érhető el –
 * jelenleg Expo Go alatt ez a helyzet.
 */
export function activeEngine(): OcrEngine | null {
  if (isDeviceOcrAvailable()) return 'device';
  if (isCloudOcrAvailable()) return 'cloud';
  return null;
}

export function isOcrAvailable(): boolean {
  return activeEngine() !== null;
}

/**
 * A felismert sortöréseket szóközre cseréljük: az összetevőlista a csomagoláson
 * több sorba tördelve áll, de egyetlen felsorolás – a szótárnak így könnyebb,
 * és a kiemelés is olvashatóbb marad.
 */
export function tidy(text: string): string {
  return text
    .replace(/\r/g, '')
    .replace(/\s*\n\s*/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export async function recognizeText(imageUri: string): Promise<OcrResult> {
  const engine = activeEngine();
  if (engine === null) return { status: 'unavailable' };

  const outcome =
    engine === 'device' ? await recognizeOnDevice(imageUri) : await recognizeInCloud(imageUri);

  if (!outcome.ok) return { status: 'error', message: outcome.message, engine };

  const text = tidy(outcome.text);
  return text.length === 0 ? { status: 'empty', engine } : { status: 'ok', text, engine };
}
