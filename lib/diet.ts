import { DIET_LABEL, KEYWORDS, KeywordSet } from './keywords';
import { ProductNote } from './notes';
import { normalize, tokenizeWithOffsets } from './text';
import {
  DIET_KEYS,
  DietKey,
  Evidence,
  Finding,
  Product,
  Profile,
  Verdict,
} from './types';

/** Minél nagyobb, annál rosszabb. Az `unknown` szándékosan a `caution` fölött van:
 *  a „nem tudjuk" érzékeny étrendnél veszélyesebb, mint a jelölt nyomnyi mennyiség. */
const RANK: Record<Verdict, number> = { safe: 0, caution: 1, unknown: 2, unsafe: 3 };

export function worse(a: Verdict, b: Verdict): Verdict {
  return RANK[a] >= RANK[b] ? a : b;
}

type Hit = { word: string; keyword: string; certain: boolean; start: number; end: number };

type PrefixMatch = { keyword: string; kind: 'source' | 'uncertain' | 'exception' };

/**
 * A leghosszabb illeszkedő előtagot keresi. A kivételeket regisztráljuk először,
 * így azonos hossznál a kivétel nyer (biztonságos irányba nem tévedhetünk el:
 * azonos hosszú kulcsszó és kivétel csak ugyanaz a szó lehetne).
 */
function longestPrefix(word: string, set: KeywordSet): PrefixMatch | null {
  let best: PrefixMatch | null = null;
  const consider = (list: string[], kind: PrefixMatch['kind']) => {
    for (const raw of list) {
      const keyword = normalize(raw);
      if (!word.startsWith(keyword)) continue;
      if (best === null || keyword.length > best.keyword.length) {
        best = { keyword, kind };
      }
    }
  };
  consider(set.exceptions, 'exception');
  consider(set.uncertain, 'uncertain');
  consider(set.sources, 'source');
  return best;
}

/** Tagadó szó a kulcsszó UTÁN: „glutén mentes", „gluten free", „glutén nélkül". */
const NEGATION_AFTER = new Set(['mentes', 'free', 'nelkul']);
/** Tagadó szó a kulcsszó ELŐTT: „sans gluten", „ohne Gluten", „non-dairy". */
const NEGATION_BEFORE = new Set(['sans', 'ohne', 'non']);
/** Tagadó végződés egybeírva: „gluténmentes", „lactosefree", „glutenfrei". */
const NEGATION_SUFFIX = ['mentes', 'free', 'frei'];

/**
 * Végigmegy az összetevő-szavakon és összegyűjti a találatokat, az EREDETI
 * szövegbeli pozíciójukkal együtt – hogy a felületen kiemelhessük őket.
 *
 * A tagadás-felismerés nem szépítés, hanem biztonsági kérdés: nélküle a
 * „gluténmentes" és a „sans gluten" a saját kulcsszavára akadna fel, és épp
 * az ellenkezőjét állítanánk annak, ami a csomagoláson van.
 */
export function findHits(ingredientsText: string, set: KeywordSet): Hit[] {
  const tokens = tokenizeWithOffsets(ingredientsText);
  const hits: Hit[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const word = tokens[i].text;
    if (NEGATION_SUFFIX.some((suffix) => word.endsWith(suffix))) continue;

    const previous = tokens[i - 1]?.text;
    if (previous !== undefined && NEGATION_BEFORE.has(previous)) continue;

    const next = tokens[i + 1]?.text;
    if (next !== undefined && NEGATION_AFTER.has(next)) continue;

    // A kifejezés-kivételt MINDKÉT irányban nézni kell: a „cocoa butter"-nél a
    // kulcsszó áll hátul, a „noix de coco"-nál viszont elöl. Csak visszafelé
    // figyelve az utóbbi dióként akadna fenn.
    const forward = tokens
      .slice(i, i + 3)
      .map((token) => token.text)
      .join(' ');
    const backward = previous !== undefined ? `${previous} ${word}` : null;

    const excluded = set.phraseExceptions.some((exception) => {
      const phrase = normalize(exception);
      return forward.startsWith(phrase) || (backward !== null && backward.startsWith(phrase));
    });
    if (excluded) continue;

    const match = longestPrefix(word, set);
    if (match?.kind === 'exception') continue;

    if (match !== null) {
      hits.push({
        word,
        keyword: match.keyword,
        certain: match.kind === 'source',
        start: tokens[i].start,
        end: tokens[i].end,
      });
      continue;
    }

    // Az előtag nem talált: megnézzük azt a szűk listát, ahol a kulcsszó a szó
    // belsejében is számít („tyúktojás", „Magermilchpulver"). A kivételeket már
    // fentebb kiszűrtük, így a „kókuszdió" és a „Buchweizen" nem jut idáig.
    const infix = set.infixes.find((raw) => word.includes(normalize(raw)));
    if (infix !== undefined) {
      hits.push({
        word,
        keyword: normalize(infix),
        certain: true,
        start: tokens[i].start,
        end: tokens[i].end,
      });
    }
  }

  return hits;
}

