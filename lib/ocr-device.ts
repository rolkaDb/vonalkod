import TextRecognition from '@react-native-ml-kit/text-recognition';
import { NativeModules } from 'react-native';

/**
 * Eszközön futó szövegfelismerés (Google ML Kit).
 *
 * Ingyenes, offline, és a kép nem hagyja el a telefont – ez az éles megoldás.
 * Cserébe natív modul: **Expo Go-ban nem működik**, saját build kell hozzá.
 *
 * A csomag importálása Expo Go-ban is biztonságos: ha a natív oldal hiányzik,
 * a modul egy Proxyt ad vissza, ami csak az első *híváskor* dob hibát. Ezért a
 * natív modul meglétét kérdezzük, nem a JS-oldali objektumot – így sosem
 * nyúlunk a Proxyhoz.
 */
export function isDeviceOcrAvailable(): boolean {
  return NativeModules.TextRecognition != null;
}

export type DeviceOcrOutcome =
  | { ok: true; text: string }
  | { ok: false; message: string };

export async function recognizeOnDevice(imageUri: string): Promise<DeviceOcrOutcome> {
  try {
    const result = await TextRecognition.recognize(imageUri);
    return { ok: true, text: result?.text ?? '' };
  } catch {
    // Sérült kép, nem támogatott formátum, vagy hiányzó natív oldal.
    return { ok: false, message: 'A telefon szövegfelismerője nem tudta feldolgozni a képet.' };
  }
}
