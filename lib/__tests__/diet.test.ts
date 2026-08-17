import {
  applyNote,
  applyStrict,
  evaluate,
  evaluateDiet,
  evaluateWithNote,
  hasOwnFinding,
  hasTranslatedFinding,
  overallVerdict,
  worse,
} from '../diet';
import { emptyNote, hasVerdict } from '../notes';
import { DEFAULT_PROFILE, DietKey, Product, Profile } from '../types';

function product(overrides: Partial<Product> = {}): Product {
  return {
    code: '5999999000000',
    name: 'Teszt termék',
    brand: null,
    imageUrl: null,
    quantity: null,
    allergenTags: [],
    traceTags: [],
    labelTags: [],
    analysisTags: [],
    ingredientsText: null,
    ingredientsLang: 'hu',
    translation: null,
    ...overrides,
  };
}

/** A tesztek zöme két szűrővel dolgozik; a többit külön kapcsoljuk be. */
function only(...diets: DietKey[]): Profile {
  const switches = { ...DEFAULT_PROFILE.diets, gluten: false, lactose: false };
  for (const diet of diets) switches[diet] = true;
  return { ...DEFAULT_PROFILE, diets: switches };
}

function strictly(...diets: DietKey[]): Profile {
  return { ...only(...diets), strict: true };
}

describe('glutén', () => {
  it('a búzalisztet megtalálja', () => {
    const finding = evaluateDiet(product({ ingredientsText: 'búzaliszt, cukor, só' }), 'gluten');
    expect(finding.verdict).toBe('unsafe');
    expect(finding.evidence).toContain('buzaliszt');
  });

  it('a ragozott alakot is elkapja', () => {
    expect(evaluateDiet(product({ ingredientsText: 'búzát tartalmaz' }), 'gluten').verdict).toBe(
      'unsafe',
    );
  });

  it('összetett szóban is felismeri a gabonát', () => {
    expect(
      evaluateDiet(product({ ingredientsText: 'tönkölybúzadara, árpamaláta' }), 'gluten').verdict,
    ).toBe('unsafe');
  });

  it('a „gluténmentes" szót nem érti gluténnak', () => {
    expect(
      evaluateDiet(product({ ingredientsText: 'gluténmentes kukoricaliszt' }), 'gluten').verdict,
    ).toBe('safe');
  });

  it('a kötőjeles „gluten-free" sem téveszti meg', () => {
    const finding = evaluateDiet(product({ ingredientsText: 'gluten-free rice flour' }), 'gluten');
    expect(finding.verdict).toBe('safe');
  });

  it('a zabot óvatosnak jelöli, nem tiltottnak', () => {
    const finding = evaluateDiet(product({ ingredientsText: 'zabpehely, méz' }), 'gluten');
    expect(finding.verdict).toBe('caution');
    expect(finding.evidence).toContain('zabpehely');
  });

  it('a gyártói gluténmentes címke felülírja az összetevőket', () => {
    const finding = evaluateDiet(
      product({
        ingredientsText: 'búzakeményítő', // gluténmentesített búzakeményítő létezik
        labelTags: ['en:gluten-free'],
      }),
      'gluten',
    );
    expect(finding.verdict).toBe('safe');
    expect(finding.evidence).toEqual(['en:gluten-free']);
  });

  it('a deklarált allergént összetevő-szöveg nélkül is elfogadja', () => {
    const finding = evaluateDiet(product({ allergenTags: ['en:gluten'] }), 'gluten');
    expect(finding.verdict).toBe('unsafe');
  });

  it('a nyomokban előfordulásból figyelmeztetés lesz', () => {
    const finding = evaluateDiet(
      product({ ingredientsText: 'kukoricaliszt', traceTags: ['en:gluten'] }),
      'gluten',
    );
    expect(finding.verdict).toBe('caution');
  });

  it('a „rozsdamentes" nem rozs', () => {
    expect(
      evaluateDiet(product({ ingredientsText: 'rozsdamentes edényben főzve' }), 'gluten').verdict,
    ).toBe('safe');
  });
});

