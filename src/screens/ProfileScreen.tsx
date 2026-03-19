import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { TEAM_COLORS, TEAM_LABELS } from '../context/ThemeContext';
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
  PrimaryButton,
  SectionHeader,
  CardDivider,
} from '../components';
import { getUserWagers, WagerWithId } from '../lib/wagerService';
import {
  getUserDisplayNames,
  updateUserProfile,
  isUsernameAvailable,
  updateUsername,
} from '../lib/userService';
import { addContact, removeContact, getContacts, ContactEntry } from '../lib/contactService';
import { getOtherUsers } from '../lib/userService';
import { getH2H } from '../lib/messageService';
import { TeamTheme, StatsVisibility } from '../types';

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
  const { user, userDoc, signOut, refreshUserDoc } = useAuth();
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
  const [allUsers, setAllUsers]               = useState<Array<{ uid: string; displayName: string; avatarEmoji: string | null; avatarUrl: string | null }>>([]);

  // Settings sheet state
  const [settingsOpen, setSettingsOpen]           = useState(false);
  const [selectedTheme, setSelectedTheme]         = useState<TeamTheme | null>(null);
  const [selectedVisibility, setSelectedVisibility] = useState<StatsVisibility>('private');
  const [editFullName, setEditFullName]           = useState('');
  const [editUsername, setEditUsername]           = useState('');
  const [usernameOk, setUsernameOk]               = useState(true); // true = no change pending
  const [usernameError, setUsernameError]         = useState('');
  const [checkingUsername, setCheckingUsername]   = useState(false);
  const [saving, setSaving]                       = useState(false);
  const [signingOut, setSigningOut]               = useState(false);

  const usernameDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Sync settings with userDoc ─────────────────────────────────────────────
  useEffect(() => {
    if (userDoc) {
      setSelectedTheme(userDoc.teamTheme ?? null);
      setSelectedVisibility(userDoc.statsVisibility ?? 'private');
      setEditFullName(userDoc.fullName ?? '');
      setEditUsername(userDoc.username ?? userDoc.displayName ?? '');
      setUsernameOk(true);
      setUsernameError('');
    }
  }, [userDoc?.teamTheme, userDoc?.statsVisibility, userDoc?.fullName, userDoc?.username]);

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

  // ── Username availability check (debounced) ────────────────────────────────
  const handleUsernameChange = (val: string) => {
    const cleaned = val.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20);
    setEditUsername(cleaned);
    setUsernameOk(false);
    setUsernameError('');

    // If unchanged from current, no check needed
    if (cleaned === (userDoc?.username ?? '')) {
      setUsernameOk(true);
      return;
    }

    if (usernameDebounceRef.current) clearTimeout(usernameDebounceRef.current);
    usernameDebounceRef.current = setTimeout(async () => {
      if (cleaned.length < 3) {
        setUsernameError('At least 3 characters');
        return;
      }
      if (!/^[a-z0-9_]{3,20}$/.test(cleaned)) {
        setUsernameError('Letters, numbers, and _ only');
        return;
      }
      setCheckingUsername(true);
      try {
        const available = await isUsernameAvailable(cleaned);
        setUsernameOk(available);
        setUsernameError(available ? '' : 'Username already taken');
      } catch {
        setUsernameError('Could not check availability');
      } finally {
        setCheckingUsername(false);
      }
    }, 600);
  };

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

  // ── Save settings ──────────────────────────────────────────────────────────
  const handleSaveSettings = async () => {
    if (!user) return;
    if (!usernameOk) return;
    setSaving(true);
    try {
      // Username change (if different)
      const currentUsername = userDoc?.username ?? null;
      if (editUsername && editUsername !== currentUsername) {
        await updateUsername(user.uid, currentUsername, editUsername);
      }
      // Profile fields
      await updateUserProfile(user.uid, {
        teamTheme:       selectedTheme,
        statsVisibility: selectedVisibility,
        fullName:        editFullName.trim(),
      });
      await refreshUserDoc();
      setSettingsOpen(false);
    } finally {
      setSaving(false);
    }
  };

  // ── Add / remove contacts ─────────────────────────────────────────────────
  const handleAddContact = async (contactUid: string) => {
    if (!user) return;
    try {
      await addContact(user.uid, contactUid);
      const updated = await getContacts(user.uid);
      setContacts(updated);
    } catch (e) {
      console.warn('[Profile] addContact error:', e);
    }
  };

  const handleRemoveContact = async (contactUid: string) => {
    if (!user) return;
    try {
      await removeContact(user.uid, contactUid);
      setContacts((prev) => prev.filter((c) => c.uid !== contactUid));
    } catch (e) {
      console.warn('[Profile] removeContact error:', e);
    }
  };

  // ── Sign out ───────────────────────────────────────────────────────────────
  const handleSignOut = async () => {
    setSigningOut(true);
    try { await signOut(); } finally { setSigningOut(false); }
  };

  const tint  = `${accent}22`;
  const tint2 = `${accent}55`;

  const contactUidSet = new Set(contacts.map((c) => c.uid));

  return (
    <SafeAreaView style={styles.safeArea}>

      {/* ── Top bar ── */}
      <View style={styles.topBar}>
        <Text style={styles.screenTitle}>PROFILE</Text>
        <TouchableOpacity style={styles.gearBtn} onPress={() => setSettingsOpen(true)}>
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
                      onRemove={() => handleRemoveContact(c.uid)}
                    />
                  </View>
                ))}
              </NmCard>
            )}
          </View>
        )}

        {/* ── Log out ── */}
        <View style={styles.logoutRow}>
          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={handleSignOut}
            disabled={signingOut}
            activeOpacity={0.8}
          >
            {signingOut ? (
              <ActivityIndicator color={Colors.loss} size="small" />
            ) : (
              <Text style={styles.logoutText}>Log Out</Text>
            )}
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* ── Settings bottom sheet ── */}
      <BottomSheet visible={settingsOpen} onClose={() => setSettingsOpen(false)}>
        <SettingsSheet
          selectedTheme={selectedTheme}
          onSelectTheme={setSelectedTheme}
          selectedVisibility={selectedVisibility}
          onSelectVisibility={setSelectedVisibility}
          editFullName={editFullName}
          onEditFullName={setEditFullName}
          editUsername={editUsername}
          onEditUsername={handleUsernameChange}
          usernameOk={usernameOk}
          usernameError={usernameError}
          checkingUsername={checkingUsername}
          onSave={handleSaveSettings}
          saving={saving}
        />
      </BottomSheet>

      {/* ── Add Contact bottom sheet ── */}
      <BottomSheet visible={addContactOpen} onClose={() => setAddContactOpen(false)}>
        <View style={styles.addContactSheet}>
          <Text style={styles.settingsTitle}>ADD CONTACT</Text>
          {allUsers.filter((u) => !contactUidSet.has(u.uid)).length === 0 ? (
            <EmptyState icon="👥" title="No users to add" />
          ) : (
            <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
              <NmCard style={styles.listCard}>
                {allUsers
                  .filter((u) => !contactUidSet.has(u.uid))
                  .map((u, i, arr) => (
                    <View key={u.uid}>
                      {i > 0 && <CardDivider />}
                      <TouchableOpacity
                        style={styles.addContactRow}
                        activeOpacity={0.75}
                        onPress={async () => {
                          await handleAddContact(u.uid);
                          if (allUsers.filter((x) => !contactUidSet.has(x.uid)).length <= 1) {
                            setAddContactOpen(false);
                          }
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
                        <Text style={styles.addIcon}>+</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
              </NmCard>
            </ScrollView>
          )}
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

function ContactRow({ contact, onRemove }: { contact: ContactEntry; onRemove: () => void }) {
  return (
    <View style={styles.contactRow}>
      <Avatar
        uid={contact.uid}
        displayName={contact.displayName}
        size={36}
        emoji={contact.avatarEmoji}
        uri={contact.avatarUrl}
      />
      <Text style={styles.contactName} numberOfLines={1}>@{contact.displayName}</Text>
      <TouchableOpacity onPress={onRemove} style={styles.removeBtn} activeOpacity={0.7}>
        <Text style={styles.removeText}>Remove</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Settings Sheet ────────────────────────────────────────────────────────────

const TEAM_ORDER: TeamTheme[] = ['knicks', 'canucks', 'flames', 'raiders', 'eagles', '49ers'];

function SettingsSheet({
  selectedTheme, onSelectTheme,
  selectedVisibility, onSelectVisibility,
  editFullName, onEditFullName,
  editUsername, onEditUsername,
  usernameOk, usernameError, checkingUsername,
  onSave, saving,
}: {
  selectedTheme: TeamTheme | null;
  onSelectTheme: (t: TeamTheme | null) => void;
  selectedVisibility: StatsVisibility;
  onSelectVisibility: (v: StatsVisibility) => void;
  editFullName: string;
  onEditFullName: (s: string) => void;
  editUsername: string;
  onEditUsername: (s: string) => void;
  usernameOk: boolean;
  usernameError: string;
  checkingUsername: boolean;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <ScrollView
      style={{ maxHeight: 560 }}
      contentContainerStyle={styles.settingsContainer}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.settingsTitle}>SETTINGS</Text>

      {/* ── Username ── */}
      <SectionHeader label="USERNAME" />
      <View style={styles.usernameRow}>
        <Text style={styles.atPrefix}>@</Text>
        <TextInput
          style={[
            styles.settingInput,
            usernameError ? styles.settingInputError : null,
            usernameOk    ? styles.settingInputOk    : null,
          ]}
          value={editUsername}
          onChangeText={onEditUsername}
          placeholder="yourhandle"
          placeholderTextColor={Colors.muted}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {checkingUsername && (
          <ActivityIndicator color={Colors.c1} size="small" style={{ marginLeft: 8 }} />
        )}
        {usernameOk && !checkingUsername && (
          <Text style={[styles.checkmark, { color: Colors.win }]}>✓</Text>
        )}
      </View>
      {!!usernameError && <Text style={styles.settingErrorText}>{usernameError}</Text>}

      {/* ── Full name ── */}
      <View style={{ marginTop: Spacing.md }}>
        <SectionHeader label="FULL NAME" />
      </View>
      <TextInput
        style={styles.settingInput}
        value={editFullName}
        onChangeText={onEditFullName}
        placeholder="Jordan King"
        placeholderTextColor={Colors.muted}
        autoCapitalize="words"
        autoCorrect={false}
      />

      {/* ── Team theme ── */}
      <View style={{ marginTop: Spacing.lg }}>
        <SectionHeader label="TEAM THEME" />
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.themePicker}
      >
        <TouchableOpacity
          style={[styles.themeChip, selectedTheme === null && styles.themeChipActive]}
          onPress={() => onSelectTheme(null)}
          activeOpacity={0.8}
        >
          <Text style={styles.themeChipEmoji}>🚫</Text>
          <Text style={[styles.themeChipLabel, selectedTheme === null && styles.themeChipLabelActive]}>
            NONE
          </Text>
        </TouchableOpacity>
        {TEAM_ORDER.map((theme) => {
          const color = TEAM_COLORS[theme];
          const active = selectedTheme === theme;
          return (
            <TouchableOpacity
              key={theme}
              style={[styles.themeChip, active && { borderColor: color, backgroundColor: `${color}18` }]}
              onPress={() => onSelectTheme(theme)}
              activeOpacity={0.8}
            >
              <View style={[styles.themeColorDot, { backgroundColor: color }]} />
              <Text style={[styles.themeChipLabel, active && { color }]}>
                {TEAM_LABELS[theme].toUpperCase()}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── Stats visibility ── */}
      <View style={{ marginTop: Spacing.lg }}>
        <SectionHeader label="STATS VISIBILITY" />
      </View>
      <View style={styles.visibilityRow}>
        {(['public', 'private'] as StatsVisibility[]).map((v) => {
          const active = selectedVisibility === v;
          return (
            <TouchableOpacity
              key={v}
              style={[styles.visChip, active && styles.visChipActive]}
              onPress={() => onSelectVisibility(v)}
              activeOpacity={0.8}
            >
              <Text style={[styles.visChipText, active && styles.visChipTextActive]}>
                {v === 'public' ? '🌍  PUBLIC' : '🔒  PRIVATE'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <PrimaryButton
        label="Save Settings"
        onPress={onSave}
        loading={saving}
        disabled={!usernameOk}
        style={{ marginTop: Spacing.xl }}
      />
    </ScrollView>
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
  addContactName: { flex: 1, fontFamily: Typography.bodyBold, fontSize: 13, color: Colors.text },
  addIcon:         { fontSize: 20, color: Colors.c1, fontWeight: '700' },

  // Add Contact Sheet
  addContactSheet: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxxl, gap: Spacing.md },

  // Log out
  logoutRow: { alignItems: 'center', paddingTop: Spacing.md },
  logoutBtn: {
    borderWidth: 1,
    borderColor: Colors.loss,
    borderRadius: Radius.md,
    paddingVertical: 12,
    paddingHorizontal: 40,
    alignItems: 'center',
  },
  logoutText: { fontSize: 14, fontWeight: '600', color: Colors.loss, letterSpacing: 0.3 },

  // Settings sheet
  settingsContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },
  settingsTitle: {
    fontFamily: Typography.heading,
    fontSize: 13,
    letterSpacing: 2,
    color: Colors.muted,
    marginBottom: Spacing.lg,
  },

  // Username row in settings
  usernameRow: { flexDirection: 'row', alignItems: 'center' },
  atPrefix: {
    fontFamily: Typography.heading,
    fontSize: 18,
    color: Colors.c1,
    marginRight: 4,
    marginBottom: 2,
  },
  checkmark: { fontSize: 16, fontWeight: '700', marginLeft: 8 },
  settingInput: {
    flex: 1,
    backgroundColor: Colors.bg,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    color: Colors.text,
    fontFamily: Typography.body,
    fontSize: 15,
  },
  settingInputError: { borderColor: Colors.loss },
  settingInputOk:    { borderColor: Colors.win  },
  settingErrorText:  { color: Colors.loss, fontSize: 12, marginTop: 4 },

  themePicker: {
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
    paddingRight: Spacing.lg,
  },
  themeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: 9,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.raised,
  },
  themeChipActive:      { borderColor: Colors.dim, backgroundColor: Colors.bg },
  themeColorDot:        { width: 10, height: 10, borderRadius: 5 },
  themeChipEmoji:       { fontSize: 12 },
  themeChipLabel:       { fontFamily: Typography.body, fontSize: 11, fontWeight: '700', letterSpacing: 0.5, color: Colors.dim },
  themeChipLabelActive: { color: Colors.text },

  visibilityRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xs },
  visChip: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.raised,
  },
  visChipActive:      { backgroundColor: Colors.bg, borderColor: Colors.dim },
  visChipText:        { fontFamily: Typography.body, fontSize: 12, fontWeight: '700', letterSpacing: 0.5, color: Colors.muted },
  visChipTextActive:  { color: Colors.text },
});
