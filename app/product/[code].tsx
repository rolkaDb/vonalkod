import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Card } from '../../components/Card';
import { Disclaimer } from '../../components/Disclaimer';
import { FindingRow } from '../../components/FindingRow';
import { IngredientsText } from '../../components/IngredientsText';
import { MarkRow } from '../../components/MarkRow';
import { PrimaryButton } from '../../components/PrimaryButton';
import { VerdictCard } from '../../components/VerdictCard';
import {
  effectiveProduct,
  evaluateWithNote,
  hasOwnFinding,
  overallVerdict,
  verdictMap,
} from '../../lib/diet';
import { kindOf } from '../../lib/favorites';
import { playFeedback } from '../../lib/feedback';
import { formatScanDate } from '../../lib/format';
import { Highlight } from '../../lib/highlight';
import { DIET_LABEL } from '../../lib/keywords';
import { useLibrary } from '../../lib/library';
import { hasVerdict } from '../../lib/notes';
import { fetchProduct } from '../../lib/openfoodfacts';
import { useProfile } from '../../lib/profile';
import { colors, fonts, radius, spacing, verdictStyles } from '../../lib/theme';
import { Finding, Product, Verdict } from '../../lib/types';

type State =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'found'; product: Product; offline: boolean; fetchedAt: string }
  | { kind: 'not_found'; offline: boolean; fetchedAt: string };

function summarize(findings: Finding[], overall: Verdict): string {
  // Csak azokat soroljuk fel, amik ténylegesen kiváltották az összesített ítéletet.
  const decisive = findings.filter((finding) => finding.verdict === overall);
  const names = decisive.map((finding) => DIET_LABEL[finding.diet].name).join(' és ');

  // Ha az ítéletet a saját jegyzet hozta, azt ki kell mondani: a felhasználó
  // saját feltételezése nem keveredhet össze az adatbázis állításával.
  const own = decisive.length > 0 && decisive.every((finding) => finding.source === 'note');
  const from = own ? ' – a saját jegyzeted alapján' : '';

  switch (overall) {
    case 'unsafe':
      return `${names} szempontjából nem megfelelő${from}.`;
    case 'unknown':
      return `${names}: ehhez a termékhez nincs elég adat.`;
    case 'caution':
      return `${names} szempontjából érdemes a csomagolást is megnézni${from}.`;
    case 'safe':
      return `${names} szempontjából rendben${from}.`;
  }
}

/** A „Ma"/„Tegnap" ragozható, a dátum nem – ezért külön ág mindegyiknek. */
function offlineNote(fetchedAt: string): string {
  const lead = 'Most nem értük el az adatbázist, ezért';
  const when = formatScanDate(fetchedAt);

  if (when === 'Ma') return `${lead} a ma mentett adatot mutatjuk.`;
  if (when === 'Tegnap') return `${lead} a tegnap mentett adatot mutatjuk.`;
  if (when) return `${lead} a korábbi mentést mutatjuk (${when}).`;
  return `${lead} a korábbi mentést mutatjuk.`;
}

