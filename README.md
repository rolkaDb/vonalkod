# Mentes

A barcode scanner that tells you whether a food product fits your diet. Built for
coeliac disease, lactose intolerance, and the 14 allergens the EU requires to be
declared.

Expo (React Native), Android and iOS. Product data comes from the
[OpenFoodFacts](https://world.openfoodfacts.org/) community database.

> **This is not a medical device.** The community database is incomplete and can
> be out of date. If you have a sensitivity, always read the packaging too.

## What it does

- **Barcode scanning** with the camera, or type the code by hand
- **16 diets**, each switched on separately: the 14 allergens the EU requires to
  be declared, plus vegan and vegetarian
- **Strict mode**: "may contain traces" counts as a block
- **Personal notes**: what you read on the packaging in the shop overrides the
  database
- **Manual ingredients**: if a product is missing from the database, you enter
  the ingredients once and the app remembers it
- **Offline use**: scanned products are cached on the device
- **History and favourites**, with matches highlighted inside the ingredient text
- **OCR**: photograph the ingredient list straight off the packaging
- **Machine translation** for ingredient lists in languages the dictionary does
  not cover

## How it decides

This is the important part, and it is deliberately conservative.

### Four verdicts

| | Meaning |
|---|---|
| `safe` | According to the data, it is not in there |
| `caution` | May contain traces, or an uncertain ingredient (oats, for example) |
| `unknown` | **Not enough data.** This is NOT the same as "free from" |
| `unsafe` | It contains it |

In the severity ranking, **`unknown` is worse than `caution`**: on a sensitive
diet, "we do not know" is more dangerous than a declared trace amount.

Strict mode turns `caution` into `unsafe`, but it leaves `unknown` alone. Missing
data stays missing data; it does not become a fact.

### The order of the decision

1. **Manufacturer's free-from label**: the strongest signal, it overrides
   everything
2. **Vegan / vegetarian**: OpenFoodFacts' own classification
3. **Declared allergen or unambiguous ingredient** → `unsafe`
4. **Traces, or an uncertain ingredient** → `caution`
5. **No ingredient data at all** → `unknown`
6. **There is text, but we do not understand the language** → `unknown`
7. **We understand it and found nothing** → `safe`

Step 6 is the point of the whole thing: if we do not understand the language, we
**do not say it is free from**. Our silence is not evidence, only incomprehension.

### Where a verdict comes from

Every finding carries a `source` field (`data`, `note` or `translation`), and
that stays visible throughout the interface. The difference between data and
assumption has to be obvious at a glance, otherwise months later the user is
reading their own guess as if it were fact.

### Negation handling

"Gluténmentes", "sans gluten" and "glutenfrei" cancel out the keyword they
follow. Without this, the app would state the exact opposite of what is printed
on the packaging.

The dictionary recognises ingredients in 14 languages (hu, en, de, fr, pl, ro,
it, cs, sk, hr, sr, sl, bs, es). Measurement showed that for a large share of
products on Hungarian shelves, the OpenFoodFacts text is not in Hungarian.

## Measuring it

The dictionary is measured against real products, not only unit-tested. Two
reports live under `tools/`:

```bash
npx jest --testMatch "**/tools/validate.report.ts"   # accuracy of the dictionary
npx jest --testMatch "**/tools/coverage.report.ts"   # is there any data at all
```

The `validate` report isolates the dictionary: it strips the allergen labels out
of a product and tries to decide from the ingredient text alone. The only truly
harmful error is a **false "free from"**. A "no data" is admitted ignorance, not
a mistake.

Measuring this way surfaced defects that reasoning about the code would never
have revealed. One example: the Hungarian word for carbon dioxide
("szén-dioxid") contains the Hungarian word for nut ("dió"), so the app was
flagging fizzy drinks as containing nuts. Every defect the measurement found
became a regression test.

## Running it

```bash
npm install
npx expo start
```

Scan the QR code with Expo Go on your phone. The computer and the phone have to
be on the same Wi-Fi network.

### Environment variables

Create a `.env.local` file in the project root:

```
EXPO_PUBLIC_OCR_API_KEY=...
EXPO_PUBLIC_N8N_URL=http://192.168.x.x:5678/webhook/osszetevok
```

Both are optional. Variables prefixed with `EXPO_PUBLIC_` are **compiled into the
client**, so they are not secrets. For a real release, OCR should move to
on-device recognition (ML Kit) or behind a proxy of your own.

If `EXPO_PUBLIC_N8N_URL` is missing, machine translation is simply skipped.

## Machine translation

When the ingredient text is in a language the dictionary does not cover, the app
calls an [n8n](https://n8n.io/) workflow that translates it into Hungarian.

**The AI only translates.** The verdict is still produced by the deterministic
keyword engine, running on the translated text. This is not a stylistic choice:
it means an attack planted in a prompt cannot produce a false "free from"
verdict. Translated or not, the attacker's sentence is still just text, and the
code makes the decision. A test guards this.

What we deliberately do **not** do: if there is no ingredient data at all, we do
not guess from the product name. That would be exactly the kind of hallucination
this app is built against.

The workflow expects `{ code, lang, ingredientsText }` as JSON on its `webhook`
endpoint and answers with `{ ok, translatedText, translatedTraces }`. It lives in
[rolkaDb/klodi-testek](https://github.com/rolkaDb/klodi-testek).

## Tests

```bash
npm test          # 202 unit tests
npm run typecheck
```

## Layout

```
app/          screens (Expo Router)
components/   presentational components
lib/
  diet.ts        the decision logic
  keywords.ts    the dictionary, for 16 diets
  text.ts        tokenisation, accent normalisation
  openfoodfacts.ts
  translate.ts   n8n client for machine translation
  cache.ts       offline cache
tools/        measurement reports against real products
```

## Known limitations

- "Non-dairy creamer" raises a flag, because negation only cancels the word
  immediately after it. This is deliberate: a needless warning is acceptable, a
  missed one is not.
- The tokeniser does not see ingredient lists in non-Latin scripts (Cyrillic,
  Greek, Hebrew, Arabic). Those get `unknown`, even without translation.
- A large share of supermarket own-brand products is missing from OpenFoodFacts.
  Personal notes and manually entered ingredients cover those cases.

---

*A magyar nyelvű változat: [README.hu.md](README.hu.md)*