describe('tej / laktóz', () => {
  it('a tejport megtalálja', () => {
    expect(evaluateDiet(product({ ingredientsText: 'sovány tejpor' }), 'lactose').verdict).toBe(
      'unsafe',
    );
  });

  it('a tejsavót is – hiába kivétel a nála rövidebb „tejsav"', () => {
    const finding = evaluateDiet(product({ ingredientsText: 'tejsavópor' }), 'lactose');
    expect(finding.verdict).toBe('unsafe');
    expect(finding.evidence).toContain('tejsavopor');
  });

  it('a tejsavat (E270) nem nézi tejnek', () => {
    expect(
      evaluateDiet(product({ ingredientsText: 'tejsav (E270), víz' }), 'lactose').verdict,
    ).toBe('safe');
  });

  it('a mogyoróvajon nem akad fenn a „vaj"', () => {
    expect(evaluateDiet(product({ ingredientsText: 'mogyoróvaj, só' }), 'lactose').verdict).toBe(
      'safe',
    );
  });

  it('a „tejmentes" nem tej', () => {
    expect(
      evaluateDiet(product({ ingredientsText: 'tejmentes margarin' }), 'lactose').verdict,
    ).toBe('safe');
  });

  it('a sajtot igen, a sajtolt olajat nem', () => {
    expect(evaluateDiet(product({ ingredientsText: 'sajtos szósz' }), 'lactose').verdict).toBe(
      'unsafe',
    );
    expect(
      evaluateDiet(product({ ingredientsText: 'hidegen sajtolt napraforgóolaj' }), 'lactose')
        .verdict,
    ).toBe('safe');
  });

  it('a laktózmentes címke felülírja a tejösszetevőt', () => {
    expect(
      evaluateDiet(
        product({ ingredientsText: 'laktózmentes tej', labelTags: ['en:lactose-free'] }),
        'lactose',
      ).verdict,
    ).toBe('safe');
  });
});

describe('növényi eredetű, tejnek látszó összetevők', () => {
  it('a kakaóvaj nem tejtermék – vegán étcsoki nem lehet „nem mentes"', () => {
    const finding = evaluateDiet(
      product({ ingredientsText: 'cocoa mass, sugar, cocoa butter, vanilla' }),
      'lactose',
    );
    expect(finding.verdict).toBe('safe');
  });

  it('a magyar „kakaóvaj" egybeírva is átmegy', () => {
    expect(
      evaluateDiet(product({ ingredientsText: 'kakaómassza, cukor, kakaóvaj' }), 'lactose').verdict,
    ).toBe('safe');
  });

  it('a mogyoróvaj angolul sem tejtermék', () => {
    expect(
      evaluateDiet(product({ ingredientsText: 'peanut butter, salt' }), 'lactose').verdict,
    ).toBe('safe');
  });

  it('a növényi tejek sem azok', () => {
    expect(
      evaluateDiet(product({ ingredientsText: 'coconut milk, water' }), 'lactose').verdict,
    ).toBe('safe');
    expect(
      evaluateDiet(product({ ingredientsText: 'almond milk, sea salt' }), 'lactose').verdict,
    ).toBe('safe');
  });

  it('a „non-dairy" szókapcsolatot kioltja', () => {
    expect(evaluateDiet(product({ ingredientsText: 'non-dairy base' }), 'lactose').verdict).toBe(
      'safe',
    );
  });

  it('ISMERT KORLÁT: a „non-dairy creamer" mégis riaszt', () => {
    // A „non" csak a közvetlenül utána álló „dairy" szót oltja ki, a „creamer"
    // önmagában is találat. Szándékosan nem terjesztjük ki a tagadást a
    // következő szóra: egy „Sans gluten. Lait écrémé…" szövegben az elnyelné a
    // valódi tejet. Fölösleges riasztás vállalható, elmulasztott riasztás nem.
    expect(
      evaluateDiet(product({ ingredientsText: 'non-dairy creamer base' }), 'lactose').verdict,
    ).toBe('unsafe');
  });

  it('a valódi tejet viszont továbbra is elkapja mellettük', () => {
    // Kinder Chocolate: van benne kakaóvaj (nem tej) ÉS koncentrált vaj (tej).
    const finding = evaluateDiet(
      product({
        ingredientsText:
          'Fine MILK chocolate 40% (sugar, MILK powder, cocoa butter, cocoa mass), palm oil, concentrated BUTTER',
      }),
      'lactose',
    );
    expect(finding.verdict).toBe('unsafe');
    expect(finding.evidence).toContain('milk');
    expect(finding.evidence).toContain('butter');
  });

  it('a zabtejnél a glutén marad óvatos, a tej rendben', () => {
    const oatDrink = product({ ingredientsText: 'oat milk (water, oats), salt' });
    expect(evaluateDiet(oatDrink, 'lactose').verdict).toBe('safe');
    expect(evaluateDiet(oatDrink, 'gluten').verdict).toBe('caution');
  });
});

