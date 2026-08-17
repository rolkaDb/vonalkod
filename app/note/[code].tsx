import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Card } from '../../components/Card';
import { PrimaryButton } from '../../components/PrimaryButton';
import { Segmented, SegmentedOption } from '../../components/Segmented';
import { DIET_LABEL } from '../../lib/keywords';
import { useLibrary } from '../../lib/library';
import { emptyNote, NoteVerdict, ProductNote } from '../../lib/notes';
import { colors, fonts, radius, spacing, verdictStyles } from '../../lib/theme';
import { DIET_KEYS } from '../../lib/types';

const OPTIONS: SegmentedOption<NoteVerdict>[] = [
  { value: 'safe', label: 'Mentes', activeColor: verdictStyles.safe.fg },
  { value: 'unsafe', label: 'Tartalmazza', activeColor: verdictStyles.unsafe.fg },
  { value: 'unset', label: 'Nem tudom' },
];

export default function NoteScreen() {
  const params = useLocalSearchParams<{ code: string | string[]; name?: string | string[] }>();
  const code = Array.isArray(params.code) ? params.code[0] : params.code;
  const suggestedName = Array.isArray(params.name) ? params.name[0] : params.name;

  const router = useRouter();
  const { notes, saveNote, removeNote } = useLibrary();

  // Csak kezdőértéknek olvassuk ki: innentől az űrlap a saját állapotát viszi,
  // különben mentés után visszaírná, amit a felhasználó épp gépel.
  const [draft, setDraft] = useState<ProductNote>(
    () => notes[code] ?? emptyNote(code, suggestedName ?? ''),
  );

  const existing = notes[code] !== undefined;

  const setDiet = (diet: (typeof DIET_KEYS)[number], value: NoteVerdict) => {
    setDraft((current) => ({ ...current, diets: { ...current.diets, [diet]: value } }));
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
          Ha az adatbázis nem ismeri a terméket, olvasd el egyszer a csomagolást, és jegyezd fel ide.
          Legközelebb már ezt fogja mutatni — a saját jegyzeted mindig erősebb az adatbázisnál.
        </Text>

        <Card style={styles.card}>
          <Text style={styles.fieldLabel}>Termék neve</Text>
          <TextInput
            value={draft.name}
            onChangeText={(name) => setDraft((current) => ({ ...current, name }))}
            placeholder="pl. Reese's Peanut Butter Cups"
            placeholderTextColor={colors.muted}
            style={styles.input}
          />
          <Text style={styles.code}>{code}</Text>
        </Card>

        {DIET_KEYS.map((diet) => (
          <Card key={diet} style={styles.card}>
            <Text style={styles.fieldLabel}>
              {DIET_LABEL[diet].emoji}  {DIET_LABEL[diet].name}
            </Text>
            <Segmented
              options={OPTIONS}
              value={draft.diets[diet]}
              onChange={(value) => setDiet(diet, value)}
            />
          </Card>
        ))}

        <Card style={styles.card}>
          <Text style={styles.fieldLabel}>Megjegyzés</Text>
          <TextInput
            value={draft.comment}
            onChangeText={(comment) => setDraft((current) => ({ ...current, comment }))}
            placeholder="pl. a csomagoláson: „may contain milk”"
            placeholderTextColor={colors.muted}
            style={[styles.input, styles.multiline]}
            multiline
          />
        </Card>

        <PrimaryButton
          label="Jegyzet mentése"
          onPress={() => {
            saveNote(draft);
            router.back();
          }}
        />

        {existing && (
          <PrimaryButton
            label="Jegyzet törlése"
            variant="outline"
            onPress={() => {
              removeNote(code);
              router.back();
            }}
          />
        )}

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
  card: { gap: spacing.md },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: colors.muted, letterSpacing: 0.6 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.bg,
  },
  multiline: { minHeight: 90, textAlignVertical: 'top' },
  code: { fontFamily: fonts.displayMedium, fontSize: 15, color: colors.muted, letterSpacing: 1.2 },
  spacer: { height: spacing.xxl },
});
