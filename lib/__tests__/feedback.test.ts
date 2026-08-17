import { FEEDBACK } from '../feedback';
import { Verdict } from '../types';

const ALL: Verdict[] = ['safe', 'caution', 'unknown', 'unsafe'];

describe('FEEDBACK', () => {
  it('minden ítélethez tartozik terv', () => {
    for (const verdict of ALL) {
      expect(FEEDBACK[verdict]).toBeDefined();
      expect(FEEDBACK[verdict].spoken.length).toBeGreaterThan(0);
    }
  });

  it('a tiltás a leghangsúlyosabb', () => {
    // A legfontosabb üzenetet kell a legerősebben érezni.
    expect(FEEDBACK.unsafe.extraImpacts).toBeGreaterThan(FEEDBACK.caution.extraImpacts);
    expect(FEEDBACK.unsafe.extraImpacts).toBeGreaterThan(FEEDBACK.safe.extraImpacts);
  });

  it('a mentes ítélet egyetlen, rövid visszajelzés', () => {
    expect(FEEDBACK.safe.extraImpacts).toBe(0);
  });

  it('az adathiány nem érződhet megnyugtatónak', () => {
    // Nincs „siker" értesítés-rezgése, hogy ne lehessen összekeverni a zölddel.
    expect(FEEDBACK.unknown.notification).toBeNull();
    expect(FEEDBACK.unknown.extraImpacts).toBeGreaterThan(0);
  });

  it('mind a négy kimondott szöveg különbözik', () => {
    const spoken = ALL.map((verdict) => FEEDBACK[verdict].spoken);
    expect(new Set(spoken).size).toBe(ALL.length);
  });
});
