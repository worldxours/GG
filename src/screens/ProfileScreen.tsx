import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Colors, Spacing, Radius, Typography } from '../theme';
import {
  Avatar,
  NmCard,
  StatPill,
  TabSelector,
  WagerCard,
  WagerCardData,
  EmptyState,
  BottomSheet,
  CardDivider,
} from '../components';
import { getUserWagers, WagerWithId } from '../lib/wagerService';
import { getUserDisplayNames } from '../lib/userService';
import { addContact, removeContact, getContacts, ContactEntry } from '../lib/contactService';
import { getOtherUsers } from '../lib/userService';
import { getH2H } from '../lib/messageService';

// ── Types ─────────────────────────────────────────────────────────────────────

type ProfileTab = 'h2h' | 'recent' | 'contacts';

interface H2HRecord {
  opponentUid:  string;
  opponentName: string;
  myWins:       number;
  theirWins:    number;
  totalWagers:  number;
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const navigation = useNavigation();
  const { user, userDoc } = useAuth();
  const { accent } = useTheme();

  const [tab, setTab]               = useState<ProfileTab>('h2h');
  const [wagers, setWagers]         = useState<WagerWithId[]>([]);
  const [nameMap, setNameMap]       = useState<Map<string, string>>(new Map());
  const [h2hRecords, setH2HRecords] = useState<H2HRecord[]>([]);
  const [loading, setLoading]       = useState(true);

