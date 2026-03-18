import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Radius } from '../theme';

// Six accent colours that work on the dark background
const AVATAR_COLORS = [
  '#8b5cf6', // purple  (c1 default)
  '#3b82f6', // blue    (c2 default)
  '#22c55e', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#ec4899', // pink
];

/** Deterministic colour from uid — stable across re-renders */
function avatarColor(uid: string): string {
  const hash = uid.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

/** "Jordan King" → "JK", "Marcus" → "MA" */
function getInitials(displayName: string): string {
  const parts = displayName.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return displayName.slice(0, 2).toUpperCase();
}

/** Border radius varies by avatar size to stay proportional */
function radiusForSize(size: number): number {
  if (size <= 32) return Radius.sm;   // 10
  if (size <= 44) return Radius.md;   // 14
  if (size <= 56) return Radius.lg;   // 18
  return Radius.profile;              // 22 — large profile avatar
}

interface AvatarProps {
  uid: string;
  displayName: string;
  /** Side length in px. Default 32. */
  size?: number;
}

/**
 * Square neomorphic avatar with colour-coded initials.
 * Colour is deterministic from uid — consistent everywhere in the app.
 */
export default function Avatar({ uid, displayName, size = 32 }: AvatarProps) {
  const radius = radiusForSize(size);
  return (
    <View style={[
      styles.container,
      {
        width: size,
        height: size,
        borderRadius: radius,
        backgroundColor: avatarColor(uid),
      },
    ]}>
      <Text style={[styles.initials, { fontSize: Math.round(size * 0.34) }]}>
        {getInitials(displayName)}
      </Text>
    </View>
  );
}

// Export helpers so screens can use them without re-implementing
export { avatarColor, getInitials };

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  initials: {
    color: '#fff',
    fontWeight: '700',
  },
});