describe('idegen nyelvű összetevő-szöveg', () => {
  // Az OpenFoodFactsben a magyar boltokban kapható termékeknél is gyakran
  // francia vagy német a szöveg – a magyar fordítást senki nem vitte fel.
  it('felismeri a francia tejösszetevőket', () => {
    const finding = evaluateDiet(
      product({ ingredientsText: 'sucre, LAIT écrémé en poudre, LACTOSERUM en poudre' }),
      'lactose',
    );
    expect(finding.verdict).toBe('unsafe');
  });

  it('felismeri a német gabonát', () => {
    expect(evaluateDiet(product({ ingredientsText: 'Weizenmehl, Zucker' }), 'gluten').verdict).toBe(
      'unsafe',
    );
  });

  it('a francia saláta („laitue") nem tej', () => {
    expect(
      evaluateDiet(product({ ingredientsText: 'laitue, tomate, huile' }), 'lactose').verdict,
    ).toBe('safe');
  });

  it('érti a „sans gluten" tagadást', () => {
    expect(
      evaluateDiet(product({ ingredientsText: 'cacao, sucre. Sans gluten.' }), 'gluten').verdict,
    ).toBe('safe');
  });

  it('érti az „ohne Gluten" és a „glutenfrei" alakot', () => {
    expect(evaluateDiet(product({ ingredientsText: 'Reis, ohne Gluten' }), 'gluten').verdict).toBe(
      'safe',
    );
    expect(evaluateDiet(product({ ingredientsText: 'glutenfrei, Reis' }), 'gluten').verdict).toBe(
      'safe',
    );
  });

  it('érti a „glutén nélkül" alakot', () => {
    expect(
      evaluateDiet(product({ ingredientsText: 'rizsliszt, glutén nélkül' }), 'gluten').verdict,
    ).toBe('safe');
  });
});

describe('valódi OpenFoodFacts rekord (Nutella)', () => {
  // A mezők pontosan úgy néznek ki, ahogy az élő API visszaadta.
  const nutella = product({
    code: '3017620422003',
    name: 'Nutella',
    allergenTags: ['en:milk', 'en:nuts', 'en:soybeans'],
    traceTags: [],
    labelTags: ['en:no-gluten'],
    ingredientsText:
      'Sucre, huile de palme, NOISETTES 13%, cacao maigre 7,4%, LAIT écrémé en poudre 6,6%, LACTOSERUM en poudre, émulsifiants: lécithines (SOJA), vanilline. Sans gluten',
  });

  it('gluténra a gyártói címke miatt rendben', () => {
    expect(evaluateDiet(nutella, 'gluten').verdict).toBe('safe');
  });

  it('tejre nem megfelelő', () => {
    expect(evaluateDiet(nutella, 'lactose').verdict).toBe('unsafe');
  });

  it('az össztitélet a rosszabbat mutatja', () => {
    expect(overallVerdict(evaluate(nutella, only('gluten', 'lactose')))).toBe('unsafe');
  });
});

describe('valódi termékeken mért hibák (regresszió)', () => {
  // Mindegyik esetet 324 magyar termék mérése hozta felszínre, nem elmélet.

  it('elkapja a „tehéntej"-et, ahol a tej hátul van', () => {
    // A Gouda ezen bukott meg: „pasztőrözött tehéntej".
    expect(
      evaluateDiet(product({ ingredientsText: 'pasztőrözött tehéntej, étkezési só' }), 'lactose')
        .verdict,
    ).toBe('unsafe');
  });

  it('elkapja a „tyúktojás"-t is', () => {
    expect(
      evaluateDiet(product({ ingredientsText: 'Búzaliszt, friss tyúktojás' }), 'egg').verdict,
    ).toBe('unsafe');
  });

  it('elkapja a német összetett szót, ahol a tej középen van', () => {
    // Nutella németül: „MAGERMILCHPULVER".
    expect(
      evaluateDiet(
        product({ ingredientsText: 'Zucker, Palmöl, MAGERMILCHPULVER (8,7%)', ingredientsLang: 'de' }),
        'lactose',
      ).verdict,
    ).toBe('unsafe');
  });

  it('a hajdina („Buchweizen") nem búza', () => {
    expect(
      evaluateDiet(product({ ingredientsText: 'Buchweizenmehl, Wasser', ingredientsLang: 'de' }), 'gluten')
        .verdict,
    ).toBe('safe');
  });

  it('a „dioxid" nem dió', () => {
    // Ásványvízre és hagymakrémre riasztott a kén-dioxid miatt.
    expect(
      evaluateDiet(product({ ingredientsText: 'víz, szén-dioxid, titán-dioxid' }), 'nuts').verdict,
    ).toBe('safe');
  });

  it('a kókuszdió nem diófélé-allergén', () => {
    expect(
      evaluateDiet(product({ ingredientsText: 'szárított kókuszdió, cukor' }), 'nuts').verdict,
    ).toBe('safe');
  });

  it('felismeri a halfajták nevét, nemcsak a „hal" szót', () => {
    expect(
      evaluateDiet(product({ ingredientsText: '60% makrélafilé, paradicsomszósz' }), 'fish').verdict,
    ).toBe('unsafe');
    expect(
      evaluateDiet(
        product({ ingredientsText: 'Alaska-Seelachsfilet (65%)', ingredientsLang: 'de' }),
        'fish',
      ).verdict,
    ).toBe('unsafe');
  });
});