  // Contacts tab state
  const [contacts, setContacts]               = useState<ContactEntry[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [addContactOpen, setAddContactOpen]   = useState(false);
  const [addContactSearch, setAddContactSearch] = useState('');
  const [allUsers, setAllUsers]               = useState<Array<{ uid: string; displayName: string; email?: string | null; avatarEmoji: string | null; avatarUrl: string | null }>>([]);
  const [pendingUids, setPendingUids]         = useState<Set<string>>(new Set());

  // ── Load wagers + H2H records ──────────────────────────────────────────────
  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const allWagers = await getUserWagers(user.uid);
      setWagers(allWagers);

      const oppUids = [
        ...new Set(
          allWagers.map((w) =>
            w.data.creatorId === user.uid ? w.data.opp : w.data.creatorId,
          ),
        ),
      ];
      const names = await getUserDisplayNames(oppUids);
      setNameMap(names);

      const records = await Promise.all(
        oppUids.map(async (uid) => {
          const rec = await getH2H(user.uid, uid);
          return {
            opponentUid:  uid,
            opponentName: names.get(uid) ?? uid.slice(-6),
            myWins:       rec.myWins,
            theirWins:    rec.theirWins,
            totalWagers:  rec.totalWagers,
          };
        }),
      );
      records.sort((a, b) => b.totalWagers - a.totalWagers);
      setH2HRecords(records);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Load contacts when tab is active ──────────────────────────────────────
  useEffect(() => {
    if (tab !== 'contacts' || !user) return;
    setContactsLoading(true);
    getContacts(user.uid)
      .then(setContacts)
      .catch(() => {})
      .finally(() => setContactsLoading(false));
  }, [tab, user]);

  // ── Load all users for "Add Contact" picker ───────────────────────────────
  useEffect(() => {
    if (!addContactOpen || !user) return;
    getOtherUsers(user.uid).then(setAllUsers).catch(() => {});
  }, [addContactOpen, user]);

  // ── Derived stats ──────────────────────────────────────────────────────────
  const wins       = userDoc?.wins            ?? 0;
  const losses     = userDoc?.losses          ?? 0;
  const total      = wins + losses;
  const winRate    = total > 0 ? Math.round((wins / total) * 100) : 0;
  const wagered    = userDoc?.lifetimeWagered ?? 0;
  const wonTotal   = userDoc?.lifetimeWon    ?? 0;
  const net        = wonTotal - wagered;
  const streak     = userDoc?.currentStreak  ?? 0;
  const balance    = userDoc?.walletBalance  ?? 0;

  // ── Build WagerCardData for Recent tab ────────────────────────────────────
  const toCardData = (w: WagerWithId): WagerCardData => ({
    id:          w.id,
    desc:        w.data.desc,
    amount:      w.data.amount,
    status:      w.data.status,
    category:    w.data.category,
    expiresAt:   w.data.expiresAt,
    creatorId:   w.data.creatorId,
    creatorName: nameMap.get(w.data.creatorId) ?? w.data.creatorId.slice(-6),
    oppId:       w.data.opp,
    oppName:     nameMap.get(w.data.opp)       ?? w.data.opp.slice(-6),
    currentUid:  user?.uid ?? '',
    winnerId:    w.data.winnerId,
  });

  // ── Toggle contact (add or remove) with optimistic UI ────────────────────
  const handleToggleContact = async (
    u: { uid: string; displayName: string; avatarEmoji: string | null; avatarUrl: string | null },
    isContact: boolean,
  ) => {
    if (!user || pendingUids.has(u.uid)) return;

    // Mark in-flight
    setPendingUids((prev) => new Set(prev).add(u.uid));

    // Optimistic update
    if (isContact) {
      setContacts((prev) => prev.filter((c) => c.uid !== u.uid));
    } else {
      setContacts((prev) => [
        ...prev,
        { uid: u.uid, displayName: u.displayName, avatarEmoji: u.avatarEmoji, avatarUrl: u.avatarUrl, addedAt: null },
      ]);
    }

    try {
      if (isContact) {
        await removeContact(user.uid, u.uid);
      } else {
        await addContact(user.uid, u.uid);
      }
    } catch (e) {
      // Revert on failure
      if (isContact) {
        setContacts((prev) => [
          ...prev,
          { uid: u.uid, displayName: u.displayName, avatarEmoji: u.avatarEmoji, avatarUrl: u.avatarUrl, addedAt: null },
        ]);
      } else {
        setContacts((prev) => prev.filter((c) => c.uid !== u.uid));
      }
      console.warn('[Profile] toggleContact error:', e);
    } finally {
      setPendingUids((prev) => { const next = new Set(prev); next.delete(u.uid); return next; });
    }
  };

  const tint  = `${accent}22`;
  const tint2 = `${accent}55`;

  const contactUidSet = new Set(contacts.map((c) => c.uid));

  return (
    <SafeAreaView style={styles.safeArea}>

      {/* ── Top bar ── */}
      <View style={styles.topBar}>
        <Text style={styles.screenTitle}>PROFILE</Text>
        <TouchableOpacity style={styles.gearBtn} onPress={() => (navigation as any).navigate('Settings')}>
          <Text style={styles.gearIcon}>⚙️</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Identity block ── */}
        <View style={styles.identityRow}>
          <Avatar
            uid={user?.uid ?? ''}
            displayName={userDoc?.displayName ?? '?'}
            size={72}
            emoji={userDoc?.avatarEmoji}
            uri={userDoc?.avatarUrl}
          />
          <View style={styles.identityText}>
            <Text style={styles.displayName} numberOfLines={1}>
              @{userDoc?.username ?? userDoc?.displayName ?? '—'}
            </Text>
            {userDoc?.fullName ? (
              <Text style={styles.fullName} numberOfLines={1}>{userDoc.fullName}</Text>
            ) : null}
            <View style={[styles.balancePill, { backgroundColor: tint, borderColor: tint2 }]}>
              <Text style={[styles.balanceValue, { color: accent }]}>
                ${balance.toFixed(2)}
              </Text>
              <Text style={styles.balanceLabel}>BALANCE</Text>
            </View>
          </View>
        </View>

        {/* ── Stats grid ── */}
        <View style={styles.statsRow}>
          <StatPill label="WINS"     value={wins}         />
          <StatPill label="LOSSES"   value={losses}       />
          <StatPill label="WIN RATE" value={`${winRate}%`} accent />
        </View>
        <View style={[styles.statsRow, { marginTop: Spacing.xs }]}>
          <StatPill label="WAGERED" value={`$${wagered}`} />
          <StatPill
            label="NET"
            value={net >= 0 ? `+$${net}` : `-$${Math.abs(net)}`}
            accent={net > 0}
          />
          <StatPill
            label="STREAK"
            value={streak > 0 ? `🔥 ${streak}` : streak.toString()}
            accent={streak >= 3}
          />
        </View>

        {/* ── Tab switcher ── */}
        <View style={styles.tabRow}>
          <TabSelector
            tabs={[
              { key: 'h2h',      label: 'VS.' },
              { key: 'recent',   label: 'RECENT' },
              { key: 'contacts', label: 'CONTACTS' },
            ]}
            selected={tab}
            onSelect={setTab}
          />
        </View>

        {/* ── H2H tab ── */}
        {tab === 'h2h' && (
          loading ? (
            <ActivityIndicator color={accent} style={{ marginTop: 40 }} />
          ) : h2hRecords.length === 0 ? (
            <EmptyState
              icon="🏆"
              title="No opponents yet"
              subtitle="Create a wager to start tracking head-to-head records"
            />
          ) : (
            <NmCard style={styles.listCard}>
              {h2hRecords.map((rec, i) => (
                <View key={rec.opponentUid}>
                  {i > 0 && <CardDivider />}
                  <H2HRow rec={rec} accent={accent} />
                </View>
              ))}
            </NmCard>
          )
        )}

        {/* ── Recent tab ── */}
        {tab === 'recent' && (
          loading ? (
            <ActivityIndicator color={accent} style={{ marginTop: 40 }} />
          ) : wagers.length === 0 ? (
            <EmptyState
              icon="📋"
              title="No wagers yet"
              subtitle="Head to the Wagers tab to create one"
            />
          ) : (
            <View style={styles.wagerList}>
              {wagers.slice(0, 20).map((w) => (
                <WagerCard key={w.id} wager={toCardData(w)} compact />
              ))}
            </View>
          )
        )}

        {/* ── Contacts tab ── */}
        {tab === 'contacts' && (
          <View style={styles.contactsSection}>
            <TouchableOpacity
              style={[styles.addContactBtn, { borderColor: accent }]}
              onPress={() => setAddContactOpen(true)}
              activeOpacity={0.8}
            >
              <Text style={[styles.addContactText, { color: accent }]}>+ Add Contact</Text>
            </TouchableOpacity>

            {contactsLoading ? (
              <ActivityIndicator color={accent} style={{ marginTop: 40 }} />
            ) : contacts.length === 0 ? (
              <EmptyState
                icon="👥"
                title="No contacts yet"
                subtitle="Tap + Add Contact to add friends"
              />
            ) : (
              <NmCard style={styles.listCard}>
                {contacts.map((c, i) => (
                  <View key={c.uid}>
                    {i > 0 && <CardDivider />}
                    <ContactRow
                      contact={c}
                      onPress={() => (navigation as any).navigate('UserProfile', { uid: c.uid, displayName: c.displayName })}
                      onRemove={() => handleToggleContact(c, true)}
                    />
                  </View>
                ))}
              </NmCard>
            )}
          </View>
        )}

      </ScrollView>

      {/* ── Add Contact bottom sheet ── */}
      <BottomSheet visible={addContactOpen} onClose={() => { setAddContactOpen(false); setAddContactSearch(''); }}>
        <View style={styles.addContactSheet}>
          <Text style={styles.sheetTitle}>PEOPLE</Text>
          {/* Search input */}
          <View style={styles.addContactSearchBox}>
            <Text style={styles.addContactSearchIcon}>🔍</Text>
            <TextInput
              style={styles.addContactSearchInput}
              value={addContactSearch}
              onChangeText={setAddContactSearch}
              placeholder="Search by username or email..."
              placeholderTextColor={Colors.muted}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          {(() => {
            const filtered = allUsers.filter((u) => {
              if (!addContactSearch.trim()) return true;
              const q = addContactSearch.trim().toLowerCase();
              return (
                u.displayName.toLowerCase().includes(q) ||
                (u.email != null && u.email.toLowerCase().includes(q))
              );
            });
            if (filtered.length === 0) {
              return <EmptyState icon="👥" title={addContactSearch ? 'No users found' : 'No other users yet'} />;
            }
            return (
              <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
                <NmCard style={styles.listCard}>
                  {filtered.map((u, i) => {
                    const isContact = contactUidSet.has(u.uid);
                    const isPending = pendingUids.has(u.uid);
                    return (
                      <View key={u.uid}>
                        {i > 0 && <CardDivider />}
                        <View style={styles.addContactRow}>
                          {/* Avatar + name → navigate to profile */}
                          <TouchableOpacity
                            style={styles.addContactIdentity}
                            activeOpacity={0.75}
                            onPress={() => {
                              setAddContactOpen(false);
                              setAddContactSearch('');
                              (navigation as any).navigate('UserProfile', { uid: u.uid, displayName: u.displayName });
                            }}
                          >
                            <Avatar
                              uid={u.uid}
                              displayName={u.displayName}
                              size={36}
                              emoji={u.avatarEmoji}
                              uri={u.avatarUrl}
                            />
                            <Text style={styles.addContactName}>@{u.displayName}</Text>
                          </TouchableOpacity>
                          {/* +/− button → toggle contact only */}
                          {isPending ? (
                            <ActivityIndicator size="small" color={Colors.c1} />
                          ) : (
                            <TouchableOpacity
                              onPress={() => handleToggleContact(u, isContact)}
                              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                              activeOpacity={0.7}
                            >
                              {isContact ? (
                                <Text style={styles.removeIcon}>−</Text>
                              ) : (
                                <Text style={styles.addIcon}>+</Text>
                              )}
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </NmCard>
              </ScrollView>
            );
          })()}
        </View>
      </BottomSheet>

    </SafeAreaView>
  );
}

// ── H2H Row ───────────────────────────────────────────────────────────────────

function H2HRow({ rec, accent }: { rec: H2HRecord; accent: string }) {
  const iWin = rec.myWins > rec.theirWins;
  const tied = rec.myWins === rec.theirWins;
  return (
    <View style={styles.h2hRow}>
      <Avatar uid={rec.opponentUid} displayName={rec.opponentName} size={36} />
      <Text style={styles.h2hName} numberOfLines={1}>{rec.opponentName}</Text>
      <View style={styles.h2hRecord}>
        <Text style={[styles.h2hScore, iWin && { color: accent }, tied && styles.h2hTied]}>
          {rec.myWins}
        </Text>
        <Text style={styles.h2hDash}> – </Text>
        <Text style={[styles.h2hScore, !iWin && !tied && { color: accent }, tied && styles.h2hTied]}>
          {rec.theirWins}
        </Text>
      </View>
      <Text style={styles.h2hTotal}>{rec.totalWagers}G</Text>
    </View>
  );
}

// ── Contact Row ───────────────────────────────────────────────────────────────

function ContactRow({
  contact,
  onPress,
  onRemove,
}: {
  contact: ContactEntry;
  onPress: () => void;
  onRemove: () => void;
}) {
  return (
    <TouchableOpacity style={styles.contactRow} onPress={onPress} activeOpacity={0.75}>
      <Avatar
        uid={contact.uid}
        displayName={contact.displayName}
        size={36}
        emoji={contact.avatarEmoji}
        uri={contact.avatarUrl}
      />
      <Text style={styles.contactName} numberOfLines={1}>@{contact.displayName}</Text>
      <TouchableOpacity
        onPress={(e) => { e.stopPropagation(); onRemove(); }}
        style={styles.removeBtn}
        activeOpacity={0.7}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={styles.removeText}>Remove</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.bg },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  screenTitle: {
    fontFamily: Typography.heading,
    fontSize: 13,
    letterSpacing: 2,
    color: Colors.muted,
  },
  gearBtn:  { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  gearIcon: { fontSize: 20 },

  scroll:        { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.lg, paddingBottom: 40, gap: Spacing.md },

  // Identity
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  identityText: { flex: 1, gap: 4 },
  displayName: {
    fontFamily: Typography.heading,
    fontSize: 22,
    color: Colors.text,
    letterSpacing: 0.5,
  },
  fullName: { fontFamily: Typography.body, fontSize: 13, color: Colors.dim },
  balancePill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
    gap: 6,
    marginTop: 4,
  },
  balanceValue: { fontFamily: Typography.heading, fontSize: 15, letterSpacing: 0.5 },
  balanceLabel: {
    fontFamily: Typography.body,
    fontSize: 9,
    letterSpacing: 1.2,
    color: Colors.muted,
    fontWeight: '700',
  },

  sheetTitle: {
    fontFamily: Typography.heading,
    fontSize: 13,
    letterSpacing: 2,
    color: Colors.muted,
    marginBottom: Spacing.sm,
  },

  statsRow: { flexDirection: 'row', gap: Spacing.xs },
  tabRow:   { marginTop: Spacing.xs },

  listCard: { paddingHorizontal: 0, paddingVertical: 0, overflow: 'hidden' },

  // H2H
  h2hRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    gap: 10,
  },
  h2hName:   { flex: 1, fontFamily: Typography.bodyBold, fontSize: 13, color: Colors.text },
  h2hRecord: { flexDirection: 'row', alignItems: 'center' },
  h2hScore:  { fontFamily: Typography.heading, fontSize: 18, color: Colors.dim },
  h2hTied:   { color: Colors.text },
  h2hDash:   { fontFamily: Typography.heading, fontSize: 14, color: Colors.muted },
  h2hTotal:  { fontFamily: Typography.body, fontSize: 10, color: Colors.muted, letterSpacing: 0.5, marginLeft: 4 },

  // Recent
  wagerList: { gap: Spacing.sm },

  // Contacts
  contactsSection: { gap: Spacing.md },
  addContactBtn: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: Colors.raised,
  },
  addContactText: { fontFamily: Typography.body, fontSize: 14, fontWeight: '700' },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    gap: 10,
  },
  contactName: { flex: 1, fontFamily: Typography.bodyBold, fontSize: 13, color: Colors.text },
  removeBtn:   { paddingHorizontal: 10, paddingVertical: 6 },
  removeText:  { fontFamily: Typography.body, fontSize: 12, color: Colors.loss },
  addContactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    gap: 10,
  },
  addContactIdentity: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  addContactName: { fontFamily: Typography.bodyBold, fontSize: 13, color: Colors.text },
  addIcon:    { fontSize: 22, color: Colors.c1, fontWeight: '700', width: 24, textAlign: 'center' },
  removeIcon: { fontSize: 22, color: Colors.loss, fontWeight: '700', width: 24, textAlign: 'center' },

  // Add Contact Sheet
  addContactSheet: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxxl, gap: Spacing.md },
  addContactSearchBox: {
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
  addContactSearchIcon: { fontSize: 13 },
  addContactSearchInput: {
    flex: 1,
    color: Colors.text,
    fontFamily: Typography.body,
    fontSize: 14,
  },

});