/**
 * Amely nyelveken a szótár tényleg ért. A listát mérés alapján bővítettük:
 * a magyar polcon lévő termékek jelentős részénél az OpenFoodFactsben nem
 * magyarul van az összetevő-szöveg.
 */
const COVERED_LANGUAGES = new Set([
  'hu', 'en', 'de', 'fr',
  'pl', 'ro', 'it', 'cs', 'sk', 'hr', 'sr', 'sl', 'bs', 'es',
]);

/** Cirill, görög, héber, arab írás – a tokenizálónk a-z-t vár, ezekből semmit nem lát. */
const NON_LATIN = /[Ͱ-ϿЀ-ӿ֐-׿؀-ۿ]/;

/** Meg tudjuk-e egyáltalán érteni ezt az összetevő-szöveget. */
export function canReadIngredients(product: Product): boolean {
  const text = product.ingredientsText ?? '';
  if (text.trim().length === 0) return false;
  if (NON_LATIN.test(text)) return false;

  // Jelöletlen nyelvnél megpróbáljuk: a szótár elég széles ahhoz, hogy a
  // jelöletlen szövegek zöme (angol, magyar) így is átmenjen.
  if (product.ingredientsLang === null) return true;

  return COVERED_LANGUAGES.has(product.ingredientsLang);
}

function spansOf(hits: Hit[]): Evidence[] {
  return hits.map((hit) => ({ text: hit.word, start: hit.start, end: hit.end }));
}

/** Ismétlődő szavakat egyszer soroljuk fel az indoklásban. */
function uniqueWords(hits: Hit[]): string[] {
  return Array.from(new Set(hits.map((hit) => hit.word)));
}

/**
 * A vegán/vegetáriánus besorolást az OpenFoodFacts már kiszámolja az
 * összetevőkből. Ezt szótárból újraszámolni sem megbízható, sem érdemes nem
 * lenne, ezért ezeknél kizárólag az adatbázis besorolására támaszkodunk.
 */
function evaluateFromAnalysis(product: Product, diet: DietKey): Finding {
  const analysis = KEYWORDS[diet].analysis;
  const label = DIET_LABEL[diet];
  const tags = product.analysisTags;
  const base = { diet, evidence: [] as string[], spans: [] as Evidence[], source: 'data' as const };

  if (!analysis) throw new Error(`A(z) ${diet} étrendhez nincs besorolási szabály.`);

  const hit = (list: string[]) => tags.find((tag) => list.includes(tag));

  const bad = hit(analysis.bad);
  if (bad) return { ...base, verdict: 'unsafe', reason: `Az adatbázis szerint nem ${label.free}.`, evidence: [bad] };

  const maybe = hit(analysis.maybe);
  if (maybe) {
    return {
      ...base,
      verdict: 'caution',
      reason: 'Van olyan összetevő, aminek az eredetét az adatbázis nem tudta eldönteni.',
      evidence: [maybe],
    };
  }

  const good = hit(analysis.good);
  if (good) return { ...base, verdict: 'safe', reason: `Az adatbázis szerint ${label.free}.`, evidence: [good] };

  return {
    ...base,
    verdict: 'unknown',
    reason: 'Ehhez a termékhez nincs besorolás az adatbázisban.',
  };
}