describe('nem értett nyelv', () => {
  // Mérés szerint a magyar polcon lévő termékek jelentős részénél nem magyarul
  // van az összetevő-szöveg az OpenFoodFactsben. Ha nem értjük, a hallgatásunk
  // nem bizonyíték – ez volt a legveszélyesebb hibaforrás.
  it('a régió nyelvein felismeri a gabonát és a tejet', () => {
    expect(
      evaluateDiet(product({ ingredientsText: 'mąka pszenna, cukier', ingredientsLang: 'pl' }), 'gluten')
        .verdict,
    ).toBe('unsafe');
    expect(
      evaluateDiet(product({ ingredientsText: 'mléko, cukr', ingredientsLang: 'cs' }), 'lactose')
        .verdict,
    ).toBe('unsafe');
    expect(
      evaluateDiet(product({ ingredientsText: 'lapte praf, zahăr', ingredientsLang: 'ro' }), 'lactose')
        .verdict,
    ).toBe('unsafe');
    expect(
      evaluateDiet(product({ ingredientsText: 'harina de trigo', ingredientsLang: 'es' }), 'gluten')
        .verdict,
    ).toBe('unsafe');
    expect(
      evaluateDiet(product({ ingredientsText: 'farina di frumento', ingredientsLang: 'it' }), 'gluten')
        .verdict,
    ).toBe('unsafe');
  });

  it('ismeretlen nyelvnél nem mond „mentes"-t, hanem „nincs adat"-ot', () => {
    const finnish = product({ ingredientsText: 'sokeri, suola, mausteet', ingredientsLang: 'fi' });
    expect(evaluateDiet(finnish, 'gluten').verdict).toBe('unknown');
  });

  it('cirill betűs szövegre sem találgat', () => {
    const bulgarian = product({
      ingredientsText: 'Пастьоризирано мляко, вода, захар',
      ingredientsLang: 'bg',
    });
    expect(evaluateDiet(bulgarian, 'lactose').verdict).toBe('unknown');
  });

  it('de ha van allergén-címke, az ismeretlen nyelv sem baj', () => {
    // A címkék nyelvfüggetlenek: ha a gyártó nyilatkozott, tudunk dönteni.
    const finnish = product({
      ingredientsText: 'sokeri, suola',
      ingredientsLang: 'fi',
      allergenTags: ['en:milk'],
    });
    expect(evaluateDiet(finnish, 'lactose').verdict).toBe('unsafe');
    expect(evaluateDiet(finnish, 'gluten').verdict).toBe('safe');
  });

  it('ismeretlen nyelven is hisz a saját találatának', () => {
    // Ha a szó véletlenül egyezik, az akkor is találat – a nyelv csak a
    // „nem találtam semmit" következtetést gyengíti.
    const finnish = product({ ingredientsText: 'vehnä, maito, sokeri', ingredientsLang: 'fi' });
    expect(evaluateDiet(finnish, 'gluten').verdict).toBe('unknown');
  });
});

describe('hiányzó adat', () => {
  it('összetevő és allergén nélkül nem mond ítéletet', () => {
    const finding = evaluateDiet(product(), 'gluten');
    expect(finding.verdict).toBe('unknown');
    expect(finding.evidence).toEqual([]);
  });

  it('üres összetevő-szöveg is ismeretlennek számít', () => {
    expect(evaluateDiet(product({ ingredientsText: '   ' }), 'gluten').verdict).toBe('unknown');
  });
});

