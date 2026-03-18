import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { Colors, Radius, Typography } from '../theme';

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  /** Shows a spinner and disables the button. */
  loading?: boolean;
  /** Disables without showing spinner (e.g. form not yet valid). */
  disabled?: boolean;
  /** Override outer container styles (e.g. marginTop). */
  style?: ViewStyle;
}

/**
 * Main CTA button — matches .btn-primary in the prototype.
 *
 * Background: Colors.c1 (purple by default — follows team theme)
 * Font:       Syne_800ExtraBold, 15px, letterSpacing 0.5
 * Radius:     18 (matches prototype's auth + sheet CTAs)
 * Shadow:     c1 glow — offset 0/4, opacity 0.45, radius 12
 *
 * Disabled / loading → opacity 0.6, non-interactive.
 *
 * Usage:
 *   <PrimaryButton label="Create Account" onPress={handleSubmit} loading={isLoading} />
 *   <PrimaryButton label="💰 Inject Funds" onPress={handleInject} />
 */
export default function PrimaryButton({
  label,
  onPress,
  loading = false,
  disabled = false,
  style,
}: PrimaryButtonProps) {
  const inactive = loading || disabled;

  return (
    <TouchableOpacity
      style={[styles.btn, inactive && styles.btnInactive, style]}
      onPress={onPress}
      disabled={inactive}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={styles.label}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    backgroundColor: Colors.c1,
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: Colors.c1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 6,
  },
  btnInactive: {
    opacity: 0.6,
  },
  label: {
    color: '#fff',
    fontFamily: Typography.heading,
    fontSize: 15,
    letterSpacing: 0.5,
  },
});