/** Egyetlen étrend kiértékelése egy termékre. */
export function evaluateDiet(product: Product, diet: DietKey): Finding {
  const set = KEYWORDS[diet];
  const label = DIET_LABEL[diet];
  const base = { diet, spans: [] as Evidence[], source: 'data' as const };

  // 1. Gyártói címke a legerősebb jel – felülír mindent, amit az összetevő-
  //    szövegből kiolvasnánk (pl. „laktózmentes tej").
  const freeLabel = product.labelTags.find((tag) => set.freeLabels.includes(tag));
  if (freeLabel) {
    return {
      ...base,
      verdict: 'safe',
      reason: `A gyártó ${label.free} termékként jelöli.`,
      evidence: [freeLabel],
    };
  }

  // 2. A vegán/vegetáriánus besorolás külön úton megy.
  if (set.analysis) return evaluateFromAnalysis(product, diet);

  const allergens = product.allergenTags.filter((tag) => set.allergenTags.includes(tag));
  const hits = findHits(product.ingredientsText ?? '', set);
  const certain = hits.filter((hit) => hit.certain);

  // 3. Deklarált allergén vagy egyértelmű összetevő.
  if (allergens.length > 0 || certain.length > 0) {
    return {
      ...base,
      verdict: 'unsafe',
      reason:
        certain.length > 0
          ? 'Az összetevők között szerepel.'
          : 'A gyártó allergénként tünteti fel.',
      evidence: certain.length > 0 ? uniqueWords(certain) : allergens,
      spans: spansOf(certain),
    };
  }

  // 4. Nyomokban tartalmazhatja, vagy bizonytalan összetevő (zab, maláta).
  const traces = product.traceTags.filter((tag) => set.allergenTags.includes(tag));
  const uncertain = hits.filter((hit) => !hit.certain);
  if (traces.length > 0 || uncertain.length > 0) {
    return {
      ...base,
      verdict: 'caution',
      reason:
        traces.length > 0
          ? 'Nyomokban tartalmazhatja.'
          : 'Bizonytalan összetevő – érdemes a csomagolást is elolvasni.',
      evidence: uncertain.length > 0 ? uniqueWords(uncertain) : traces,
      spans: spansOf(uncertain),
    };
  }

  // 5. Nincs miből dolgozni. Ez NEM azonos a „mentes"-sel.
  const hasIngredients = (product.ingredientsText ?? '').trim().length > 0;
  if (!hasIngredients && product.allergenTags.length === 0) {
    return {
      ...base,
      verdict: 'unknown',
      reason: 'Ehhez a termékhez nincs összetevő-adat az adatbázisban.',
      evidence: [],
    };
  }

  // 6. Van szöveg, de nem értjük a nyelvét – és nincs allergén-címke sem, ami
  //    kisegítene. A hallgatásunk ilyenkor nem bizonyíték, csak értetlenség,
  //    ezért nem mondhatjuk rá, hogy mentes.
  if (!canReadIngredients(product) && product.allergenTags.length === 0) {
    return {
      ...base,
      verdict: 'unknown',
      reason: 'Az összetevők olyan nyelven vannak, amit nem tudunk megbízhatóan ellenőrizni.',
      evidence: [],
    };
  }

  // 7. Van adat, értjük is, és nem találtunk semmit.
  return {
    ...base,
    verdict: 'safe',
    reason: `Az összetevők között nem találtunk ${label.source}.`,
    evidence: [],
  };
}

export function activeDiets(profile: Profile): DietKey[] {
  return DIET_KEYS.filter((diet) => profile.diets[diet]);
}

/**
 * Szigorú mód: a „nyomokban tartalmazhatja" is tiltás.
 *
 * Cöliákiásnál és súlyos allergiánál a nyomnyi mennyiség is kizáró, nekik a
 * sárga jelzés félrevezető. Az `unknown` szándékosan **nem** válik tiltássá:
 * az adathiány továbbra is adathiány, nem tény.
 */
export function applyStrict(findings: Finding[], strict: boolean): Finding[] {
  if (!strict) return findings;

  return findings.map((finding) => {
    if (finding.verdict !== 'caution') return finding;
    return {
      ...finding,
      verdict: 'unsafe',
      reason: `${finding.reason} A szigorú mód ezt is tiltásnak veszi.`,
    };
  });
}

/** A profilban bekapcsolt étrendek kiértékelése, sorrendben. */
export function evaluate(product: Product, profile: Profile): Finding[] {
  const findings = activeDiets(profile).map((diet) => evaluateDiet(product, diet));
  return applyStrict(findings, profile.strict);
}

