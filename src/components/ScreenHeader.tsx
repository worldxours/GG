import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { Colors, Spacing, Radius, Typography } from '../theme';

interface ScreenHeaderProps {
  title: string;
  /** Called when back button is pressed. Pass null to hide the back button. */
  onBack?: (() => void) | null;
  /** Optional element rendered in the right slot (e.g. a badge, icon button). */
  rightElement?: React.ReactNode;
  style?: ViewStyle;
}

/**
 * Standard push-screen top bar.
 *
 * Matches the AdminScreen top bar pattern — extracted so every push screen
 * (NewWager, ChatDetail, etc.) gets the same header without duplicating styles.
 *
 * Layout: [back btn] — [title centred] — [right slot or spacer]
 *
 * Usage:
 *   <ScreenHeader title="New Wager" onBack={() => navigation.goBack()} />
 *   <ScreenHeader title="Admin" onBack={null} rightElement={<DevBadge />} />
 */
export default function ScreenHeader({
  title,
  onBack,
  rightElement,
  style,
}: ScreenHeaderProps) {
  return (
    <View style={[styles.container, style]}>
      {/* Left — back button or spacer */}
      {onBack !== null ? (
        <TouchableOpacity
          style={styles.backBtn}
          onPress={onBack}
          activeOpacity={0.8}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.sideSpacer} />
      )}

      {/* Centre — title */}
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>

      {/* Right — custom element or spacer to keep title centred */}
      <View style={styles.sideSpacer}>
        {rightElement ?? null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: 18,
    paddingBottom: 4,
  },

  // Back button — raised neomorphic square, matches .nm-icon-btn
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: Colors.raised,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.shadowDark,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
  },
  backIcon: {
    color: Colors.dim,
    fontSize: 26,
    lineHeight: 30,
    marginTop: -2,
  },

  // Title — centred between the two side slots
  title: {
    fontFamily: Typography.headingBold,
    fontSize: 20,
    letterSpacing: 1,
    color: Colors.text,
    flex: 1,
    textAlign: 'center',
    paddingHorizontal: Spacing.sm,
  },

  // Spacer — mirrors the back button width so title stays visually centred
  sideSpacer: {
    width: 40,
    alignItems: 'flex-end',
  },
});
