import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';

import { Verdict } from './types';

/**
 * Mit érezzen és halljon a felhasználó az ítéletről.
 *
 * A cél, hogy a boltban **ránézés nélkül** is meg lehessen érteni az eredményt:
 * fél kézzel, kosárral a másikban senki nem akar a képernyőre bámulni.
 * A tiltás szándékosan kettős rezgés – a legfontosabb üzenet a leghangsúlyosabb.
 */
export type FeedbackPlan = {
  notification: Haptics.NotificationFeedbackType | null;
  /** Hány extra, erős lökés jöjjön a értesítés-rezgés után. */
  extraImpacts: number;
  /** Ez hangzik el, ha a hangos visszajelzés be van kapcsolva. */
  spoken: string;
};

export const FEEDBACK: Record<Verdict, FeedbackPlan> = {
  safe: {
    notification: Haptics.NotificationFeedbackType.Success,
    extraImpacts: 0,
    spoken: 'Mentes',
  },
  caution: {
    notification: Haptics.NotificationFeedbackType.Warning,
    extraImpacts: 0,
    spoken: 'Óvatosan',
  },
  unsafe: {
    notification: Haptics.NotificationFeedbackType.Error,
    extraImpacts: 2,
    spoken: 'Nem mentes',
  },
  unknown: {
    // Az adathiány nem hiba és nem is megnyugtató – ezért nincs értesítés-rezgés,
    // csak egy semleges koppanás, hogy ne lehessen összekeverni a zölddel.
    notification: null,
    extraImpacts: 1,
    spoken: 'Nincs elég adat',
  },
};

const IMPACT_GAP_MS = 130;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Lejátssza az ítélethez tartozó visszajelzést. A hiba szándékosan elnyelt:
 * egy néma emulátor vagy letiltott rezgés nem ok arra, hogy a képernyő elszálljon.
 */
export async function playFeedback(verdict: Verdict, speak: boolean): Promise<void> {
  const plan = FEEDBACK[verdict];

  try {
    if (plan.notification !== null) await Haptics.notificationAsync(plan.notification);

    for (let i = 0; i < plan.extraImpacts; i++) {
      await wait(IMPACT_GAP_MS);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
  } catch {
    // rezgés nem elérhető – nem baj
  }

  if (!speak) return;

  try {
    Speech.stop(); // gyors egymás utáni beolvasásnál ne torlódjanak fel
    Speech.speak(plan.spoken, { language: 'hu-HU' });
  } catch {
    // nincs magyar hang a készüléken – nem baj
  }
}
