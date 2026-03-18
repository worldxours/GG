import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Radius, Spacing, Typography } from '../theme';

interface StatPillProps {
  /** Small uppercase label above the value. e.g. "WINS", "WIN RATE", "STREAK" */
  label: string;
  /** The number or string to display prominently. e.g. 4, "67%", "🔥 3" */
  value: string | number;
  /**
   * When true, the value renders in Colors.c1 (purple accent).
   * Use for the wallet balance and streak — stats the user is proud of.
   */
  accent?: boolean;
}

/**
 * Single stat display — used 4-up in the Wagers balance card and
 * 6-up in the Profile stats grid.
 *
 * Layout:    label (small, muted, uppercase)
 *            value (Syne heading, prominent)
 *
 * Container: raised neomorphic, equal flex in a row.
 *
 * Usage:
 *   <StatPill label="WINS"     value={4} />
 *   <StatPill label="WIN RATE" value="67%" />
 *   <StatPill label="STREAK"   value="🔥 3" accent />
 *   <StatPill label="BALANCE"  value="$150" accent />
 */
export default function StatPill({ label, value, accent = false }: StatPillProps) {
  return (
    <View style={styles.pill}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, accent && styles.valueAccent]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flex: 1,
    backgroundColor: Colors.raised,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    alignItems: 'center',
    shadowColor: Colors.shadowDark,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
  },
  label: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: Colors.muted,
    marginBottom: 4,
    textAlign: 'center',
  },
  value: {
    fontFamily: Typography.heading,
    fontSize: 18,
    color: Colors.text,
    textAlign: 'center',
  },
  valueAccent: {
    color: Colors.c1,
  },
});
