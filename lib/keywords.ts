import { DietKey } from './types';

export type KeywordSet = {
  /**
   * Biztos forrás. **Előtag-egyezés**: az összetevő-szónak ezzel kell KEZDŐDNIE.
   * Ez a magyar toldalékolás és összetett szavak miatt van így – a „buza" előtag
   * elkapja a búzalisztet, búzadarát, búzakeményítőt és a „búzát" ragozott alakot is.
   *
   * Az előtag-logika ráadásul véd is: a „mogyoróvaj" NEM akad fenn a „vaj" szón,
   * és a „szerecsendió" sem a „dió" szón, mert nem azzal kezdődik.
   */
  sources: string[];
  /** Bizonytalan forrás – ebből `caution` lesz, nem `unsafe`. */
  uncertain: string[];
  /**
   * Kivételek. Ha a szó ezzel kezdődik, nem találat – akkor sem, ha egy rövidebb
   * `sources` elemre illene. A leghosszabb egyezés nyer, így a „tejsav" kivétel,
   * de a nála hosszabb „tejsavo" (tejsavó) továbbra is találat marad.
   */
  exceptions: string[];
  /**
   * Kétszavas kivételek („előző szó + kulcsszó"), szintén előtag-egyezéssel.
   *
   * Ezek angol szövegben elkerülhetetlenek: a magyar összetett szavakat az
   * előtag-logika magától megvédi („kakaóvaj" nem kezdődik a „vaj"-jal), az
   * angol viszont különírja őket, így a „cocoa butter" és a „coconut milk"
   * tejtermékként akadna fenn.
   */
  phraseExceptions: string[];
  /**
   * **Bárhol** a szóban egyező kulcsszavak, nem csak az elején.
   *
   * A magyar és a német összetett szavakban a lényeg gyakran hátul van:
   * „tyúk**tojás**", „tehén**tej**", „Mager**milch**pulver". Az előtag-logika
   * ezeket elvből nem látja – mérésen ez volt a maradék hibák fő oka.
   *
   * Szándékosan rövid a lista: minden ide felvett szó megnöveli a téves
   * riasztás esélyét, ezért csak akkor kerül ide valami, ha az összetett
   * alakja gyakori ÉS a kivételei felsorolhatók (lásd „kókuszdió", „Buchweizen").
   */
  infixes: string[];
  /** OpenFoodFacts `allergens_tags` / `traces_tags` értékek. */
  allergenTags: string[];
  /** OpenFoodFacts `labels_tags` értékek, amik gyártói mentességet igazolnak. */
  freeLabels: string[];
  /**
   * Ha ki van töltve, az ítélet **kizárólag** az OpenFoodFacts
   * `ingredients_analysis_tags` mezőjéből származik, kulcsszavazás nélkül.
   * A vegán/vegetáriánus besorolást az OFF már kiszámolja, ezt nem éri meg
   * és nem is lehet megbízhatóan újraszámolni szótárból.
   */
  analysis?: { bad: string[]; maybe: string[]; good: string[] };
};

/** Rövidítés: csak azt soroljuk fel, ami az adott allergénnél tényleg kell. */
function make(partial: Partial<KeywordSet> & Pick<KeywordSet, 'allergenTags'>): KeywordSet {
  return {
    sources: [],
    uncertain: [],
    exceptions: [],
    phraseExceptions: [],
    infixes: [],
    freeLabels: [],
    ...partial,
  };
}

