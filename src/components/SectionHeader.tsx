import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Spacing } from '../theme';

interface SectionHeaderProps {
  label: string;
  /** Optional right-side action label (e.g. "See all"). */
  actionLabel?: string;
  onAction?: () => void;
}

/**
 * Labelled section header — matches prototype section titles.
 *
 * Label: 10px, weight 700, letterSpacing 1.8, uppercase, Colors.muted.
 * Optional right-side tappable action in Colors.c1.
 *
 * Usage:
 *   <SectionHeader label="WAGERS" />
 *   <SectionHeader label="RECENT ACTIVITY" actionLabel="See all" onAction={...} />
 */
export default function SectionHeader({ label, actionLabel, onAction }: SectionHeaderProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      {actionLabel && (
        <TouchableOpacity onPress={onAction} activeOpacity={0.7}>
          <Text style={styles.action}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.8,
    color: Colors.muted,
    textTransform: 'uppercase',
  },
  action: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.c1,
    letterSpacing: 0.3,
  },
});
