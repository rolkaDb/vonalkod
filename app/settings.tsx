import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { Card } from '../components/Card';
import { Disclaimer } from '../components/Disclaimer';
import { DIET_LABEL, DietGroup } from '../lib/keywords';
import { useProfile } from '../lib/profile';
import { colors, fonts, radius, spacing } from '../lib/theme';
import { DIET_KEYS, DietKey } from '../lib/types';

const GROUPS: { key: DietGroup; title: string; note: string }[] = [
  {
    key: 'common',
    title: 'A leggyakoribbak',
    note: 'Ez a kettő van alapból bekapcsolva.',
  },
  {
    key: 'allergen',
    title: 'További allergének',
    note: 'Az EU-ban kötelezően jelölt allergének. Kapcsold be, ami rád vonatkozik.',
  },
  {
    key: 'preference',
    title: 'Étrendi preferencia',
    note: 'Ezeket nem szótárból számoljuk, hanem az OpenFoodFacts saját besorolásából.',
  },
];

export default function SettingsScreen() {
  const { profile, toggleDiet, toggleOption } = useProfile();
  const activeCount = DIET_KEYS.filter((diet) => profile.diets[diet]).length;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <StatusBar style="dark" />

      <Text style={styles.lead}>
        Csak a bekapcsolt szűrőkre figyelmeztetünk, így nem kapsz fölösleges riasztást.
        {activeCount === 0 ? ' Jelenleg egy sincs bekapcsolva.' : ''}
      </Text>

      {GROUPS.map((group) => {
        const diets = DIET_KEYS.filter((diet) => DIET_LABEL[diet].group === group.key);
        return (
          <View key={group.key} style={styles.group}>
            <Text style={styles.groupTitle}>{group.title}</Text>
            <Text style={styles.groupNote}>{group.note}</Text>

            <Card style={styles.card}>
              {diets.map((diet, index) => (
                <View key={diet}>
                  {index > 0 && <View style={styles.divider} />}
                  <DietRow
                    diet={diet}
                    value={profile.diets[diet]}
                    onToggle={() => toggleDiet(diet)}
                  />
                </View>
              ))}
            </Card>
          </View>
        );
      })}

      <View style={styles.group}>
        <Text style={styles.groupTitle}>Hogyan jelezzen</Text>
        <Text style={styles.groupNote}>
          A rezgés mindig működik, és ítéletenként más – tiltásnál kettős, erős.
        </Text>

        <Card style={styles.card}>
          <OptionRow
            emoji="⛔"
            title="Szigorú mód"
            note={
              'A „nyomokban tartalmazhatja” is tiltásnak számít. ' +
              'Cöliákiánál és súlyos allergiánál ez a helyes beállítás.'
            }
            value={profile.strict}
            onToggle={() => toggleOption('strict')}
          />
          <View style={styles.divider} />
          <OptionRow
            emoji="🔊"
            title="Hangos visszajelzés"
            note="Kimondja az ítéletet, hogy ne kelljen a képernyőre nézned. Boltban nem mindenki akarja, ezért alapból ki van kapcsolva."
            value={profile.speak}
            onToggle={() => toggleOption('speak')}
          />
        </Card>
      </View>

      <Disclaimer />
    </ScrollView>
  );
}

function OptionRow({
  emoji,
  title,
  note,
  value,
  onToggle,
}: {
  emoji: string;
  title: string;
  note: string;
  value: boolean;
  onToggle: () => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.emojiBubble}>
        <Text style={styles.emoji}>{emoji}</Text>
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowNote}>{note}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ true: colors.accent, false: colors.border }}
        accessibilityLabel={title}
      />
    </View>
  );
}

function DietRow({
  diet,
  value,
  onToggle,
}: {
  diet: DietKey;
  value: boolean;
  onToggle: () => void;
}) {
  const label = DIET_LABEL[diet];
  return (
    <View style={styles.row}>
      <View style={styles.emojiBubble}>
        <Text style={styles.emoji}>{label.emoji}</Text>
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.rowTitle}>{label.name}</Text>
        <Text style={styles.rowNote}>{label.hint}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ true: colors.accent, false: colors.border }}
        accessibilityLabel={`${label.name} szűrő`}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.xl, paddingBottom: spacing.xxl },
  lead: { fontSize: 15, lineHeight: 22, color: colors.muted },
  group: { gap: spacing.sm },
  groupTitle: { fontFamily: fonts.display, fontSize: 20, color: colors.text },
  groupNote: { fontSize: 13, lineHeight: 19, color: colors.muted, marginBottom: spacing.xs },
  card: { gap: spacing.md },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  emojiBubble: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.bgDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 19 },
  rowBody: { flex: 1, gap: 2 },
  rowTitle: { fontFamily: fonts.displayMedium, fontSize: 18, color: colors.text },
  rowNote: { fontSize: 13, lineHeight: 18, color: colors.muted },
});
