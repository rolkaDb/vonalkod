import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
} from 'react-native';

import { Card } from '../components/Card';
import { PrimaryButton } from '../components/PrimaryButton';
import { inspectBarcode } from '../lib/barcode';
import { colors, fonts, radius, spacing, verdictStyles } from '../lib/theme';

const MESSAGES: Record<string, string> = {
  not_digits: 'A vonalkód csak számjegyekből áll.',
  bad_length: 'A termék-vonalkód 8, 12, 13 vagy 14 számjegy hosszú.',
  bad_checksum: 'Ez a számsor nem áll össze – valószínűleg elgépelés. Nézd meg még egyszer.',
};

export default function ManualScreen() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [touched, setTouched] = useState(false);

  const problem = inspectBarcode(code);
  // Gépelés közben nem pirosítunk – csak ha már elég hosszú, vagy próbálkozott.
  const showProblem = problem !== null && problem !== 'empty' && (touched || code.length >= 8);
  const message = showProblem ? MESSAGES[problem] : null;

  const search = () => {
    setTouched(true);
    // Az ellenőrzőösszeg-hibát figyelmeztetésnek vesszük, nem tiltásnak: ritka,
    // de létező, hogy egy szabálytalan kód is szerepel az adatbázisban.
    if (problem === 'empty' || problem === 'not_digits' || problem === 'bad_length') return;
    router.replace({ pathname: '/product/[code]', params: { code: code.trim() } });
  };

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
          Ha a címke gyűrött, sérült vagy rossz a fény, írd be a vonalkód alatti számsort.
        </Text>

        <Card style={styles.card}>
          <TextInput
            value={code}
            onChangeText={(value) => setCode(value.replace(/[^\d]/g, ''))}
            onBlur={() => setTouched(true)}
            placeholder="5999076610013"
            placeholderTextColor={colors.muted}
            keyboardType="number-pad"
            returnKeyType="search"
            onSubmitEditing={search}
            maxLength={14}
            autoFocus
            style={styles.input}
          />
          {message && <Text style={styles.error}>{message}</Text>}
        </Card>

        <PrimaryButton
          label={problem === 'bad_checksum' ? 'Keresés mégis' : 'Keresés'}
          onPress={search}
        />
        <PrimaryButton label="Mégsem" variant="outline" onPress={() => router.back()} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.lg },
  lead: { fontSize: 15, lineHeight: 22, color: colors.muted },
  card: { gap: spacing.sm },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    fontFamily: fonts.displayMedium,
    fontSize: 24,
    letterSpacing: 2,
    textAlign: 'center',
    color: colors.text,
    backgroundColor: colors.bg,
  },
  error: { fontSize: 13, lineHeight: 19, color: verdictStyles.unsafe.fg },
});
