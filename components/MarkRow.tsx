import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FavoriteKind } from '../lib/favorites';
import { colors, radius, spacing, verdictStyles } from '../lib/theme';

type Props = {
  current: FavoriteKind | null;
  onToggle: (kind: FavoriteKind) => void;
};

const BUTTONS: { kind: FavoriteKind; label: string; color: string }[] = [
  { kind: 'favorite', label: '★  Kedvenc', color: verdictStyles.safe.fg },
  { kind: 'avoid', label: '⊘  Kerülendő', color: verdictStyles.unsafe.fg },
];

/** Két kizáró jelölés: ami kedvenc, az nem lehet kerülendő is. */
export function MarkRow({ current, onToggle }: Props) {
  return (
    <View style={styles.row}>
      {BUTTONS.map(({ kind, label, color }) => {
        const active = current === kind;
        return (
          <Pressable
            key={kind}
            onPress={() => onToggle(kind)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={({ pressed }) => [
              styles.button,
              active && { backgroundColor: color, borderColor: color },
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.label, active && styles.labelActive]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.md },
  button: {
    flex: 1,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.7 },
  label: { fontSize: 14, fontWeight: '600', color: colors.muted },
  labelActive: { color: colors.onDark },
});