const GLUTEN = make({
  sources: [
    // magyar
    'buza', 'tonkoly', 'rozs', 'arpa', 'durum', 'tritikale', 'kuszkusz',
    'bulgur', 'gluten', 'siker', 'graham', 'kamut', 'szemolina',
    'zsemlemorzsa', 'panirmorzsa', 'kekszmorzsa', 'szejtan',
    // angol / nemzetközi címkék
    'wheat', 'spelt', 'rye', 'barley', 'triticale', 'couscous', 'semolina',
    'farro', 'breadcrumb', 'seitan',
    // A magyar polcokon sok terméknél az OpenFoodFactsben francia vagy német
    // az összetevő-szöveg (a magyar fordítást senki nem vitte fel).
    'froment', 'seigle', 'orge', 'epeautre',
    'weizen', 'roggen', 'gerste', 'dinkel',
    // A régió nyelvei. Mérés szerint a magyar polcon lévő termékek ~13%-ánál
    // ezeken a nyelveken van az összetevő-szöveg az OpenFoodFactsben.
    'pszen', 'zyto', 'zytni', 'jeczmien', 'orkisz',          // lengyel
    'grau', 'secara',                                        // román
    'frumento', 'grano', 'segale', 'orzo', 'glutine',        // olasz
    'psenic', 'psenn', 'zito', 'jecmen', 'lepek', 'lepok', 'spalda', // cseh/szlovák
    'jecam', 'psenicn',                                      // horvát/szerb/szlovén
    'trigo', 'centeno', 'cebada', 'espelta',                 // spanyol
  ],
  uncertain: [
    // A zab önmagában gluténmentes, de a magyar piacon szinte mindig
    // gluténos gabonával közös üzemben dolgozzák fel.
    'zab', 'oat', 'avoine', 'hafer',
    'owies', 'owsian', 'ovaz', 'avena', 'oves', 'ovesn', 'zob',
    // A maláta legtöbbször árpából készül, de kukoricamaláta is létezik.
    'malata', 'malt', 'malz', 'slod', 'slad', 'malto',
  ],
  exceptions: [
    'rozsda',      // rozsdamentes acél – nem étel, de előfordul csomagolásszövegben
    'arpad',       // névelemek
    'buzavirag',   // búzavirág (dísz/aroma), nem gabona
    'granoturco',  // olaszul kukorica – nem a „grano" (búza)
    'granulat',    // granulátum
    'buchweizen',  // hajdina németül – NEM búza, pedig benne van a „weizen"
    'hajdinabuza',
  ],
  infixes: ['buza', 'weizen'],
  allergenTags: ['en:gluten'],
  freeLabels: ['en:gluten-free', 'en:no-gluten'],
});

const LACTOSE = make({
  sources: [
    // magyar – a „tej" előtag hozza a tejport, tejszínt, tejcukrot,
    // tejfehérjét, tejsavót, tejfölt, tejcsokoládét
    'tej', 'laktoz', 'vaj', 'sajt', 'joghurt', 'jogurt', 'kefir', 'turo',
    'kazein', 'savo', 'tejszin', 'mascarpone', 'ricotta', 'mozzarella',
    // Magyar összetett szavak, ahol a „tej" HÁTUL van – az előtag-logika
    // ezeket nem kapja el. Mérésen bukott meg rajta a Gouda („tehéntej").
    'tehentej', 'kecsketej', 'juhtej', 'bivalytej', 'anyatej',
    // Muszáj külön felvenni: hosszabb, mint a lentebbi „tejsav" kivétel,
    // és csak így nyeri meg vele szemben a leghosszabb-egyezés versenyt.
    'tejsavo',
    'parmezan', 'gorgonzola',
    // angol
    'milk', 'lactose', 'whey', 'casein', 'butter', 'cheese', 'cream',
    'yoghurt', 'yogurt', 'ghee', 'curd', 'dairy',
    // francia / német
    'lait', 'lactoserum', 'beurre', 'fromage', 'creme',
    'milch', 'laktose', 'molke', 'sahne', 'rahm', 'kase',
    // a régió nyelvei
    'mleko', 'mlecz', 'mleczn', 'smietan', 'maslo', 'serwatka', 'serek', 'serow', // lengyel
    'lapte', 'lactat', 'unt', 'branza', 'smantana',                    // román
    'latt', 'burro', 'formagg', 'panna', 'parmigiano',                 // olasz
    'mlieko', 'mleka', 'smetan', 'tvaroh', 'srvatka', 'syrovatka',     // cseh/szlovák
    'mlijeko', 'maslac', 'vrhnje', 'surutka',                          // horvát/szerb
    'lech', 'lacteo', 'mantequilla', 'queso', 'nata', 'suero',         // spanyol
  ],
  exceptions: [
    // E270 tejsav: szinte mindig kukorica- vagy répacukor erjesztéséből
    // származik, nem tejből. A „tejsavo" (tejsavó) hosszabb, ezért az nyer.
    'tejsav', 'tejsavas', 'tejsavbakterium', 'tejsavkultura',
    'laitue',      // saláta franciául – nem „lait"
    'savoy',       // savoy cabbage (kelkáposzta) – nem „savó"
    'natamic',     // natamicin (E235) tartósítószer – nem a spanyol „nata"
    'unto',        // olaszul „kenve" – nem a román „unt" (vaj)
    // Növényi „tejek" egybeírva. Ezek kellenek ahhoz, hogy a „tej"/„milch"
    // bárhol-egyezése ne riasszon rájuk.
    'kokusztej', 'mandulatej', 'zabtej', 'rizstej', 'szojatej', 'kokosztej',
    'kokosmilch', 'mandelmilch', 'sojamilch', 'hafermilch', 'reismilch',
    'kokosovomleko', 'mlekoodkokosa',
    // Szándékosan „sajtol", nem „sajto": a „sajtos" is a „sajto" előtaggal
    // kezdődik, azt viszont nem akarjuk kizárni.
    'sajtol',
  ],
  phraseExceptions: [
    // növényi zsiradékok – egyik sem tejtermék
    'cocoa butter', 'cacao butter', 'peanut butter', 'nut butter',
    'almond butter', 'cashew butter', 'shea butter', 'coconut butter',
    'sunflower butter', 'seed butter', 'apple butter',
    // növényi „tejek"
    'coconut milk', 'almond milk', 'soy milk', 'soya milk', 'oat milk',
    'rice milk', 'hemp milk', 'cashew milk', 'hazelnut milk', 'plant milk',
    'vegetable milk', 'coconut cream',
    'kakao vaj', 'novenyi tejszin',
  ],
  infixes: ['tej', 'milch'],
  allergenTags: ['en:milk'],
  freeLabels: ['en:lactose-free', 'en:no-lactose', 'en:dairy-free', 'en:no-milk'],
});

