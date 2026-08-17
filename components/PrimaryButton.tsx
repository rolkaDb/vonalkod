import React from 'react';
import { Pressable, StyleSheet, Text, ViewStyle } from 'react-native';

import { colors, radius, spacing } from '../lib/theme';

type Props = {
  label: string;
  onPress: () => void;
  variant?: 'solid' | 'outline';
  style?: ViewStyle;
};

export function PrimaryButton({ label, onPress, variant = 'solid', style }: Props) {
  const outline = variant === 'outline';
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.base,
        outline ? styles.outline : styles.solid,
        pressed && styles.pressed,
        style,
      ]}
    >
      <Text style={[styles.label, outline && styles.labelOutline]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.pill,
    paddingVertical: 14,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  solid: { backgroundColor: colors.accent },
  outline: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.accent },
  pressed: { opacity: 0.75 },
  label: { color: colors.onDark, fontSize: 16, fontWeight: '600' },
  labelOutline: { color: colors.accent },
});
