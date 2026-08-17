import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Card } from '../../components/Card';
import { FindingRow } from '../../components/FindingRow';
import { IngredientsText } from '../../components/IngredientsText';
import { PrimaryButton } from '../../components/PrimaryButton';
import { VerdictCard } from '../../components/VerdictCard';
import { effectiveProduct, evaluateWithNote, overallVerdict } from '../../lib/diet';
import { Highlight } from '../../lib/highlight';
import { useLibrary } from '../../lib/library';
import { emptyNote } from '../../lib/notes';
import { isOcrAvailable, recognizeText } from '../../lib/ocr';
import { useProfile } from '../../lib/profile';
import { colors, radius, spacing, verdictStyles } from '../../lib/theme';

export default function IngredientsScreen() {
  const params = useLocalSearchParams<{ code: string | string[] }>();
  const code = Array.isArray(params.code) ? params.code[0] : params.code;
  const router = useRouter();
  const { profile } = useProfile();
  const { notes, saveNote, getCached } = useLibrary();

  const note = notes[code] ?? null;
  const [text, setText] = useState(note?.ingredients ?? '');
  const [scanning, setScanning] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);

  /**
   * A felismert szöveget **hozzáfűzzük**, nem lecseréljük: hosszú összetevőlista
   * gyakran körbeér a csomagoláson, és két-három fotóból áll össze.
   */
  const takePhoto = async () => {
    setOcrError(null);

    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setOcrError('A fényképezéshez engedély kell a kamerához.');
      return;
    }

    const shot = await ImagePicker.launchCameraAsync({
      // A vágás sokat javít a felismerésen: csak az összetevőlista maradjon a képen.
      allowsEditing: true,
      quality: 0.8,
    });
    if (shot.canceled || shot.assets.length === 0) return;

    setScanning(true);
    const result = await recognizeText(shot.assets[0].uri);
    setScanning(false);

    if (result.status === 'ok') {
      setText((current) => (current.trim().length > 0 ? `${current.trim()} ${result.text}` : result.text));
      return;
    }
    if (result.status === 'empty') {
      setOcrError('Nem találtam szöveget a képen. Próbáld közelebbről, jó fényben.');
      return;
    }
    if (result.status === 'unavailable') {
      setOcrError('A szövegfelismerés ebben a változatban nem érhető el.');
      return;
    }
    setOcrError(result.message);
  };

  // Az adatbázis rekordja, ha van – a beírt szöveg kiegészíti, nem helyettesíti.
  const cached = getCached(code);
  const product = cached?.status === 'found' ? cached.product : null;

  // Élő kiértékelés gépelés közben: a logika tiszta függvény, elég gyors hozzá.
  const { findings, overall, preview } = useMemo(() => {
    const draft = { ...(note ?? emptyNote(code)), ingredients: text };
    const result = evaluateWithNote(product, draft, profile);
    return {
      findings: result,
      overall: overallVerdict(result),
      preview: effectiveProduct(product, draft)?.ingredientsText ?? '',
    };
  }, [text, note, code, product, profile]);

  const highlights: Highlight[] = findings.flatMap((finding) =>
    finding.spans.map((span) => ({
      start: span.start,
      end: span.end,
      verdict: finding.verdict,
    })),
  );

  const hasText = text.trim().length > 0;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <StatusBar style="dark" />

        <Text style={styles.lead}>
          Fényképezd le az összetevőlistát, vagy írd be kézzel. A vágásnál hagyd rajta csak a
          listát — így pontosabb a felismerés. Hosszú listát több képből is összerakhatsz.
        </Text>

        {isOcrAvailable() && (
          <>
            <PrimaryButton
              label={scanning ? 'Felismerés…' : '📷  Összetevőlista fényképezése'}
              onPress={() => void takePhoto()}
            />
            {scanning && (
              <View style={styles.scanning}>
                <ActivityIndicator color={colors.accent} />
                <Text style={styles.scanningText}>A kép feldolgozása folyik…</Text>
              </View>
            )}
            {ocrError && <Text style={styles.error}>{ocrError}</Text>}
          </>
        )}

        <Card style={styles.card}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="búzaliszt, cukor, napraforgóolaj, sovány tejpor, só…"
            placeholderTextColor={colors.muted}
            style={styles.input}
            multiline
            autoFocus
            autoCorrect={false}
          />
        </Card>

        {hasText && (
          <>
            <VerdictCard verdict={overall} subtitle="A beírt összetevők alapján." fromNote />

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

            <Card style={styles.gap}>
              <Text style={styles.sectionTitle}>AMIT TALÁLTUNK A SZÖVEGBEN</Text>
              <IngredientsText text={preview} highlights={highlights} />
            </Card>
          </>
        )}

        <PrimaryButton
          label="Mentés ehhez a termékhez"
          onPress={() => {
            saveNote({ ...(note ?? emptyNote(code)), ingredients: text });
            router.back();
          }}
        />
        <PrimaryButton label="Mégsem" variant="outline" onPress={() => router.back()} />

        <Text style={styles.footer}>
          A szöveg és az ítélet a telefonodon marad.{' '}
          <Text style={styles.footerStrong}>A fényképfelismerés hibázhat</Text> — gyűrött vagy
          fényes címkén szavakat ronthat el, ezért mindig fusd át a felismert szöveget, mielőtt
          mentenél. A feldolgozáshoz a kép egy külső szolgáltatóhoz kerül; nem tároljuk, és nincs
          rajta személyes adat.
        </Text>
        <View style={styles.spacer} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.lg },
  lead: { fontSize: 14, lineHeight: 21, color: colors.muted },
  card: { gap: spacing.sm },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    minHeight: 130,
    fontSize: 15,
    lineHeight: 22,
    color: colors.text,
    backgroundColor: colors.bg,
    textAlignVertical: 'top',
  },
  findings: { gap: spacing.md },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  gap: { gap: spacing.sm },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.muted, letterSpacing: 0.6 },
  scanning: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  scanningText: { fontSize: 14, color: colors.muted },
  error: { fontSize: 13, lineHeight: 19, color: verdictStyles.unsafe.fg },
  footer: { fontSize: 12, lineHeight: 18, color: colors.muted },
  footerStrong: { fontWeight: '700', color: colors.text },
  spacer: { height: spacing.xxl },
});