const EGG = make({
  sources: [
    'tojas', 'majonez', 'albumin', 'ovalbumin',
    'egg', 'albumen', 'mayonnaise',
    // A német „ei" előtag túl sok ártatlan szót elkapna (eingang, eis),
    // ezért csak a konkrét összetett alakok szerepelnek.
    'eier', 'eigelb', 'eiweiss', 'volleipulver',
    'oeuf',
    // a régió nyelvei
    'jajk', 'jaja', 'jaje', 'jajec',   // lengyel / horvát / szlovén
    'vejce', 'vajec', 'vajic',         // cseh / szlovák
    'uovo', 'uova', 'albume',          // olasz
    'huevo', 'oua', 'albus',           // spanyol / román
  ],
  exceptions: ['eggplant'], // padlizsán – nem tojás
  infixes: ['tojas'],       // „tyúktojás", „friss tyúktojás"
  allergenTags: ['en:eggs'],
  freeLabels: ['en:egg-free'],
});

const PEANUT = make({
  sources: [
    // A magyar „mogyoró" kétértelmű (a földimogyoró és a mogyoró is), ezért
    // a „mogyorovaj" mindkét listán szerepel – inkább kétszer figyelmeztet.
    'foldimogyoro', 'mogyorovaj',
    'peanut', 'groundnut', 'arachis',
    'arachide', 'cacahuete', 'erdnuss',
    'arachi', 'arahid', 'arasid', 'orzeszk', 'kikiriki',
  ],
  allergenTags: ['en:peanuts'],
  freeLabels: [],
});

const NUTS = make({
  sources: [
    'dio', 'mandula', 'mogyoro', 'pisztacia', 'kesu', 'makadamia', 'pekan',
    'almond', 'hazelnut', 'walnut', 'cashew', 'pistachio', 'macadamia', 'pecan',
    'mandel', 'haselnuss', 'walnuss', 'pistazien',
    'amande', 'noisette', 'noix', 'pistache',
    // a régió nyelvei
    'orzech', 'migdal',                          // lengyel
    'orech', 'mandle', 'lieskov', 'liesko',      // cseh / szlovák
    'nocciol', 'mandorl', 'noci',                // olasz
    'almendra', 'avellana', 'nuez',              // spanyol
    'badem', 'lesnik',                           // horvát / szerb
    'migdale', 'alune',                          // román
  ],
  exceptions: [
    'nutmeg',       // szerecsendió – fűszer, nem diófélé
    'muskatnuss',
    'szerecsendio',
    'kokuszdio',    // a kókuszdió nem diófélé-allergén
    'kokosnuss',
    // Mérésen bukott ki: a „dio" előtag ezekre is illett, és riasztott
    // ásványvízre meg hagymakrémre. A „dió" túl rövid ahhoz, hogy a szó
    // belsejében is keressük – ezért nincs az `infixes` között.
    'dioxid', 'dioxide', 'diode',
  ],
  phraseExceptions: ['noix de coco'], // kókusz franciául – nem diófélé
  allergenTags: ['en:nuts'],
  freeLabels: [],
});

const SOY = make({
  sources: ['szoja', 'soy', 'soja', 'soia', 'sojin', 'tofu', 'edamame', 'tempeh', 'miso'],
  allergenTags: ['en:soybeans'],
  freeLabels: [],
});

const SESAME = make({
  sources: ['szezam', 'sesame', 'sesam', 'sezam', 'susan', 'ajonjoli', 'tahini', 'tahina'],
  allergenTags: ['en:sesame-seeds'],
  freeLabels: [],
});