describe('a további allergének', () => {
  it('tojást talál magyarul és angolul', () => {
    expect(evaluateDiet(product({ ingredientsText: 'tojáspor, cukor' }), 'egg').verdict).toBe(
      'unsafe',
    );
    expect(evaluateDiet(product({ ingredientsText: 'whole egg powder' }), 'egg').verdict).toBe(
      'unsafe',
    );
  });

  it('a padlizsán („eggplant") nem tojás', () => {
    expect(evaluateDiet(product({ ingredientsText: 'eggplant, olive oil' }), 'egg').verdict).toBe(
      'safe',
    );
  });

  it('a szerecsendió nem diófélé', () => {
    // Magyarul az előtag-logika véd: a „szerecsendió" nem a „dió"-val kezdődik.
    expect(
      evaluateDiet(product({ ingredientsText: 'fahéj, szerecsendió' }), 'nuts').verdict,
    ).toBe('safe');
    expect(evaluateDiet(product({ ingredientsText: 'nutmeg, cinnamon' }), 'nuts').verdict).toBe(
      'safe',
    );
  });

  it('a „noix de coco" kókusz, nem dió', () => {
    expect(evaluateDiet(product({ ingredientsText: 'noix de coco râpée' }), 'nuts').verdict).toBe(
      'safe',
    );
    expect(evaluateDiet(product({ ingredientsText: 'noix, amandes' }), 'nuts').verdict).toBe(
      'unsafe',
    );
  });

  it('a halloumi sajt nem hal', () => {
    // A „hal" előtag különösen veszélyes, ezért van rá kivétel.
    expect(evaluateDiet(product({ ingredientsText: 'halloumi, olívaolaj' }), 'fish').verdict).toBe(
      'safe',
    );
    expect(evaluateDiet(product({ ingredientsText: 'halliszt' }), 'fish').verdict).toBe('unsafe');
  });

  it('a szulfitot az E-számáról is felismeri', () => {
    expect(evaluateDiet(product({ ingredientsText: 'aszalt sárgabarack, E220' }), 'sulphite').verdict).toBe(
      'unsafe',
    );
  });

  it('a szén-dioxid nem szulfit', () => {
    expect(
      evaluateDiet(product({ ingredientsText: 'víz, szén-dioxid, cukor' }), 'sulphite').verdict,
    ).toBe('safe');
  });

  it('a deklarált allergéncímkére szöveg nélkül is épít', () => {
    expect(evaluateDiet(product({ allergenTags: ['en:celery'] }), 'celery').verdict).toBe('unsafe');
    expect(evaluateDiet(product({ allergenTags: ['en:mustard'] }), 'mustard').verdict).toBe(
      'unsafe',
    );
  });
});

describe('vegán / vegetáriánus', () => {
  it('az adatbázis besorolását használja, nem szótárt', () => {
    expect(
      evaluateDiet(product({ analysisTags: ['en:non-vegan'], ingredientsText: 'tejpor' }), 'vegan')
        .verdict,
    ).toBe('unsafe');
    expect(
      evaluateDiet(product({ analysisTags: ['en:vegan'], ingredientsText: 'rizs' }), 'vegan')
        .verdict,
    ).toBe('safe');
  });

  it('a bizonytalan besorolásból figyelmeztetés lesz', () => {
    expect(
      evaluateDiet(product({ analysisTags: ['en:maybe-vegan'] }), 'vegan').verdict,
    ).toBe('caution');
  });

  it('besorolás nélkül nem találgat', () => {
    // Az összetevő-szöveg megléte itt nem elég: vegánságot szótárból nem
    // állapítunk meg.
    expect(
      evaluateDiet(product({ ingredientsText: 'rizs, só, víz' }), 'vegan').verdict,
    ).toBe('unknown');
  });

  it('a vegetáriánus külön besorolásra épül', () => {
    const product1 = product({ analysisTags: ['en:non-vegan', 'en:vegetarian'] });
    expect(evaluateDiet(product1, 'vegan').verdict).toBe('unsafe');
    expect(evaluateDiet(product1, 'vegetarian').verdict).toBe('safe');
  });

  it('a gyártói vegán címke felülírja a besorolást', () => {
    const finding = evaluateDiet(
      product({ labelTags: ['en:vegan'], analysisTags: ['en:maybe-vegan'] }),
      'vegan',
    );
    expect(finding.verdict).toBe('safe');
  });
});

describe('találatok helye a szövegben', () => {
  it('a talált szó pozíciója az eredeti szövegre mutat', () => {
    const text = 'Cukor, BÚZALISZT, só';
    const finding = evaluateDiet(product({ ingredientsText: text }), 'gluten');

    expect(finding.spans).toHaveLength(1);
    expect(text.slice(finding.spans[0].start, finding.spans[0].end)).toBe('BÚZALISZT');
  });

  it('több találatnál mindegyik helyét megadja', () => {
    const text = 'tejpor, cukor, vaj';
    const finding = evaluateDiet(product({ ingredientsText: text }), 'lactose');

    expect(finding.spans.map((span) => text.slice(span.start, span.end))).toEqual([
      'tejpor',
      'vaj',
    ]);
  });

  it('címkéből származó ítéletnél nincs kiemelés', () => {
    const finding = evaluateDiet(product({ allergenTags: ['en:milk'] }), 'lactose');
    expect(finding.spans).toEqual([]);
  });

  it('az indoklásban az ismétlődő szó egyszer szerepel', () => {
    const finding = evaluateDiet(product({ ingredientsText: 'tej, cukor, tej' }), 'lactose');
    expect(finding.evidence).toEqual(['tej']);
    expect(finding.spans).toHaveLength(2); // kiemelni viszont mindkettőt kell
  });
});

