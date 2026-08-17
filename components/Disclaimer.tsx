import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '../lib/theme';

/**
 * Az OpenFoodFacts közösségi adatbázis: bárki szerkesztheti, és a magyar
 * termékek lefedettsége hiányos. Ezt sosem rejtjük el – az ítélet segítség,
 * nem garancia, és a csomagolás mindig erősebb forrás.
 */
export function Disclaimer() {
  return (
    <View style={styles.box}>
      <Text style={styles.text}>
        Az adatok az OpenFoodFacts közösségi adatbázisából származnak, ezért lehetnek hiányosak vagy
        elavultak. Érzékenység esetén mindig ellenőrizd a csomagoláson lévő összetevőlistát is.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: colors.bgDeep,
    borderRadius: radius.md,
    padding: spacing.lg,
  },
  text: { fontSize: 13, lineHeight: 19, color: colors.muted },
});
