import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Colors, Radius, Spacing } from '../theme';

interface NmCardProps {
  children: React.ReactNode;
  /** Override horizontal padding. Defaults to Spacing.md (16). */
  paddingHorizontal?: number;
  /** Additional styles merged onto the card container. */
  style?: ViewStyle;
}

/**
 * Neomorphic raised card — matches .card in the prototype.
 *
 * Background: Colors.raised (#161920)
 * Border:     1px Colors.border (#1e2330)
 * Radius:     Radius.card (22)
 * Shadow:     6×6 shadowDark, radius 14
 *
 * Usage:
 *   <NmCard>
 *     <Row />
 *     <Divider />
 *     <Row />
 *   </NmCard>
 */
export default function NmCard({ children, paddingHorizontal = Spacing.md, style }: NmCardProps) {
  return (
    <View style={[styles.card, { paddingHorizontal }, style]}>
      {children}
    </View>
  );
}

/**
 * A 1px horizontal divider to place between card rows.
 * Matches Colors.divider (#1e2330).
 */
export function CardDivider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.card,
    backgroundColor: Colors.raised,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.shadowDark,
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 14,
    elevation: 8,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.divider,
  },
});
