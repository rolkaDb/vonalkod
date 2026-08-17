import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { DIET_LABEL } from '../lib/keywords';
import { colors, radius, spacing, verdictStyles } from '../lib/theme';
import { Finding } from '../lib/types';

export function FindingRow({ finding }: { finding: Finding }) {
  const label = DIET_LABEL[finding.diet];
  const style = verdictStyles[finding.verdict];

  return (
    <View style={styles.row}>
      <View style={styles.emojiBubble}>
        <Text style={styles.emoji}>{label.emoji}</Text>
      </View>

      <View style={styles.body}>
        <View style={styles.headline}>
          <Text style={styles.name}>{label.name}</Text>
          <View style={[styles.pill, { backgroundColor: style.bg, borderColor: style.border }]}>
            <Text style={[styles.pillText, { color: style.fg }]}>{style.title}</Text>
          </View>
        </View>

        <Text style={styles.reason}>{finding.reason}</Text>

        {finding.evidence.length > 0 && (
          <Text style={styles.evidence} numberOfLines={2}>
            {finding.evidence.join(' · ')}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  emojiBubble: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.bgDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 19 },
  body: { flex: 1, gap: 2 },
  headline: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  name: { fontSize: 16, fontWeight: '600', color: colors.text },
  pill: {
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 3,
  },
  pillText: { fontSize: 12, fontWeight: '600' },
  reason: { fontSize: 14, color: colors.muted, lineHeight: 20 },
  evidence: { fontSize: 13, color: colors.text, fontStyle: 'italic' },
});