export default function ProductScreen() {
  const params = useLocalSearchParams<{ code: string | string[] }>();
  const code = Array.isArray(params.code) ? params.code[0] : params.code;
  const router = useRouter();
  const { profile } = useProfile();
  const { notes, favorites, recordScan, toggleMark, ready, getCached, putCached } = useLibrary();
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [attempt, setAttempt] = useState(0);
  /** A hálózati kör lezárult – a gyorsítótárból villantott állapot még nem az. */
  const [settled, setSettled] = useState(false);

  const note = notes[code] ?? null;

  useEffect(() => {
    // A mentést meg kell várni, különben gyenge térerőn hibát mutatnánk olyan
    // termékre, ami valójában ott van a gyorsítótárban.
    if (!code || !ready) return;

    let active = true;
    setSettled(false);
    const cached = getCached(code);

    // Ha van mentésünk, azonnal megjelenítjük, és a háttérben frissítünk.
    if (cached) {
      setState(
        cached.status === 'found'
          ? { kind: 'found', product: cached.product, offline: false, fetchedAt: cached.fetchedAt }
          : { kind: 'not_found', offline: false, fetchedAt: cached.fetchedAt },
      );
    } else {
      setState({ kind: 'loading' });
    }

    fetchProduct(code).then((result) => {
      if (!active) return;
      setSettled(true);
      const now = new Date().toISOString();

      if (result.status === 'found') {
        setState({ kind: 'found', product: result.product, offline: false, fetchedAt: now });
        putCached(code, { status: 'found', product: result.product, fetchedAt: now });
        return;
      }

      if (result.status === 'not_found') {
        setState({ kind: 'not_found', offline: false, fetchedAt: now });
        putCached(code, { status: 'not_found', fetchedAt: now });
        return;
      }

      // Hálózati hiba. Ha van mentésünk, az marad a képernyőn – csak megjelöljük,
      // hogy nem sikerült frissíteni. Hibaüzenetet csak akkor mutatunk, ha
      // tényleg nincs mit mutatnunk helyette.
      if (cached) {
        setState((current) =>
          current.kind === 'found' || current.kind === 'not_found'
            ? { ...current, offline: true }
            : current,
        );
      } else {
        setState({ kind: 'error', message: result.message });
      }
    });

    return () => {
      active = false;
    };
  }, [code, attempt, ready, getCached, putCached]);

  const product = state.kind === 'found' ? state.product : null;
  const resolved = state.kind === 'found' || state.kind === 'not_found';
  const findings = resolved ? evaluateWithNote(product, note, profile) : [];
  const overall = overallVerdict(findings);

  // Az előzménybe csak lezárult lekérdezést írunk – hálózati hibát nem.
  // A jegyzet változására szándékosan újra lefut: így a mentett ítélet frissül.
  useEffect(() => {
    if (!resolved) return;
    recordScan({
      code,
      name: note?.name.trim() || product?.name || null,
      brand: product?.brand ?? null,
      imageUrl: product?.imageUrl ?? null,
      verdict: overall,
      verdicts: verdictMap(findings),
      scannedAt: new Date().toISOString(),
    });
    // A `recordScan` és az `overall` szándékosan nincs a függőségek között:
    // az előbbi állandó identitású, az utóbbi a felsoroltakból származik.
  }, [resolved, code, note, profile, product]);

  // Rezgés (és opcionálisan hang) az ítéletről – kódonként pontosan egyszer.
  // Szándékosan a hálózati kör lezárultára várunk: a gyorsítótárból villantott
  // ítélet még módosulhat, és egy téves „mentes" rezgés rosszabb a semminél.
  const buzzedForRef = useRef<string | null>(null);
  useEffect(() => {
    if (!settled || !resolved) return;
    if (buzzedForRef.current === code) return;
    buzzedForRef.current = code;
    void playFeedback(overall, profile.speak);
  }, [settled, resolved, code, overall, profile.speak]);

  const scanAgain = useCallback(() => router.back(), [router]);
  const openNote = useCallback(() => {
    router.push({
      pathname: '/note/[code]',
      params: { code, name: note?.name || product?.name || '' },
    });
  }, [router, code, note, product]);

  if (state.kind === 'loading') {
    return (
      <View style={styles.centered}>
        <StatusBar style="dark" />
        <ActivityIndicator color={colors.accent} />
        <Text style={styles.centeredNote}>Keresés az adatbázisban…</Text>
        <Text style={styles.code}>{code}</Text>
      </View>
    );
  }

  if (state.kind === 'error') {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <StatusBar style="dark" />
        <VerdictCard verdict="unknown" subtitle={state.message} />
        <Card style={styles.gap}>
          <Text style={styles.sectionTitle}>VONALKÓD</Text>
          <Text style={styles.code}>{code}</Text>
        </Card>
        <PrimaryButton label="Újrapróbálom" onPress={() => setAttempt((value) => value + 1)} />
        <PrimaryButton label="Saját jegyzet hozzáadása" variant="outline" onPress={openNote} />
        <PrimaryButton label="Új szkennelés" variant="outline" onPress={scanAgain} />
        <Disclaimer />
      </ScrollView>
    );
  }

  const missing = state.kind === 'not_found';
  const hasOwnVerdict = hasVerdict(note);
  const emphasiseNote = missing && !hasOwnVerdict;

  const subtitle =
    findings.length === 0
      ? 'Nincs bekapcsolt szűrő – kapcsolj be legalább egyet a Szűrők alatt.'
      : missing && !hasOwnVerdict
        ? 'Ez a termék nincs az adatbázisban.'
        : summarize(findings, overall);

  const title = note?.name.trim() || product?.name || 'Névtelen termék';
  const meta = [product?.brand, product?.quantity].filter(Boolean).join(' · ') || code;

  // Az adatbázis rekordja + amit a felhasználó a csomagolásról beírt.
  const effective = effectiveProduct(product, note);
  const ownIngredients = (note?.ingredients ?? '').trim().length > 0;
  const noIngredients = (effective?.ingredientsText ?? '').trim().length === 0;

  // Minden találat helye az összetevő-szövegben, a saját ítéletének színével.
  const highlights: Highlight[] = findings.flatMap((finding) =>
    finding.spans.map((span) => ({
      start: span.start,
      end: span.end,
      verdict: finding.verdict,
    })),
  );

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <StatusBar style="dark" />

      {state.offline && (
        <View style={styles.offline}>
          <Text style={styles.offlineText}>{offlineNote(state.fetchedAt)}</Text>
        </View>
      )}

      <View style={styles.productHeader}>
        {product?.imageUrl ? (
          <Image source={{ uri: product.imageUrl }} style={styles.thumb} resizeMode="contain" />
        ) : (
          <View style={[styles.thumb, styles.thumbEmpty]}>
            <Text style={styles.thumbEmptyText}>?</Text>
          </View>
        )}
        <View style={styles.productMeta}>
          <Text style={styles.productName}>{title}</Text>
          <Text style={styles.productSub}>{meta}</Text>
        </View>
      </View>

      <VerdictCard verdict={overall} subtitle={subtitle} fromNote={hasOwnFinding(findings)} />

      <MarkRow
        current={kindOf(favorites, code)}
        onToggle={(kind) =>
          toggleMark(
            {
              code,
              name: note?.name.trim() || product?.name || null,
              brand: product?.brand ?? null,
              imageUrl: product?.imageUrl ?? null,
              verdict: overall,
              scannedAt: new Date().toISOString(),
            },
            kind,
          )
        }
      />

      {findings.length > 0 && (
        <Card style={styles.findings}>
          {findings.map((finding, index) => (
            <View key={finding.diet}>
              {index > 0 && <View style={styles.divider} />}
              <FindingRow finding={finding} />
            </View>
          ))}
        </Card>
      )}

      {note && note.comment.trim().length > 0 && (
        <Card style={styles.gap}>
          <Text style={styles.sectionTitle}>SAJÁT JEGYZETED</Text>
          <Text style={styles.body}>{note.comment}</Text>
        </Card>
      )}

      {noIngredients && (
        <Card style={styles.gap}>
          <Text style={styles.body}>
            Az OpenFoodFactsbe a felhasználók viszik fel a termékeket, és a bolti saját márkák
            nagy része hiányzik belőle. A csomagoláson viszont törvény szerint ott a magyar
            összetevőlista — írd be egyszer, és az app ugyanúgy dönteni tud róla, mint bármelyik
            adatbázisban lévő termékről. Legközelebb már emlékezni fog rá.
          </Text>
        </Card>
      )}

      {effective?.ingredientsText && (
        <Card style={styles.gap}>
          <Text style={styles.sectionTitle}>
            {ownIngredients ? 'ÖSSZETEVŐK — RÉSZBEN ÁLTALAD BEÍRVA' : 'ÖSSZETEVŐK'}
          </Text>
          <IngredientsText text={effective.ingredientsText} highlights={highlights} />
        </Card>
      )}

      <PrimaryButton
        label={ownIngredients ? 'Beírt összetevők szerkesztése' : 'Összetevők beírása'}
        variant={noIngredients ? 'solid' : 'outline'}
        onPress={() =>
          router.push({ pathname: '/ingredients/[code]', params: { code } })
        }
      />

      <PrimaryButton
        label={note ? 'Saját jegyzet szerkesztése' : 'Saját jegyzet hozzáadása'}
        variant="outline"
        onPress={openNote}
      />
      <PrimaryButton
        label="Megosztás"
        variant="outline"
        onPress={() => {
          void Share.share({
            message: [
              `${title} — ${verdictStyles[overall].title}`,
              subtitle,
              ...findings.map(
                (finding) => `• ${DIET_LABEL[finding.diet].name}: ${verdictStyles[finding.verdict].title}`,
              ),
              `Vonalkód: ${code}`,
              '',
              'Az adatok az OpenFoodFacts közösségi adatbázisából származnak, ezért lehetnek hiányosak. Érzékenység esetén ellenőrizd a csomagolást is. (Mentes app)',
            ].join('\n'),
          });
        }}
      />
      <PrimaryButton
        label="Új szkennelés"
        variant={emphasiseNote ? 'outline' : 'solid'}
        onPress={scanAgain}
      />
      <Disclaimer />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  centered: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  centeredNote: { fontSize: 15, color: colors.muted },

  offline: {
    backgroundColor: colors.bgDeep,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  offlineText: { fontSize: 13, lineHeight: 19, color: colors.muted },

  productHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: radius.md,
    backgroundColor: colors.bgDeep,
  },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  thumbEmptyText: { fontSize: 26, color: colors.muted, fontWeight: '700' },
  productMeta: { flex: 1, gap: 2 },
  productName: { fontFamily: fonts.displayMedium, fontSize: 21, color: colors.text },
  productSub: { fontSize: 14, color: colors.muted },

  findings: { gap: spacing.md },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  gap: { gap: spacing.sm },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.muted, letterSpacing: 0.6 },
  body: { fontSize: 14, lineHeight: 21, color: colors.text },
  code: { fontSize: 16, color: colors.text, letterSpacing: 1.5 },
});
