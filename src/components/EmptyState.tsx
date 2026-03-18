import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing } from '../theme';

interface EmptyStateProps {
  /** Large emoji or symbol. e.g. "📋", "💬", "🏆" */
  icon: string;
  title: string;
  subtitle?: string;
}

/**
 * Centred empty-list state — used whenever a list screen has 0 items.
 *
 * Designed to sit inside a flex:1 container and vertically centre itself.
 * Wrap in a flex:1 View if using inside a ScrollView.
 *
 * Usage:
 *   <EmptyState icon="📋" title="No wagers yet" subtitle="Create one to get started" />
 *   <EmptyState icon="💬" title="No messages" />
 */
export default function EmptyState({ icon, title, subtitle }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxxl,
    paddingHorizontal: Spacing.xl,
  },
  icon: {
    fontSize: 36,
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.dim,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.muted,
    textAlign: 'center',
    lineHeight: 18,
  },
});