describe('szigorú mód', () => {
  it('a „nyomokban" figyelmeztetésből tiltás lesz', () => {
    const traces = product({ ingredientsText: 'kukoricaliszt', traceTags: ['en:gluten'] });

    expect(overallVerdict(evaluate(traces, only('gluten')))).toBe('caution');
    expect(overallVerdict(evaluate(traces, strictly('gluten')))).toBe('unsafe');
  });

  it('a bizonytalan összetevő (zab) is tiltássá válik', () => {
    const oats = product({ ingredientsText: 'zabpehely, méz' });
    expect(overallVerdict(evaluate(oats, strictly('gluten')))).toBe('unsafe');
  });

  it('az indoklás megmondja, hogy a szigorú mód miatt szigorúbb', () => {
    const finding = evaluate(product({ ingredientsText: 'zabpehely' }), strictly('gluten'))[0];
    expect(finding.reason).toContain('szigorú mód');
  });

  it('a „nincs adat" NEM válik tiltássá', () => {
    // Az adathiány továbbra is adathiány – nem tény, és nem is szabad annak
    // látszania, különben a felhasználó rossz okból hinne az appnak.
    const empty = product();
    expect(overallVerdict(evaluate(empty, strictly('gluten')))).toBe('unknown');
  });

  it('a mentes és a tiltott ítéletet nem bántja', () => {
    expect(
      overallVerdict(evaluate(product({ ingredientsText: 'rizsliszt' }), strictly('gluten'))),
    ).toBe('safe');
    expect(
      overallVerdict(evaluate(product({ ingredientsText: 'búzaliszt' }), strictly('gluten'))),
    ).toBe('unsafe');
  });

  it('a kikapcsolt szigorú mód semmit nem változtat', () => {
    const oats = product({ ingredientsText: 'zabpehely' });
    expect(applyStrict(evaluate(oats, only('gluten')), false)).toEqual(
      evaluate(oats, only('gluten')),
    );
  });
});

describe('saját jegyzet', () => {
  const bothOn = only('gluten', 'lactose');

  it('felülírja az adatbázis ítéletét', () => {
    // A felhasználó elolvasta a csomagolást: az frissebb forrás, mint az OFF.
    const note = emptyNote('111');
    note.diets.lactose = 'safe';

    const findings = applyNote(
      evaluate(product({ ingredientsText: 'tejpor' }), bothOn),
      note,
    );
    const lactose = findings.find((finding) => finding.diet === 'lactose');
    expect(lactose?.verdict).toBe('safe');
    expect(lactose?.reason).toContain('jegyzeted');
  });

  it('a meg nem jelölt étrendet békén hagyja', () => {
    const note = emptyNote('111');
    note.diets.lactose = 'safe';

    const findings = applyNote(
      evaluate(product({ ingredientsText: 'búzaliszt, tejpor' }), bothOn),
      note,
    );
    expect(findings.find((finding) => finding.diet === 'gluten')?.verdict).toBe('unsafe');
  });

  it('jegyzet nélkül semmit nem változtat', () => {
    const findings = evaluate(product({ ingredientsText: 'tejpor' }), bothOn);
    expect(applyNote(findings, null)).toEqual(findings);
  });

  it('megjelöli, melyik sor származik a jegyzetből', () => {
    // Enélkül a felületen nem lehetne megkülönböztetni a saját feltételezést
    // az adatbázis állításától – hónapokkal később ez félrevezető lenne.
    const note = emptyNote('111');
    note.diets.lactose = 'safe';

    const findings = applyNote(
      evaluate(product({ ingredientsText: 'búzaliszt, tejpor' }), bothOn),
      note,
    );
    expect(findings.find((finding) => finding.diet === 'gluten')?.source).toBe('data');
    expect(findings.find((finding) => finding.diet === 'lactose')?.source).toBe('note');
    expect(hasOwnFinding(findings)).toBe(true);
  });

  it('csak adatból származó sorokra nem jelez saját jegyzetet', () => {
    const findings = evaluate(product({ ingredientsText: 'tejpor' }), bothOn);
    expect(hasOwnFinding(findings)).toBe(false);
    expect(findings.every((finding) => finding.source === 'data')).toBe(true);
  });

  it('a csak nevet tartalmazó jegyzet nem számít ítéletnek', () => {
    // Különben a felület „saját jegyzet"-ként jelölne egy olyan ítéletet,
    // amit valójában továbbra is az adatbázis mond.
    expect(hasVerdict(null)).toBe(false);
    expect(hasVerdict(emptyNote('111', 'Reese’s'))).toBe(false);

    const note = emptyNote('111');
    note.diets.gluten = 'unsafe';
    expect(hasVerdict(note)).toBe(true);
  });

  it('akkor is megszólal, ha a termék nincs az adatbázisban', () => {
    const note = emptyNote('111');
    note.diets.gluten = 'safe';
    note.diets.lactose = 'unsafe';

    const findings = evaluateWithNote(null, note, bothOn);
    expect(findings.map((finding) => finding.verdict)).toEqual(['safe', 'unsafe']);
    expect(overallVerdict(findings)).toBe('unsafe');
  });

  it('ismeretlen termék és jegyzet nélkül minden „nincs adat"', () => {
    const findings = evaluateWithNote(null, null, bothOn);
    expect(findings.map((finding) => finding.verdict)).toEqual(['unknown', 'unknown']);
  });

  it('a kikapcsolt szűrőre a jegyzet sem hoz létre sort', () => {
    const note = emptyNote('111');
    note.diets.lactose = 'unsafe';

    const findings = evaluateWithNote(null, note, only('gluten'));
    expect(findings.map((finding) => finding.diet)).toEqual(['gluten']);
  });
});

