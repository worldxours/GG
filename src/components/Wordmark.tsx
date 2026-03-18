import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { Colors, Typography } from '../theme';

interface WordmarkProps {
  size?: number;
  letterSpacing?: number;
}

/**
 * RUNIT split-colour wordmark.
 * "RUN" in Colors.text, "IT" in Colors.c1.
 * Used in: AuthScreen, HomeScreen, nav splash.
 */
export default function Wordmark({ size = 24, letterSpacing = 2 }: WordmarkProps) {
  return (
    <Text style={[styles.base, { fontSize: size, letterSpacing }]}>
      <Text style={styles.run}>RUN</Text>
      <Text style={styles.it}>IT</Text>
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    fontFamily: Typography.heading,
  },
  run: { color: Colors.text },
  it:  { color: Colors.c1 },
});