const FISH = make({
  sources: [
    'hal', 'lazac', 'hering', 'szardella', 'pisztrang', 'harcsa', 'ponty', 'tonhal',
    // Fajtanevek – mérésen ezek hiányoztak leginkább (konzervek, halrudak).
    'makrel', 'makrela', 'szardin', 'sprot', 'sprattus', 'scomber', 'seelachs',
    'busa', 'tokehal', 'nilusi', 'pangasius', 'tilapia', 'sugerhal',
    'fish', 'anchov', 'tuna', 'salmon', 'sardine', 'herring',
    'fisch', 'lachs', 'thunfisch',
    'poisson', 'thon', 'saumon', 'anchois',
    'ryba', 'ryby', 'rybn', 'losos', 'sledz',      // lengyel / cseh / szlovák
    'pesce', 'acciug', 'tonno',                    // olasz
    'pescado', 'atun', 'anchoa',                   // spanyol
    'riba', 'ribl',                                // horvát / szerb
  ],
  exceptions: [
    // A „hal" előtag ártatlan szavakat is elkapna.
    'halloumi', 'halva', 'halogen',
  ],
  allergenTags: ['en:fish'],
  freeLabels: [],
});

const CRUSTACEAN = make({
  sources: [
    // A magyar „rák" előtag a „rakott" és „raktár" szavakra is illene,
    // ezért csak a konkrét fajtanevek szerepelnek.
    'rakfele', 'garnela', 'homar', 'languszta',
    'shrimp', 'prawn', 'crab', 'lobster', 'crayfish', 'crustacean',
    'garnele', 'hummer', 'crevette', 'homard',
  ],
  allergenTags: ['en:crustaceans'],
  freeLabels: [],
});

const MOLLUSC = make({
  sources: [
    'kagylo', 'tintahal', 'polip', 'csiga', 'osztriga',
    'mussel', 'clam', 'oyster', 'squid', 'octopus', 'snail', 'scallop', 'calamari',
    'muschel', 'tintenfisch', 'auster',
    'huitre', 'calamar', 'escargot',
  ],
  allergenTags: ['en:molluscs'],
  freeLabels: [],
});

const CELERY = make({
  sources: ['zeller', 'celer', 'celery', 'celeriac', 'sellerie', 'celeri', 'seler', 'telina', 'sedano', 'apio'],
  allergenTags: ['en:celery'],
  freeLabels: [],
});

const MUSTARD = make({
  sources: [
    'mustar', 'mustard', 'senf', 'moutarde',
    'gorczyc', 'musztard', 'senape', 'horcic', 'horcica', 'mostaza', 'gorusic',
  ],
  allergenTags: ['en:mustard'],
  freeLabels: [],
});

const SULPHITE = make({
  sources: [
    'szulfit', 'kendioxid',
    'sulphite', 'sulfite', 'sulphur', 'sulfur', 'sulfureux', 'schwefel',
    'siarczyn', 'solfit', 'siric', 'sulfit', 'sumpor',
    // A szulfitok E-számai. Ez a legpontosabb jel: a „szén-dioxid" nem
    // keveredik bele, mert az más E-számon fut.
    'e220', 'e221', 'e222', 'e223', 'e224', 'e226', 'e227', 'e228',
  ],
  allergenTags: ['en:sulphur-dioxide-and-sulphites'],
  freeLabels: [],
});

const LUPIN = make({
  sources: ['csillagfurt', 'lupin', 'lupine'],
  allergenTags: ['en:lupin'],
  freeLabels: [],
});

const VEGAN = make({
  allergenTags: [],
  freeLabels: ['en:vegan'],
  analysis: { bad: ['en:non-vegan'], maybe: ['en:maybe-vegan'], good: ['en:vegan'] },
});

const VEGETARIAN = make({
  allergenTags: [],
  freeLabels: ['en:vegetarian'],
  analysis: {
    bad: ['en:non-vegetarian'],
    maybe: ['en:maybe-vegetarian'],
    good: ['en:vegetarian'],
  },
});

export const KEYWORDS: Record<DietKey, KeywordSet> = {
  gluten: GLUTEN,
  lactose: LACTOSE,
  egg: EGG,
  peanut: PEANUT,
  nuts: NUTS,
  soy: SOY,
  sesame: SESAME,
  fish: FISH,
  crustacean: CRUSTACEAN,
  mollusc: MOLLUSC,
  celery: CELERY,
  mustard: MUSTARD,
  sulphite: SULPHITE,
  lupin: LUPIN,
  vegan: VEGAN,
  vegetarian: VEGETARIAN,
};

/** A beállítások képernyő ezek szerint csoportosít. */
export type DietGroup = 'common' | 'allergen' | 'preference';