describe('csomagolásról beírt összetevők', () => {
  // A mérés szerint a bolti saját márkák 57%-áról nincs adat az OFF-ban.
  // A csomagoláson viszont törvény szerint ott a magyar összetevőlista.
  const bothOn = only('gluten', 'lactose');

  function withIngredients(text: string) {
    return { ...emptyNote('111'), ingredients: text };
  }

  it('adatbázis nélkül is dönt a beírt szövegből', () => {
    const findings = evaluateWithNote(null, withIngredients('búzaliszt, cukor, tejpor'), bothOn);
    expect(findings.map((finding) => finding.verdict)).toEqual(['unsafe', 'unsafe']);
  });

  it('mind a 16 szűrőre következtet, nem csak amit bejelöltél', () => {
    // Ez a lényeg: egyszer beírod, és később bekapcsolt szűrőkre is válaszol.
    const note = withIngredients('cukor, mogyoró, tojáspor');
    expect(evaluateWithNote(null, note, only('nuts'))[0].verdict).toBe('unsafe');
    expect(evaluateWithNote(null, note, only('egg'))[0].verdict).toBe('unsafe');
    expect(evaluateWithNote(null, note, only('fish'))[0].verdict).toBe('safe');
  });

  it('kiegészíti az adatbázis szövegét, nem lecseréli', () => {
    // Egyik forrásban talált allergén sem veszhet el.
    const product1 = product({ ingredientsText: 'búzaliszt, cukor' });
    const findings = evaluateWithNote(product1, withIngredients('sovány tejpor'), bothOn);
    expect(findings.find((f) => f.diet === 'gluten')?.verdict).toBe('unsafe');
    expect(findings.find((f) => f.diet === 'lactose')?.verdict).toBe('unsafe');
  });

  it('a beírt szöveget magyarnak veszi, így az idegen nyelvű rekord is kiértékelhető', () => {
    const foreign = product({ ingredientsText: 'sokeri, suola', ingredientsLang: 'fi' });
    expect(evaluateWithNote(foreign, null, only('lactose'))[0].verdict).toBe('unknown');
    expect(
      evaluateWithNote(foreign, withIngredients('cukor, só, víz'), only('lactose'))[0].verdict,
    ).toBe('safe');
  });

  it('a kézi étrend-jelölés továbbra is felülír mindent', () => {
    const note = withIngredients('búzaliszt');
    note.diets.gluten = 'safe'; // a felhasználó tudja, hogy gluténmentesített
    expect(evaluateWithNote(null, note, only('gluten'))[0].verdict).toBe('safe');
  });

  it('üres beírt szöveg nem változtat semmin', () => {
    const product1 = product({ ingredientsText: 'búzaliszt' });
    expect(evaluateWithNote(product1, withIngredients('   '), only('gluten'))[0].verdict).toBe(
      'unsafe',
    );
  });
});

