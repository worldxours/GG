import React from 'react';
import {
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { Colors, Radius } from '../theme';

interface IconButtonProps {
  /** Emoji or single character to render inside the button. */
  icon: string;
  onPress?: () => void;
  /** Show a small accent-coloured pip (notification indicator). */
  showPip?: boolean;
  /** Override the button size. Defaults to 38. */
  size?: number;
  /** Additional styles on the outer container. */
  style?: ViewStyle;
  accessibilityLabel?: string;
}

/**
 * Neomorphic icon button — matches .nm-icon-btn in the prototype.
 *
 * 38×38, borderRadius 13, raised surface, optional notification pip.
 *
 * Usage:
 *   <IconButton icon="🔔" showPip onPress={() => nav.navigate('Notifications')} />
 *   <IconButton icon="⚙️" onPress={() => nav.navigate('Settings')} />
 */
export default function IconButton({
  icon,
  onPress,
  showPip = false,
  size = 38,
  style,
  accessibilityLabel,
}: IconButtonProps) {
  return (
    <TouchableOpacity
      style={[styles.btn, { width: size, height: size }, style]}
      onPress={onPress}
      activeOpacity={0.75}
      accessibilityLabel={accessibilityLabel}
    >
      <Text style={styles.icon}>{icon}</Text>
      {showPip && <View style={styles.pip} />}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    borderRadius: Radius.sm + 3,   // 13 — matches .nm-icon-btn
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
  icon: { fontSize: 16 },
  pip: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Colors.c1,
    position: 'absolute',
    top: 7,
    right: 7,
    borderWidth: 1.5,
    borderColor: Colors.bg,
  },
});
