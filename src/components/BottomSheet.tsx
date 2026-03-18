import React from 'react';
import {
  Modal,
  View,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { Colors, Radius, Spacing } from '../theme';

interface BottomSheetProps {
  /** Controls Modal visibility. */
  visible: boolean;
  /** Called when the overlay or hardware back is pressed. */
  onClose: () => void;
  children: React.ReactNode;
  /** Extra styles on the sheet surface (e.g. custom paddingBottom). */
  style?: ViewStyle;
}

/**
 * Reusable slide-up bottom sheet.
 *
 * Renders a dark semi-transparent overlay. Tapping outside the sheet
 * calls onClose. The sheet slides up from the bottom with animationType="slide".
 *
 * Always renders the standard drag handle pill at the top.
 *
 * Usage:
 *   <BottomSheet visible={open} onClose={() => setOpen(false)}>
 *     <Text>Sheet content here</Text>
 *   </BottomSheet>
 */
export default function BottomSheet({ visible, onClose, children, style }: BottomSheetProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      {/* Overlay — tap outside to dismiss */}
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        {/* Sheet surface — inner TouchableOpacity absorbs taps so they don't close */}
        <TouchableOpacity activeOpacity={1} style={[styles.sheet, style]}>
          {/* Drag handle */}
          <View style={styles.handle} />
          {children}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.raised,
    borderTopLeftRadius: Radius.sheet,
    borderTopRightRadius: Radius.sheet,
    paddingHorizontal: Spacing.lg,
    paddingBottom: 32,
    paddingTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.4,
    shadowRadius: 30,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.muted,
    alignSelf: 'center',
    marginBottom: 18,
  },
});
