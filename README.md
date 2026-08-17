# Mentes

Vonalkód-olvasó app, ami megmondja, hogy egy élelmiszer megfelel-e a beállított
étrendednek. Gluténérzékenységre, laktózintoleranciára és további 14 allergénre.

Expo (React Native), Android és iOS. Az adatok az
[OpenFoodFacts](https://world.openfoodfacts.org/) közösségi adatbázisából jönnek.

> **Ez nem orvosi eszköz.** A közösségi adatbázis hiányos és elavulhat.
> Érzékenység esetén mindig olvasd el a csomagolást is.

## Mit tud

- **Vonalkód-beolvasás** kamerával, vagy kézi beírás
- **16 étrend** külön kapcsolható: a 14 EU-ban kötelezően jelölt allergén,
  plusz vegán és vegetáriánus
- **Szigorú mód**: a „nyomokban tartalmazhatja" is tiltásnak számít
- **Saját jegyzet**: amit a polc előtt elolvastál a csomagolásról, felülírja
  az adatbázist
- **Összetevők beírása**: ha a termék nincs felvive, egyszer beírod, és az app
  onnantól emlékszik rá
- **Offline működés**: a beolvasott termékek gyorsítótárba kerülnek
- **Előzmények és kedvencek**, kiemelt találatokkal az összetevő-szövegben
- **OCR**: az összetevőlista lefotózható a csomagolásról
- **Gépi fordítás** olyan nyelvű összetevőlistákhoz, amiket a szótár nem ismer

## Hogyan dönt

Ez a legfontosabb rész, és szándékosan konzervatív.

### Négy ítélet

| | Jelentés |
|---|---|
| `safe` | Az adatok szerint nincs benne |
| `caution` | Nyomokban tartalmazhatja, vagy bizonytalan összetevő (pl. zab) |
| `unknown` | **Nincs elég adat.** Ez NEM azonos a „mentes"-sel |
| `unsafe` | Tartalmazza |

A súlyossági rangsorban az **`unknown` rosszabb, mint a `caution`**: érzékeny
étrendnél a „nem tudjuk" veszélyesebb, mint egy jelölt, nyomnyi mennyiség.

A szigorú mód a `caution`-ből `unsafe`-et csinál, de az `unknown`-t nem bántja —
az adathiány továbbra is adathiány, nem tény.

### A döntés sorrendje

1. **Gyártói mentes-címke** — a legerősebb jel, mindent felülír
2. **Vegán/vegetáriánus**: az OpenFoodFacts saját besorolása
3. **Deklarált allergén vagy egyértelmű összetevő** → `unsafe`
4. **Nyomokban, vagy bizonytalan összetevő** → `caution`
5. **Nincs összetevő-adat** → `unknown`
6. **Van szöveg, de nem értjük a nyelvét** → `unknown`
7. **Értjük, és nem találtunk semmit** → `safe`

A 6-os pont a lényeg: ha nem értjük a nyelvet, **nem mondunk mentes-t**.
A hallgatásunk nem bizonyíték, csak értetlenség.

### Honnan jön az ítélet

Minden megállapítás visz magával egy `source` mezőt — `data`, `note` vagy
`translation` —, és ez végig látszik a felületen is. Adat és feltételezés között
egy pillantásból látszania kell a különbségnek, különben hónapokkal később a
felhasználó a saját tippjét nézi tényadatnak.

### Tagadás-felismerés

A „gluténmentes", „sans gluten", „glutenfrei" alakok kioltják a kulcsszót.
Enélkül épp az ellenkezőjét állítanánk annak, ami a csomagoláson van.

A szótár 14 nyelven ismer összetevőket (hu, en, de, fr, pl, ro, it, cs, sk, hr,
sr, sl, bs, es) — mérés szerint a magyar polcon lévő termékek jelentős részénél
az OpenFoodFactsben nem magyarul van a szöveg.

## Indítás

```bash
npm install
npx expo start
```

Telefonon az Expo Go alkalmazással olvasd be a QR-kódot. A gépnek és a telefonnak
ugyanazon a Wi-Fi-n kell lennie.

### Környezeti változók

Hozz létre egy `.env.local` fájlt a projekt gyökerében:

```
EXPO_PUBLIC_OCR_API_KEY=...
EXPO_PUBLIC_N8N_URL=http://192.168.x.x:5678/webhook/osszetevok
```

Mindkettő opcionális. Az `EXPO_PUBLIC_` előtagú változók **befordulnak a
kliensbe**, tehát nem titkok — éles kiadásnál az OCR-t eszközön futó
felismerésre (ML Kit) vagy saját proxyra kell cserélni.

Ha az `EXPO_PUBLIC_N8N_URL` hiányzik, a gépi fordítás egyszerűen kimarad.

## Gépi fordítás

Ha az összetevő-szöveg olyan nyelven van, amit a szótár nem ismer, az app egy
[n8n](https://n8n.io/) workflow-t hív, ami lefordítja magyarra.

**Az AI csak fordít.** Az ítéletet továbbra is a determinisztikus kulcsszó-motor
hozza a lefordított szövegen. Ez nem stiláris döntés: így egy promptba ültetett
támadás sem tud hamis „mentes" ítéletet előállítani — a támadó mondat lefordítva
is csak szöveg marad, a döntést a kód hozza. Teszt őrzi.

Amit **nem** csinálunk: ha egyáltalán nincs összetevő-adat, nem tippelünk a
terméknévből. Az pontosan az a hallucináció lenne, ami ellen az app épül.

A workflow a `webhook` végponton `{ code, lang, ingredientsText }` JSON-t vár,
és `{ ok, translatedText, translatedTraces }` választ ad.

## Tesztek

```bash
npm test          # 202 egységteszt
npm run typecheck
```

A `tools/` alatt két riport fut valódi termékeken (nem egységtesztek, ezért van
`.report.ts` végződésük):

```bash
npx jest --testMatch "**/tools/validate.report.ts"   # a szótár pontossága
npx jest --testMatch "**/tools/coverage.report.ts"   # van-e egyáltalán adat
```

A `validate` riport a szótárat izolálja: kiveszi a termékből az allergén-címkéket,
és csak az összetevő-szövegből próbál dönteni. Az egyetlen igazán káros hiba a
**téves „mentes"** — a „nincs adat" bevallott tudatlanság, nem tévedés.

## Felépítés

```
app/          képernyők (Expo Router)
components/   megjelenítő elemek
lib/
  diet.ts        a döntési logika
  keywords.ts    a szótár, 16 étrendhez
  text.ts        tokenizálás, ékezet-normalizálás
  openfoodfacts.ts
  translate.ts   n8n kliens a gépi fordításhoz
  cache.ts       offline gyorsítótár
tools/        mérőriportok valódi termékeken
```

## Ismert korlátok

- A „non-dairy creamer" riaszt, mert a tagadás csak a közvetlenül utána álló
  szót oltja ki. Ez tudatos: fölösleges riasztás vállalható, elmulasztott nem.
- Nem latin írású (cirill, görög, héber, arab) összetevőlistákat a tokenizáló
  nem lát — ezekre `unknown` jár, fordítás nélkül is.
- A bolti saját márkák jelentős része nincs felvive az OpenFoodFactsbe.
  Ilyenkor a saját jegyzet és a beírt összetevők segítenek.
