import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { Radius, Typography } from '../theme';
import { useTheme } from '../context/ThemeContext';

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
 * Background: team accent colour (follows useTheme — purple by default)
 * Font:       Syne_800ExtraBold, 15px, letterSpacing 0.5
 * Radius:     18 (matches prototype's auth + sheet CTAs)
 * Shadow:     accent glow — offset 0/4, opacity 0.45, radius 12
 *
 * Disabled / loading → opacity 0.6, non-interactive.
 */
export default function PrimaryButton({
  label,
  onPress,
  loading = false,
  disabled = false,
  style,
}: PrimaryButtonProps) {
  const { accent } = useTheme();
  const inactive = loading || disabled;

  return (
    <TouchableOpacity
      style={[
        styles.btn,
        { backgroundColor: accent, shadowColor: accent },
        inactive && styles.btnInactive,
        style,
      ]}
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
    // backgroundColor + shadowColor set dynamically via accent
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
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