describe('összesítés', () => {
  it('a rosszabb ítélet nyer', () => {
    expect(worse('safe', 'unsafe')).toBe('unsafe');
    expect(worse('caution', 'safe')).toBe('caution');
  });

  it('a hiányzó adat súlyosabb, mint a nyomokban előfordulás', () => {
    expect(worse('caution', 'unknown')).toBe('unknown');
  });

  it('a legrosszabb részeredményt hozza össztitéletnek', () => {
    const findings = evaluate(
      product({ ingredientsText: 'zabpehely, tejpor' }),
      only('gluten', 'lactose'),
    );
    expect(findings).toHaveLength(2);
    expect(overallVerdict(findings)).toBe('unsafe');
  });

  it('csak a bekapcsolt szűrőket értékeli ki', () => {
    const findings = evaluate(product({ ingredientsText: 'tejpor' }), only('gluten'));
    expect(findings.map((finding) => finding.diet)).toEqual(['gluten']);
    expect(overallVerdict(findings)).toBe('safe');
  });

  it('szűrő nélkül nincs mire ítéletet mondani', () => {
    expect(overallVerdict([])).toBe('unknown');
  });
});

describe('gépi fordítás', () => {
  /** Török – nincs a COVERED_LANGUAGES listán, ezért ma `unknown` lenne. */
  const torok = 'İçindekiler: buğday unu, şeker, yağsız süt tozu.';

  it('fordítás nélkül nem mond ítéletet a nem értett nyelvre', () => {
    const findings = evaluateWithNote(
      product({ ingredientsText: torok, ingredientsLang: 'tr' }),
      null,
      only('gluten', 'lactose'),
    );
    expect(findings.map((finding) => finding.verdict)).toEqual(['unknown', 'unknown']);
  });

  it('fordítás után a szótár megtalálja az allergéneket', () => {
    const findings = evaluateWithNote(
      product({
        ingredientsText: torok,
        ingredientsLang: 'tr',
        translation: {
          text: 'búzaliszt, cukor, sovány tejpor',
          traces: null,
          fromLang: 'tr',
          at: '2026-08-14T08:00:00.000Z',
        },
      }),
      null,
      only('gluten', 'lactose'),
    );
    expect(findings.map((finding) => finding.verdict)).toEqual(['unsafe', 'unsafe']);
  });

  it('a fordításon alapuló ítélet forrása `translation`, nem `data`', () => {
    const [finding] = evaluateWithNote(
      product({
        ingredientsText: torok,
        ingredientsLang: 'tr',
        translation: {
          text: 'búzaliszt, cukor',
          traces: null,
          fromLang: 'tr',
          at: '2026-08-14T08:00:00.000Z',
        },
      }),
      null,
      only('gluten'),
    );
    expect(finding.source).toBe('translation');
    expect(hasTranslatedFinding([finding])).toBe(true);
  });

  it('a gyártói címke akkor is adat marad, ha közben fordítottunk', () => {
    const [finding] = evaluateWithNote(
      product({
        ingredientsText: torok,
        ingredientsLang: 'tr',
        labelTags: ['en:gluten-free'],
        translation: {
          text: 'kukoricaliszt',
          traces: null,
          fromLang: 'tr',
          at: '2026-08-14T08:00:00.000Z',
        },
      }),
      null,
      only('gluten'),
    );
    expect(finding.verdict).toBe('safe');
    expect(finding.source).toBe('data');
  });

  it('a „nyomokban" rész figyelmeztetés lesz, nem tiltás', () => {
    const [finding] = evaluateWithNote(
      product({
        ingredientsText: torok,
        ingredientsLang: 'tr',
        translation: {
          text: 'kukoricaliszt, cukor',
          traces: 'mogyorót és szezámot tartalmazhat',
          fromLang: 'tr',
          at: '2026-08-14T08:00:00.000Z',
        },
      }),
      null,
      only('nuts'),
    );
    expect(finding.verdict).toBe('caution');
    expect(finding.reason).toBe('Nyomokban tartalmazhatja.');
  });

  it('a nyomokban-találat nem kap kiemelést a fő szövegben', () => {
    const [finding] = evaluateWithNote(
      product({
        ingredientsText: torok,
        ingredientsLang: 'tr',
        translation: {
          text: 'kukoricaliszt',
          traces: 'mogyorót tartalmazhat',
          fromLang: 'tr',
          at: '2026-08-14T08:00:00.000Z',
        },
      }),
      null,
      only('nuts'),
    );
    // A pozíciók a fő szövegre mutatnának, a találat viszont a külön mezőben
    // van – rossz helyen emelnénk ki.
    expect(finding.spans).toEqual([]);
  });

  it('a régi mentésből hiányzó `translation` nem számít fordításnak', () => {
    // A korábbi appverzió terméke: a mező nincs is rajta.
    const regi = product({ ingredientsText: 'tejpor' });
    delete (regi as Partial<Product>).translation;

    const [finding] = evaluate(regi, only('lactose'));
    expect(finding.verdict).toBe('unsafe');
    expect(finding.source).toBe('data');
  });
});
