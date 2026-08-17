/**
 * Szótár-validálás valódi termékeken. NEM egységteszt – szándékosan olyan a
 * neve, hogy az `npm test` ne szedje fel. Futtatás:
 *
 *   npx.cmd jest --testMatch "**\/tools\/validate.report.ts"
 *
 * A mérés lényege: kivesszük a termékből az allergén-címkéket, és **csak az
 * összetevő-szövegből**, a szótárral próbáljuk megjósolni, mit mond a címke.
 * Így a címke a viszonyítási alap, a szótár a mérendő.
 *
 * Módszertani fenntartás: az OpenFoodFacts `allergens_tags` mezője részben
 * maga is az összetevő-szövegből származik az OFF saját elemzőjével, nem
 * kizárólag kézi bevitelből. Az egyezés tehát részben azt méri, mennyire
 * értünk egyet az OFF elemzőjével – az eltérések viszont így is informatívak,
 * és a „nem vettem észre" esetek valódi hibákra mutatnak.
 */
import { readFileSync } from 'node:fs';

import { evaluateDiet } from '../lib/diet';
import { KEYWORDS } from '../lib/keywords';
import { DIET_KEYS, DietKey, Product } from '../lib/types';

const SAMPLE_PATH =
  process.env.SAMPLE ??
  'C:\\Users\\rolan\\AppData\\Local\\Temp\\claude\\D--Kl-di-testek\\' +
    'f78a8668-d7fe-4f5c-846c-f4d8bf2ec6f3\\scratchpad\\hu-products.json';

type RawProduct = {
  code?: string;
  product_name?: string;
  product_name_hu?: string;
  brands?: string;
  allergens_tags?: string[];
  traces_tags?: string[];
  ingredients_text?: string;
  ingredients_text_hu?: string;
  ingredients_text_en?: string;
  lang?: string;
};

/** Csak azokat mérjük, amiknek van OFF allergén-címkéjük (a vegán/vegetáriánus nem ilyen). */
const MEASURED: DietKey[] = DIET_KEYS.filter((diet) => KEYWORDS[diet].allergenTags.length > 0);

type Stats = {
  truePositive: number;
  /** Az OFF szerint benne van, mi „óvatosan"-t mondtunk – jeleztünk, csak halkabban. */
  missedWarned: number;
  /** Az OFF szerint benne van, mi „nincs adat"-ot mondtunk – bevallott tudatlanság. */
  missedUnknown: number;
  /** Az OFF szerint benne van, mi „mentes"-t mondtunk – EZ A VESZÉLYES HIBA. */
  missedSafe: number;
  /** Mi jeleztük, az OFF nem – fölösleges riasztás. */
  falseAlarm: number;
  trueNegative: number;
};

function emptyStats(): Stats {
  return {
    truePositive: 0,
    missedWarned: 0,
    missedUnknown: 0,
    missedSafe: 0,
    falseAlarm: 0,
    trueNegative: 0,
  };
}

function ingredientsOf(raw: RawProduct): string {
  return (raw.ingredients_text_hu || raw.ingredients_text || raw.ingredients_text_en || '').trim();
}

/** Ugyanaz a sorrend, mint az appban: magyar → fő nyelv → angol. */
function langOf(raw: RawProduct): string | null {
  if ((raw.ingredients_text_hu ?? '').trim()) return 'hu';
  if ((raw.ingredients_text ?? '').trim()) return raw.lang ?? null;
  if ((raw.ingredients_text_en ?? '').trim()) return 'en';
  return null;
}

/** A címkéktől megfosztott termék: a szótárnak egyedül kell boldogulnia. */
function stripped(raw: RawProduct): Product {
  return {
    code: raw.code ?? '',
    name: raw.product_name_hu ?? raw.product_name ?? null,
    brand: raw.brands ?? null,
    imageUrl: null,
    quantity: null,
    allergenTags: [],
    traceTags: [],
    labelTags: [],
    analysisTags: [],
    ingredientsText: ingredientsOf(raw),
    ingredientsLang: langOf(raw),
    // A szótárat mérjük, nem a fordítót.
    translation: null,
  };
}

function pct(part: number, whole: number): string {
  if (whole === 0) return '   –  ';
  return `${((part / whole) * 100).toFixed(1).padStart(5)}%`;
}

