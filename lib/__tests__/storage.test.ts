import { parseProfile } from '../storage';
import { DEFAULT_PROFILE } from '../types';

describe('parseProfile', () => {
  it('üres mentésnél az alapértelmezést adja', () => {
    expect(parseProfile(null)).toEqual(DEFAULT_PROFILE);
  });

  it('alapból csak a glutén és a tej van bekapcsolva', () => {
    // Mind a 16 szűrő bekapcsolva használhatatlan zajt adna.
    const { diets } = parseProfile(null);
    expect(diets.gluten).toBe(true);
    expect(diets.lactose).toBe(true);
    expect(diets.egg).toBe(false);
    expect(diets.vegan).toBe(false);
  });

  it('a szigorú mód és a hang alapból ki van kapcsolva', () => {
    const profile = parseProfile(null);
    expect(profile.strict).toBe(false);
    expect(profile.speak).toBe(false);
  });

  it('sérült JSON-nál nem dob hibát', () => {
    expect(parseProfile('{ ez nem json')).toEqual(DEFAULT_PROFILE);
  });

  describe('a mostani alak', () => {
    it('visszaolvassa a kapcsolókat és a beállításokat', () => {
      const profile = parseProfile('{"diets":{"gluten":false,"egg":true},"strict":true}');
      expect(profile.diets.gluten).toBe(false);
      expect(profile.diets.egg).toBe(true);
      expect(profile.diets.lactose).toBe(true); // érintetlen, marad az alapérték
      expect(profile.strict).toBe(true);
      expect(profile.speak).toBe(false);
    });

    it('a rossz típusú mezőt az alapértelmezéssel pótolja', () => {
      const profile = parseProfile('{"diets":{"gluten":"igen"},"strict":"persze"}');
      expect(profile.diets.gluten).toBe(true);
      expect(profile.strict).toBe(false);
    });

    it('az ismeretlen kulcsokat eldobja', () => {
      const profile = parseProfile('{"diets":{"gluten":false,"mogyoro":true}}');
      expect(profile.diets).toEqual({ ...DEFAULT_PROFILE.diets, gluten: false });
    });
  });

  describe('a régi, lapos alak', () => {
    it('némán átkerül az új szerkezetbe', () => {
      // Az első verziók a kapcsolókat közvetlenül mentették, `diets` burok nélkül.
      const profile = parseProfile('{"gluten":true,"lactose":false}');
      expect(profile.diets.gluten).toBe(true);
      expect(profile.diets.lactose).toBe(false);
      expect(profile.strict).toBe(false);
    });

    it('a hiányzó új étrendeket kikapcsolva veszi fel', () => {
      const profile = parseProfile('{"gluten":true,"lactose":true}');
      expect(profile.diets.sesame).toBe(false);
      expect(profile.diets.vegan).toBe(false);
    });
  });
});
