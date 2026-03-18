import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Radius } from '../theme';

interface AmountPickerProps {
  /** The list of dollar amounts to show. Defaults to [50, 100, 250, 500]. */
  amounts?: number[];
  selected: number;
  onSelect: (amount: number) => void;
}

/**
 * Row of neomorphic quick-select amount buttons.
 *
 * Inactive: raised surface (Colors.raised), muted text.
 * Active:   inset look — Colors.bg background, Colors.c1 border + text.
 *
 * The active state uses the same inset neomorphic pattern as the
 * nav bar active item and wager category pills in the prototype.
 *
 * Usage:
 *   <AmountPicker selected={amount} onSelect={setAmount} />
 *   <AmountPicker amounts={[5, 10, 25, 50, 100]} selected={amount} onSelect={setAmount} />
 */
export default function AmountPicker({
  amounts = [50, 100, 250, 500],
  selected,
  onSelect,
}: AmountPickerProps) {
  return (
    <View style={styles.row}>
      {amounts.map((amt) => {
        const isActive = selected === amt;
        return (
          <TouchableOpacity
            key={amt}
            style={[styles.btn, isActive && styles.btnActive]}
            onPress={() => onSelect(amt)}
            activeOpacity={0.8}
            accessibilityLabel={`$${amt}`}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
          >
            <Text style={[styles.btnText, isActive && styles.btnTextActive]}>
              ${amt}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
  },

  // Inactive — raised neomorphic button
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: Radius.md,
    backgroundColor: Colors.raised,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    shadowColor: Colors.shadowDark,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
  },

  // Active — inset look (darker bg + accent border)
  btnActive: {
    backgroundColor: Colors.bg,
    borderColor: Colors.c1,
    shadowOpacity: 0,
    elevation: 0,
  },

  btnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.muted,
  },
  btnTextActive: {
    color: Colors.c1,
  },
});