describe('szótár-validálás valódi magyar termékeken', () => {
  it('lefuttatja a mérést és kiírja a jelentést', () => {
    let sample: RawProduct[];
    try {
      sample = JSON.parse(readFileSync(SAMPLE_PATH, 'utf8')) as RawProduct[];
    } catch {
      throw new Error(`Nem találom a mintát: ${SAMPLE_PATH}`);
    }

    const usable = sample.filter(
      (raw) => ingredientsOf(raw).length > 20 && (raw.allergens_tags ?? []).length > 0,
    );

    const stats: Record<string, Stats> = {};
    for (const diet of MEASURED) stats[diet] = emptyStats();

    const misses: { diet: DietKey; name: string; text: string; warned: boolean }[] = [];
    const alarms: { diet: DietKey; name: string; evidence: string[] }[] = [];

    for (const raw of usable) {
      const product = stripped(raw);
      const tags = raw.allergens_tags ?? [];

      for (const diet of MEASURED) {
        const declared = KEYWORDS[diet].allergenTags.some((tag) => tags.includes(tag));
        const finding = evaluateDiet(product, diet);
        const flagged = finding.verdict === 'unsafe';
        const warned = finding.verdict === 'caution';

        if (declared && flagged) stats[diet].truePositive++;
        else if (declared && !flagged) {
          if (warned) stats[diet].missedWarned++;
          else if (finding.verdict === 'unknown') stats[diet].missedUnknown++;
          else stats[diet].missedSafe++;

          if (finding.verdict === 'safe' && misses.length < 400) {
            misses.push({
              diet,
              name: product.name ?? product.code,
              text: (product.ingredientsText ?? '').slice(0, 150),
              warned,
            });
          }
        } else if (!declared && flagged) {
          stats[diet].falseAlarm++;
          if (alarms.length < 400) {
            alarms.push({ diet, name: product.name ?? product.code, evidence: finding.evidence });
          }
        } else stats[diet].trueNegative++;
      }
    }

    const lines: string[] = [];
    lines.push('');
    lines.push('='.repeat(78));
    lines.push(`SZÓTÁR-VALIDÁLÁS — ${usable.length} magyar termék, csak összetevő-szövegből`);
    lines.push('='.repeat(78));
    lines.push('');
    lines.push('szűrő        címkézve  eltalált        óvatos  nincs-adat  TÉVES-MENTES  fölösleges');
    lines.push('-'.repeat(78));

    let totalDeclared = 0;
    let totalHit = 0;
    let totalWarned = 0;
    let totalUnknown = 0;
    let totalSafe = 0;
    let totalAlarm = 0;

    for (const diet of MEASURED) {
      const s = stats[diet];
      const declared = s.truePositive + s.missedWarned + s.missedUnknown + s.missedSafe;
      if (declared === 0 && s.falseAlarm === 0) continue;

      totalDeclared += declared;
      totalHit += s.truePositive;
      totalWarned += s.missedWarned;
      totalUnknown += s.missedUnknown;
      totalSafe += s.missedSafe;
      totalAlarm += s.falseAlarm;

      lines.push(
        `${diet.padEnd(11)} ${String(declared).padStart(8)} ` +
          `${String(s.truePositive).padStart(9)} (${pct(s.truePositive, declared)}) ` +
          `${String(s.missedWarned).padStart(6)} ${String(s.missedUnknown).padStart(11)} ` +
          `${String(s.missedSafe).padStart(13)} ${String(s.falseAlarm).padStart(11)}`,
      );
    }

    lines.push('-'.repeat(78));
    lines.push(
      `ÖSSZESEN    ${String(totalDeclared).padStart(8)} ` +
        `${String(totalHit).padStart(9)} (${pct(totalHit, totalDeclared)}) ` +
        `${String(totalWarned).padStart(6)} ${String(totalUnknown).padStart(11)} ` +
        `${String(totalSafe).padStart(13)} ${String(totalAlarm).padStart(11)}`,
    );
    lines.push('');
    lines.push(
      `TÉVES „MENTES": ${totalSafe} / ${totalDeclared} (${pct(totalSafe, totalDeclared)}) ` +
        `— EZ az egyetlen, ami árthat. A „nincs adat" bevallott tudatlanság, nem tévedés.`,
    );
    lines.push('');

    // A leggyakoribb néma kimaradások – ezekből lehet szótárat javítani.
    const silent = misses.filter((miss) => !miss.warned);
    const byDiet = new Map<DietKey, typeof silent>();
    for (const miss of silent) {
      if (!byDiet.has(miss.diet)) byDiet.set(miss.diet, []);
      byDiet.get(miss.diet)!.push(miss);
    }

    lines.push('PÉLDÁK A NÉMA KIMARADÁSOKRA (szűrőnként max. 5)');
    lines.push('-'.repeat(78));
    for (const [diet, items] of [...byDiet.entries()].sort((a, b) => b[1].length - a[1].length)) {
      lines.push(`\n▸ ${diet} (${items.length} db)`);
      for (const item of items.slice(0, 5)) {
        lines.push(`   ${item.name}`);
        lines.push(`     ${item.text.replace(/\s+/g, ' ')}`);
      }
    }

    lines.push('');
    lines.push('PÉLDÁK A FÖLÖSLEGES RIASZTÁSOKRA (szűrőnként max. 5)');
    lines.push('-'.repeat(78));
    const alarmsByDiet = new Map<DietKey, typeof alarms>();
    for (const alarm of alarms) {
      if (!alarmsByDiet.has(alarm.diet)) alarmsByDiet.set(alarm.diet, []);
      alarmsByDiet.get(alarm.diet)!.push(alarm);
    }
    for (const [diet, items] of [...alarmsByDiet.entries()].sort(
      (a, b) => b[1].length - a[1].length,
    )) {
      lines.push(`\n▸ ${diet} (${items.length} db)`);
      for (const item of items.slice(0, 5)) {
        lines.push(`   ${item.name} — találat: ${item.evidence.join(', ')}`);
      }
    }

    // eslint-disable-next-line no-console
    console.log(lines.join('\n'));
    expect(usable.length).toBeGreaterThan(0);
  });
});
