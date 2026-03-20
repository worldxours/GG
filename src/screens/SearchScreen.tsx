import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { Colors, Spacing, Radius, Typography } from '../theme';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  ScreenHeader,
  Avatar,
  NmCard,
  CardDivider,
  EmptyState,
} from '../components';
import { getOtherUsers, UserPickerEntry } from '../lib/userService';
import { getContacts, addContact, removeContact } from '../lib/contactService';

export default function SearchScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { accent } = useTheme();

  const [allUsers, setAllUsers]     = useState<UserPickerEntry[]>([]);
  const [contactSet, setContactSet] = useState<Set<string>>(new Set());
  const [query, setQuery]           = useState('');
  const [loading, setLoading]       = useState(true);

  const inputRef = useRef<TextInput>(null);

  // ── Load all users + contacts on mount ────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      try {
        const [users, contacts] = await Promise.all([
          getOtherUsers(user.uid),
          getContacts(user.uid),
        ]);
        setAllUsers(users);
        setContactSet(new Set(contacts.map((c) => c.uid)));
      } catch (e) {
        console.error('SearchScreen: load error', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  // ── Auto-focus search input after load ────────────────────────────────────
  useEffect(() => {
    if (!loading) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [loading]);

  // ── Derived: filter users by query ────────────────────────────────────────
  const filteredUsers = query.trim()
    ? allUsers.filter((u) => {
        const q = query.trim().toLowerCase();
        return (
          u.displayName.toLowerCase().includes(q) ||
          (u.email != null && u.email.toLowerCase().includes(q))
        );
      })
    : allUsers;

  // ── Add / Remove contact ─────────────────────────────────────────────────
  const handleToggleContact = useCallback(async (uid: string) => {
    if (!user) return;
    const isContact = contactSet.has(uid);
    // Optimistic update
    setContactSet((prev) => {
      const next = new Set(prev);
      if (isContact) next.delete(uid);
      else next.add(uid);
      return next;
    });
    try {
      if (isContact) {
        await removeContact(user.uid, uid);
      } else {
        await addContact(user.uid, uid);
      }
    } catch (e) {
      // Revert on failure
      console.error('SearchScreen: toggleContact error', e);
      setContactSet((prev) => {
        const next = new Set(prev);
        if (isContact) next.add(uid);
        else next.delete(uid);
        return next;
      });
    }
  }, [user, contactSet]);

  const showEmpty = !loading && query.trim().length > 0 && filteredUsers.length === 0;

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="FIND PEOPLE" onBack={() => navigation.goBack()} />

      {/* ── Search input ── */}
      <View style={styles.searchWrap}>
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Search by username or email..."
            placeholderTextColor={Colors.muted}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={accent} style={styles.loader} />
      ) : showEmpty ? (
        <View style={styles.emptyWrap}>
          <EmptyState
            icon="🔍"
            title="No users found"
            subtitle="Try a different username or email"
          />
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <NmCard style={styles.listCard}>
            {filteredUsers.map((u, i) => (
              <View key={u.uid}>
                {i > 0 && <CardDivider />}
                <UserRow
                  user={u}
                  isContact={contactSet.has(u.uid)}
                  accent={accent}
                  onPress={() => (navigation as any).navigate('UserProfile', { uid: u.uid, displayName: u.displayName })}
                  onToggle={() => handleToggleContact(u.uid)}
                />
              </View>
            ))}
          </NmCard>
          <View style={{ height: Spacing.xxxl }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ── User row ──────────────────────────────────────────────────────────────────
function UserRow({
  user,
  isContact,
  accent,
  onPress,
  onToggle,
}: {
  user: UserPickerEntry;
  isContact: boolean;
  accent: string;
  onPress: () => void;
  onToggle: () => void;
}) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.75}>
      <Avatar uid={user.uid} displayName={user.displayName} size={40} />
      <View style={styles.rowText}>
        <Text style={styles.rowHandle} numberOfLines={1}>@{user.displayName}</Text>
        {user.email ? (
          <Text style={styles.rowEmail} numberOfLines={1}>{user.email}</Text>
        ) : null}
      </View>
      <TouchableOpacity
        style={[
          styles.toggleBtn,
          isContact
            ? styles.removeBtn
            : [styles.addBtn, { borderColor: accent }],
        ]}
        onPress={(e) => { e.stopPropagation(); onToggle(); }}
        activeOpacity={0.8}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={[
          styles.toggleBtnText,
          isContact ? styles.removeBtnText : { color: accent },
        ]}>
          {isContact ? 'Remove' : '+ Add'}
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: Colors.bg },
  loader: { paddingVertical: 60 },

  // Search input
  searchWrap: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bg,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    gap: 8,
  },
  searchIcon: { fontSize: 14 },
  searchInput: {
    flex: 1,
    color: Colors.text,
    fontFamily: Typography.body,
    fontSize: 15,
  },

  // List
  scroll:        { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.lg, paddingBottom: 40 },
  listCard:      { paddingHorizontal: 0, paddingVertical: 0, overflow: 'hidden' },
  emptyWrap:     { paddingTop: 60 },

  // Row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    gap: 10,
  },
  rowText: { flex: 1, minWidth: 0 },
  rowHandle: {
    fontFamily: Typography.bodyBold,
    fontSize: 13,
    color: Colors.text,
  },
  rowEmail: {
    fontFamily: Typography.body,
    fontSize: 11,
    color: Colors.muted,
    marginTop: 2,
  },

  // Toggle button
  toggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.md,
    borderWidth: 1,
    flexShrink: 0,
  },
  addBtn: {
    backgroundColor: 'transparent',
  },
  removeBtn: {
    borderColor: Colors.loss,
    backgroundColor: 'rgba(239,68,68,0.08)',
  },
  toggleBtnText: {
    fontFamily: Typography.body,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  removeBtnText: {
    color: Colors.loss,
  },
});