export type DietLabel = {
  /** Rövid név a kapcsolókhoz és a kártyasorokhoz. */
  name: string;
  /** „…mentes" alak a gyártói címkéhez. */
  free: string;
  /** Tárgyeset: „nem találtunk <ezt>". */
  source: string;
  /** Egy mondat a beállítások képernyőn: mit fed le. */
  hint: string;
  emoji: string;
  group: DietGroup;
};

export const DIET_LABEL: Record<DietKey, DietLabel> = {
  gluten: {
    name: 'Glutén',
    free: 'gluténmentes',
    source: 'gluténforrást',
    hint: 'Búza, rozs, árpa, tönköly és társaik. A zabot óvatosnak jelöljük.',
    emoji: '🌾',
    group: 'common',
  },
  lactose: {
    name: 'Tej / laktóz',
    free: 'laktózmentes',
    source: 'tejösszetevőt',
    hint: 'Tej, tejszín, sajt, vaj, tejsavó, kazein és a laktóz.',
    emoji: '🥛',
    group: 'common',
  },
  egg: {
    name: 'Tojás',
    free: 'tojásmentes',
    source: 'tojást',
    hint: 'Tojás, tojáspor, tojásfehérje, majonéz.',
    emoji: '🥚',
    group: 'allergen',
  },
  peanut: {
    name: 'Földimogyoró',
    free: 'földimogyoró-mentes',
    source: 'földimogyorót',
    hint: 'Földimogyoró és mogyoróvaj. A diófélétől külön kezelve.',
    emoji: '🥜',
    group: 'allergen',
  },
  nuts: {
    name: 'Diófélék',
    free: 'diómentes',
    source: 'diófélét',
    hint: 'Dió, mandula, mogyoró, pisztácia, kesu, pekándió.',
    emoji: '🌰',
    group: 'allergen',
  },
  soy: {
    name: 'Szója',
    free: 'szójamentes',
    source: 'szóját',
    hint: 'Szója, szójalecitin, tofu, tempeh, miso.',
    emoji: '🫘',
    group: 'allergen',
  },
  sesame: {
    name: 'Szezám',
    free: 'szezámmentes',
    source: 'szezámot',
    hint: 'Szezámmag, szezámolaj, tahini.',
    emoji: '🥯',
    group: 'allergen',
  },
  fish: {
    name: 'Hal',
    free: 'halmentes',
    source: 'halat',
    hint: 'Hal, halliszt, szardella, lazac, tonhal.',
    emoji: '🐟',
    group: 'allergen',
  },
  crustacean: {
    name: 'Rákfélék',
    free: 'rákmentes',
    source: 'rákfélét',
    hint: 'Garnéla, rák, homár, languszta.',
    emoji: '🦐',
    group: 'allergen',
  },
  mollusc: {
    name: 'Puhatestűek',
    free: 'puhatestű-mentes',
    source: 'puhatestűt',
    hint: 'Kagyló, osztriga, tintahal, polip, csiga.',
    emoji: '🐚',
    group: 'allergen',
  },
  celery: {
    name: 'Zeller',
    free: 'zellermentes',
    source: 'zellert',
    hint: 'Zeller, zellergumó, zellerlevél – gyakori a leveskockákban.',
    emoji: '🥬',
    group: 'allergen',
  },
  mustard: {
    name: 'Mustár',
    free: 'mustármentes',
    source: 'mustárt',
    hint: 'Mustár és mustármag, gyakran a fűszerkeverékekben.',
    emoji: '🌭',
    group: 'allergen',
  },
  sulphite: {
    name: 'Szulfit',
    free: 'szulfitmentes',
    source: 'szulfitot',
    hint: 'Kén-dioxid és szulfitok (E220–E228) – bor, aszalt gyümölcs.',
    emoji: '🍷',
    group: 'allergen',
  },
  lupin: {
    name: 'Csillagfürt',
    free: 'csillagfürtmentes',
    source: 'csillagfürtöt',
    hint: 'Lupin/csillagfürt-liszt, néhány gluténmentes pékáruban.',
    emoji: '🌸',
    group: 'allergen',
  },
  vegan: {
    name: 'Vegán',
    free: 'vegán',
    source: 'állati eredetű összetevőt',
    hint: 'Az OpenFoodFacts saját besorolása alapján, nem szótárból.',
    emoji: '🌱',
    group: 'preference',
  },
  vegetarian: {
    name: 'Vegetáriánus',
    free: 'vegetáriánus',
    source: 'húsból származó összetevőt',
    hint: 'Az OpenFoodFacts saját besorolása alapján, nem szótárból.',
    emoji: '🥗',
    group: 'preference',
  },
};
