/**
 * Lefedettség-mérés a magyar boltláncok saját márkáira. NEM egységteszt.
 *
 *   npx.cmd jest --testMatch "**\/tools\/coverage.report.ts"
 *
 * A kérdés itt nem a szótár pontossága, hanem hogy **van-e egyáltalán adat**
 * arról, amit az emberek a kosárba tesznek. Egy bolti appnál ez fontosabb:
 * hiába tökéletes a logika, ha a Pilos joghurt nincs az adatbázisban.
 *
 * Itt a TELJES app-logikát futtatjuk (allergén-címkékkel együtt), mert ez az,
 * amit a felhasználó lát – nem a szótárt izoláljuk, mint a validate jelentésben.
 */
import { readFileSync } from 'node:fs';

import { evaluate, overallVerdict } from '../lib/diet';
import { DEFAULT_PROFILE, Product, Verdict } from '../lib/types';

const SAMPLE_PATH =
  process.env.SAMPLE ??
  'C:\\Users\\rolan\\AppData\\Local\\Temp\\claude\\D--Kl-di-testek\\' +
    'f78a8668-d7fe-4f5c-846c-f4d8bf2ec6f3\\scratchpad\\chain-products.json';

type RawProduct = {
  code?: string;
  product_name?: string;
  product_name_hu?: string;
  brands?: string;
  allergens_tags?: string[];
  traces_tags?: string[];
  labels_tags?: string[];
  ingredients_text?: string;
  ingredients_text_hu?: string;
  ingredients_text_en?: string;
  lang?: string;
  _chain?: string;
};

function ingredientsOf(raw: RawProduct): string {
  return (raw.ingredients_text_hu || raw.ingredients_text || raw.ingredients_text_en || '').trim();
}

function langOf(raw: RawProduct): string | null {
  if ((raw.ingredients_text_hu ?? '').trim()) return 'hu';
  if ((raw.ingredients_text ?? '').trim()) return raw.lang ?? null;
  if ((raw.ingredients_text_en ?? '').trim()) return 'en';
  return null;
}

/** Itt semmit nem veszünk ki – ez az, amit a felhasználó ténylegesen lát. */
function toProduct(raw: RawProduct): Product {
  return {
    code: raw.code ?? '',
    name: raw.product_name_hu ?? raw.product_name ?? null,
    brand: raw.brands ?? null,
    imageUrl: null,
    quantity: null,
    allergenTags: raw.allergens_tags ?? [],
    traceTags: raw.traces_tags ?? [],
    labelTags: raw.labels_tags ?? [],
    analysisTags: [],
    ingredientsText: ingredientsOf(raw) || null,
    ingredientsLang: langOf(raw),
  };
}

function pct(part: number, whole: number): string {
  if (whole === 0) return '   –  ';
  return `${((part / whole) * 100).toFixed(0).padStart(3)}%`;
}

describe('lefedettség a magyar boltláncok saját márkáin', () => {
  it('kiírja, mennyi adat van arról, amit az emberek vesznek', () => {
    const sample = JSON.parse(readFileSync(SAMPLE_PATH, 'utf8')) as RawProduct[];

    type Row = {
      total: number;
      withIngredients: number;
      withAllergenTags: number;
      hungarian: number;
      verdicts: Record<Verdict, number>;
    };
    const emptyRow = (): Row => ({
      total: 0,
      withIngredients: 0,
      withAllergenTags: 0,
      hungarian: 0,
      verdicts: { safe: 0, caution: 0, unknown: 0, unsafe: 0 },
    });

    const chains = new Map<string, Row>();
    const all = emptyRow();

    for (const raw of sample) {
      const chain = raw._chain ?? '(ismeretlen)';
      if (!chains.has(chain)) chains.set(chain, emptyRow());
      const row = chains.get(chain)!;

      const product = toProduct(raw);
      const hasIngredients = (product.ingredientsText ?? '').length > 20;
      const hasTags = product.allergenTags.length > 0;
      const isHungarian = product.ingredientsLang === 'hu';

      // Alapértelmezett profil: glutén + tej.
      const verdict = overallVerdict(evaluate(product, DEFAULT_PROFILE));

      for (const target of [row, all]) {
        target.total++;
        if (hasIngredients) target.withIngredients++;
        if (hasTags) target.withAllergenTags++;
        if (isHungarian) target.hungarian++;
        target.verdicts[verdict]++;
      }
    }

    const lines: string[] = [];
    lines.push('');
    lines.push('='.repeat(76));
    lines.push(`BOLTI LEFEDETTSÉG — ${all.total} saját márkás termék az OpenFoodFactsből`);
    lines.push('='.repeat(76));
    lines.push('');
    lines.push('lánc          db   összetevő  allergéncímke  magyarul   „nincs adat" ítélet');
    lines.push('-'.repeat(76));

    const sorted = [...chains.entries()].sort((a, b) => b[1].total - a[1].total);
    for (const [chain, row] of sorted) {
      lines.push(
        `${chain.padEnd(12)} ${String(row.total).padStart(4)}  ` +
          `${pct(row.withIngredients, row.total)}      ` +
          `${pct(row.withAllergenTags, row.total)}       ` +
          `${pct(row.hungarian, row.total)}     ` +
          `${pct(row.verdicts.unknown, row.total)}`,
      );
    }
    lines.push('-'.repeat(76));
    lines.push(
      `ÖSSZESEN     ${String(all.total).padStart(4)}  ` +
        `${pct(all.withIngredients, all.total)}      ` +
        `${pct(all.withAllergenTags, all.total)}       ` +
        `${pct(all.hungarian, all.total)}     ` +
        `${pct(all.verdicts.unknown, all.total)}`,
    );
    lines.push('');
    lines.push('Mit mondana az app egy véletlen ilyen termékre (glutén + tej szűrővel):');
    lines.push(
      `  „mentes"      ${String(all.verdicts.safe).padStart(4)} (${pct(all.verdicts.safe, all.total)})` +
        `\n  „óvatosan"    ${String(all.verdicts.caution).padStart(4)} (${pct(all.verdicts.caution, all.total)})` +
        `\n  „nem mentes"  ${String(all.verdicts.unsafe).padStart(4)} (${pct(all.verdicts.unsafe, all.total)})` +
        `\n  „nincs adat"  ${String(all.verdicts.unknown).padStart(4)} (${pct(all.verdicts.unknown, all.total)})  ← ennyiszer néma az app`,
    );

    // eslint-disable-next-line no-console
    console.log(lines.join('\n'));
    expect(all.total).toBeGreaterThan(0);
  });
});
