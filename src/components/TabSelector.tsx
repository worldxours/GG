import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Colors, Radius, Spacing } from '../theme';

interface Tab<T extends string> {
  key: T;
  label: string;
}

interface TabSelectorProps<T extends string> {
  tabs: Tab<T>[];
  selected: T;
  onSelect: (key: T) => void;
  /** When true, tabs scroll horizontally. Use for 4+ tabs. Default: false (equal flex). */
  scrollable?: boolean;
}

/**
 * Horizontal tab switcher — neomorphic inset style on active tab.
 *
 * Matches the auth mode toggle, wager Pending/Active/Settled tabs,
 * and Profile H2H/Recent Wagers tabs in the prototype.
 *
 * Inactive: no background (transparent inside the pill container).
 * Active:   inset look — Colors.bg background, Colors.border border,
 *           Colors.c1 text. Same pressed-in treatment as the nav bar active item.
 *
 * Container: Colors.raised pill, borderRadius Radius.nav (26), 4px inner padding.
 *
 * Usage:
 *   const [tab, setTab] = useState<'pending'|'active'|'settled'>('pending');
 *   <TabSelector
 *     tabs={[
 *       { key: 'pending', label: 'Pending' },
 *       { key: 'active',  label: 'Active'  },
 *       { key: 'settled', label: 'Settled' },
 *     ]}
 *     selected={tab}
 *     onSelect={setTab}
 *   />
 */
export default function TabSelector<T extends string>({
  tabs,
  selected,
  onSelect,
  scrollable = false,
}: TabSelectorProps<T>) {
  const inner = tabs.map((tab) => {
    const isActive = tab.key === selected;
    return (
      <TouchableOpacity
        key={tab.key}
        style={[styles.tab, isActive && styles.tabActive, !scrollable && styles.tabFlex]}
        onPress={() => onSelect(tab.key)}
        activeOpacity={0.8}
        accessibilityRole="tab"
        accessibilityState={{ selected: isActive }}
      >
        <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
          {tab.label}
        </Text>
      </TouchableOpacity>
    );
  });

  if (scrollable) {
    return (
      <View style={styles.container}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {inner}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.row}>{inner}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.raised,
    borderRadius: Radius.nav,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 4,
    shadowColor: Colors.shadowDark,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
  },
  row: {
    flexDirection: 'row',
  },
  scrollContent: {
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 2,
  },

  // Individual tab
  tab: {
    paddingVertical: 9,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.nav - 4,   // slightly inside the container radius
    alignItems: 'center',
  },
  tabFlex: {
    flex: 1,
  },

  // Active — inset pressed look
  tabActive: {
    backgroundColor: Colors.bg,
    borderWidth: 1,
    borderColor: Colors.border,
  },

  tabLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: Colors.muted,
  },
  tabLabelActive: {
    color: Colors.c1,
  },
});