/**
 * A saját jegyzet felülír mindent, amit az adatbázisból kiolvastunk.
 *
 * Ez szándékos: ha a felhasználó a bolti polc előtt elolvasta a csomagolást,
 * az frissebb és megbízhatóbb forrás, mint egy közösségi adatbázis rekordja.
 * Amelyik étrendről nem nyilatkozott (`unset`), ott marad az eredeti ítélet.
 */
export function applyNote(findings: Finding[], note: ProductNote | null): Finding[] {
  if (!note) return findings;

  return findings.map((finding) => {
    const own = note.diets[finding.diet];
    if (own === undefined || own === 'unset') return finding;
    return {
      diet: finding.diet,
      verdict: own,
      reason:
        own === 'safe'
          ? 'A saját jegyzeted szerint mentes.'
          : 'A saját jegyzeted szerint tartalmazza.',
      evidence: [],
      spans: [],
      source: 'note',
    };
  });
}

/**
 * A kiértékeléshez ténylegesen használt termék: az adatbázis rekordja
 * kiegészítve azzal, amit a felhasználó a csomagolásról beírt.
 *
 * A két szöveget **összefűzzük, nem választunk köztük**: így egyik forrásban
 * talált allergén sem veszhet el. A nyelvet magyarra állítjuk, mert a magyar
 * polcon a csomagoláson törvény szerint magyarul van az összetevőlista – épp
 * ezért ér többet ez a szöveg, mint az adatbázis vegyes nyelvű rekordja.
 */
export function effectiveProduct(
  product: Product | null,
  note: ProductNote | null,
): Product | null {
  const own = (note?.ingredients ?? '').trim();
  if (product === null && own.length === 0) return null;

  const base: Product = product ?? {
    code: note?.code ?? '',
    name: null,
    brand: null,
    imageUrl: null,
    quantity: null,
    allergenTags: [],
    traceTags: [],
    labelTags: [],
    analysisTags: [],
    ingredientsText: null,
    ingredientsLang: null,
  };

  if (own.length === 0) return base;

  const fromDatabase = (base.ingredientsText ?? '').trim();
  return {
    ...base,
    ingredientsText: fromDatabase.length > 0 ? `${fromDatabase}\n\n${own}` : own,
    ingredientsLang: 'hu',
  };
}

/**
 * A termékoldal teljes kiértékelése. A `product` akkor `null`, ha a vonalkód
 * nincs az adatbázisban – ilyenkor a beírt összetevők vagy a saját jegyzet
 * önmagában is meg tud szólalni.
 */
export function evaluateWithNote(
  product: Product | null,
  note: ProductNote | null,
  profile: Profile,
): Finding[] {
  const effective = effectiveProduct(product, note);

  // Az `evaluate` már alkalmazta a szigorú módot; a jegyzet ezután írja felül,
  // mert a felhasználó saját megállapítása mindennél erősebb.
  const base: Finding[] = effective
    ? evaluate(effective, profile)
    : activeDiets(profile).map((diet) => ({
        diet,
        verdict: 'unknown' as const,
        reason: 'Ez a termék nincs az adatbázisban.',
        evidence: [],
        spans: [],
        source: 'data' as const,
      }));

  return applyNote(base, note);
}

/** Van-e olyan sor, ami a felhasználó saját jegyzetéből származik, nem adatból. */
export function hasOwnFinding(findings: Finding[]): boolean {
  return findings.some((finding) => finding.source === 'note');
}

/** A kártya tetején megjelenő összesített ítélet: a legrosszabb egyedi eredmény. */
export function overallVerdict(findings: Finding[]): Verdict {
  if (findings.length === 0) return 'unknown';
  return findings.reduce<Verdict>((acc, finding) => worse(acc, finding.verdict), 'safe');
}

/** Étrendenkénti ítélet – ezt tesszük el az előzményekbe, hogy szűrni lehessen. */
export function verdictMap(findings: Finding[]): Partial<Record<DietKey, Verdict>> {
  const map: Partial<Record<DietKey, Verdict>> = {};
  for (const finding of findings) map[finding.diet] = finding.verdict;
  return map;
}
