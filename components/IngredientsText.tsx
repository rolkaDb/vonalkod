import React from 'react';
import { StyleSheet, Text } from 'react-native';

import { Highlight, splitText } from '../lib/highlight';
import { colors, spacing, verdictStyles } from '../lib/theme';

/**
 * Az összetevő-szöveg a talált szavak kiemelésével. Ez a bizalom kérdése:
 * így egy pillantással ellenőrizhető, hogy az app tényleg azt találta meg,
 * amire hivatkozik – nem kell elhinni neki.
 */
export function IngredientsText({ text, highlights }: { text: string; highlights: Highlight[] }) {
  const segments = splitText(text, highlights);

  return (
    <Text style={styles.body}>
      {segments.map((segment, index) => {
        if (segment.verdict === null) {
          return <Text key={index}>{segment.text}</Text>;
        }
        const style = verdictStyles[segment.verdict];
        return (
          <Text key={index} style={[styles.hit, { backgroundColor: style.bg, color: style.fg }]}>
            {segment.text}
          </Text>
        );
      })}
    </Text>
  );
}

const styles = StyleSheet.create({
  body: { fontSize: 14, lineHeight: 22, color: colors.text },
  hit: {
    fontWeight: '700',
    // Vízszintes térköz nélkül a kiemelés összeérne a szomszédos szavakkal.
    paddingHorizontal: spacing.xs / 2,
  },
});
