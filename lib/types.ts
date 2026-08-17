/**
 * Az EU-ban kötelezően jelölt 14 allergén, plusz két étrendi preferencia.
 *
 * A `lactose` kulcs szándékosan maradt a régi nevén (nem `milk`): az első
 * verzió ezen a néven mentette a profilt és a saját jegyzeteket, átnevezéssel
 * némán elveszne a felhasználó beállítása.
 */
export type DietKey =
  | 'gluten'
  | 'lactose'
  | 'egg'
  | 'peanut'
  | 'nuts'
  | 'soy'
  | 'fish'
  | 'crustacean'
  | 'mollusc'
  | 'celery'
  | 'mustard'
  | 'sesame'
  | 'sulphite'
  | 'lupin'
  | 'vegan'
  | 'vegetarian';

/** A megjelenítés sorrendje is ez – a gyakoribbak elöl. */
export const DIET_KEYS: DietKey[] = [
  'gluten',
  'lactose',
  'egg',
  'peanut',
  'nuts',
  'soy',
  'sesame',
  'fish',
  'crustacean',
  'mollusc',
  'celery',
  'mustard',
  'sulphite',
  'lupin',
  'vegan',
  'vegetarian',
];

export type DietSwitches = Record<DietKey, boolean>;

export type Profile = {
  /** Amit a felhasználó figyeltet. */
  diets: DietSwitches;
  /**
   * Szigorú mód: a „nyomokban tartalmazhatja" is tiltásnak számít.
   * Cöliákiásoknál és súlyos allergiánál a nyomnyi mennyiség is kizáró.
   */
  strict: boolean;
  /** Hangos visszajelzés – alapból ki, mert boltban nem mindenki akarja. */
  speak: boolean;
};

/**
 * Csak a glutén és a tej van alapból bekapcsolva. Mind a 16 bekapcsolva
 * használhatatlan zajt adna, és az első verzió felhasználói is ezt a kettőt
 * várják – az ő mentett profiljuk így változatlan marad.
 */
export const DEFAULT_DIETS: DietSwitches = {
  gluten: true,
  lactose: true,
  egg: false,
  peanut: false,
  nuts: false,
  soy: false,
  fish: false,
  crustacean: false,
  mollusc: false,
  celery: false,
  mustard: false,
  sesame: false,
  sulphite: false,
  lupin: false,
  vegan: false,
  vegetarian: false,
};

export const DEFAULT_PROFILE: Profile = {
  diets: DEFAULT_DIETS,
  strict: false,
  speak: false,
};

/**
 * `safe`    – az adatok szerint nincs benne
 * `caution` – nyomokban tartalmazhatja, vagy bizonytalan összetevő (pl. zab)
 * `unknown` – nincs elég adat az OpenFoodFactsben, NEM azonos a „mentes"-sel
 * `unsafe`  – tartalmazza
 */
export type Verdict = 'safe' | 'caution' | 'unknown' | 'unsafe';

/**
 * Honnan származik az ítélet. Ezt végig kell vezetni a felületig: adat és saját
 * feltételezés között egy pillantásból látszania kell a különbségnek, különben
 * hónapokkal később a felhasználó a saját tippjét nézi tényadatnak.
 *
 * A `translation` ugyanezért külön érték: gépi fordításon alapuló ítélet
 * továbbra is az adatbázis szövegéből származik, de egy fordítási hiba
 * beleeshet — a felhasználónak látnia kell, hogy nem az eredetit olvastuk.
 */
export type FindingSource = 'data' | 'note' | 'translation';

/** Egy találat helye az EREDETI összetevő-szövegben, a kiemeléshez. */
export type Evidence = {
  text: string;
  start: number;
  end: number;
};

export type Finding = {
  diet: DietKey;
  verdict: Verdict;
  /** Rövid magyar indoklás, ez jelenik meg a kártyán. */
  reason: string;
  /** A konkrét találatok (összetevő-szavak vagy OFF-címkék), amikre az ítélet épül. */
  evidence: string[];
  /** Csak összetevő-szövegből származó találatoknál van kitöltve. */
  spans: Evidence[];
  source: FindingSource;
};

/**
 * Gépi fordítás az összetevő-szövegről, ha az eredetit nem értjük.
 *
 * A `traces` szándékosan külön mező: a „nyomokban tartalmazhat" rész más
 * ítéletet érdemel (`caution`), mint amit a termék ténylegesen tartalmaz
 * (`unsafe`). Ha egyben hagynánk, minden nyomnyi allergén tiltássá válna.
 */
export type Translation = {
  /** Amit a termék ténylegesen tartalmaz, magyarra fordítva. */
  text: string;
  /** A „nyomokban tartalmazhat" rész magyarul, ha volt ilyen. */
  traces: string | null;
  /** Melyik nyelvről fordítottunk – `null`, ha az adatbázis sem jelölte. */
  fromLang: string | null;
  at: string;
};

export type Product = {
  code: string;
  name: string | null;
  brand: string | null;
  imageUrl: string | null;
  quantity: string | null;
  /** OpenFoodFacts `allergens_tags`, pl. `en:gluten` */
  allergenTags: string[];
  /** OpenFoodFacts `traces_tags` – a „nyomokban tartalmazhat" rész */
  traceTags: string[];
  /** OpenFoodFacts `labels_tags`, pl. `en:gluten-free` */
  labelTags: string[];
  /** OpenFoodFacts `ingredients_analysis_tags`, pl. `en:non-vegan` */
  analysisTags: string[];
  ingredientsText: string | null;
  /**
   * Melyik nyelven van az összetevő-szöveg, amit ténylegesen használunk.
   * Ha ezt a nyelvet a szótár nem ismeri, nem mondhatjuk, hogy „mentes" –
   * a hallgatásunk ilyenkor nem bizonyíték, csak értetlenség.
   */
  ingredientsLang: string | null;
  /**
   * Gépi fordítás, ha az eredeti nyelvet nem értjük. `null`, amíg nem kértünk
   * fordítást, vagy ha nem sikerült – ilyenkor marad a mai `unknown` ítélet.
   */
  translation: Translation | null;
};
