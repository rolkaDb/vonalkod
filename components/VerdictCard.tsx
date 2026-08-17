import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radius, spacing, verdictStyles } from '../lib/theme';
import { Verdict } from '../lib/types';

type Props = {
  verdict: Verdict;
  subtitle: string;
  /**
   * Ha az ítélet a felhasználó saját jegyzetén alapul, nem adaton. Ilyenkor a
   * kártya szaggatott keretet és jelölést kap: hónapokkal később is látszania
   * kell, hogy ezt ő írta be, nem az adatbázis állítja.
   */
  fromNote?: boolean;
};

export function VerdictCard({ verdict, subtitle, fromNote = false }: Props) {
  const style = verdictStyles[verdict];

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: style.bg, borderColor: style.border },
        fromNote && styles.dashed,
      ]}
      accessibilityRole="summary"
      accessibilityLabel={
        fromNote
          ? `${style.title}. ${subtitle} Ez a saját jegyzeteden alapul.`
          : `${style.title}. ${subtitle}`
      }
    >
      <View style={[styles.mark, { borderColor: style.fg }]}>
        <Text style={[styles.markText, { color: style.fg }]}>{style.emoji}</Text>
      </View>

      <Text style={[styles.title, { color: style.fg }]}>{style.title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>

      {fromNote && (
        <View style={[styles.badge, { borderColor: style.fg }]}>
          <Text style={[styles.badgeText, { color: style.fg }]}>✎  Saját jegyzet</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  dashed: { borderWidth: 2, borderStyle: 'dashed' },
  mark: {
    width: 52,
    height: 52,
    borderRadius: radius.pill,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  markText: { fontSize: 26, lineHeight: 30, fontWeight: '700' },
  title: { fontFamily: fonts.display, fontSize: 26, textAlign: 'center' },
  subtitle: {
    marginTop: spacing.xs,
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
  },
  badge: {
    marginTop: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: 5,
  },
  badgeText: { fontSize: 12, fontWeight: '700' },
});
