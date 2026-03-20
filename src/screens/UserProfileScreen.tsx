import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';

import { Colors, Spacing, Radius, Typography } from '../theme';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  ScreenHeader,
  Avatar,
  StatPill,
  TabSelector,
  WagerCard,
  WagerCardData,
  H2HBanner,
  NmCard,
  EmptyState,
  CardDivider,
} from '../components';
import { getUserDoc, getUserDisplayNames } from '../lib/userService';
import { getSharedWagers, WagerWithId } from '../lib/wagerService';
import { getH2H } from '../lib/messageService';
import { checkIsContact, addContact, removeContact } from '../lib/contactService';
import { UserDoc } from '../types';

// ── Route params ──────────────────────────────────────────────────────────────
type UserProfileParams = {
  /** UID of the user whose profile is being viewed */
  uid: string;
  /** Optional display name hint — shown in header while loading */
  displayName?: string;
};

// ── Tab type ──────────────────────────────────────────────────────────────────
type ProfileTab = 'h2h' | 'recent';

// ── Screen ────────────────────────────────────────────────────────────────────
export default function UserProfileScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<{ UserProfile: UserProfileParams }, 'UserProfile'>>();
  const { user } = useAuth();
  const { accent } = useTheme();

  const { uid, displayName: hintName = '' } = route.params;

  const [profileDoc, setProfileDoc] = useState<UserDoc | null>(null);
  const [wagers, setWagers]         = useState<WagerWithId[]>([]);
  const [nameMap, setNameMap]       = useState<Map<string, string>>(new Map());
  const [h2h, setH2H]               = useState<{ myWins: number; theirWins: number; totalWagers: number } | null>(null);
  const [loading, setLoading]       = useState(true);
  const [tab, setTab]               = useState<ProfileTab>('h2h');

  // Contact state
  const [isContact, setIsContact]           = useState(false);
  const [contactPending, setContactPending] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [doc, sharedWagers, h2hRec, contactStatus] = await Promise.all([
        getUserDoc(uid),
        getSharedWagers(user.uid, uid),
        getH2H(user.uid, uid),
        checkIsContact(user.uid, uid),
      ]);

      setProfileDoc(doc);
      setH2H(h2hRec);
      setWagers(sharedWagers);
      setIsContact(contactStatus);

      const names = await getUserDisplayNames([user.uid, uid]);
      setNameMap(names);
    } catch (e) {
      console.error('UserProfileScreen: loadData error', e);
    } finally {
      setLoading(false);
    }
  }, [uid, user]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Toggle contact ─────────────────────────────────────────────────────────
  const handleToggleContact = async () => {
    if (!user || contactPending) return;
    setContactPending(true);
    const wasContact = isContact;
    setIsContact(!wasContact); // optimistic
    try {
      if (wasContact) {
        await removeContact(user.uid, uid);
      } else {
        await addContact(user.uid, uid);
      }
    } catch (e) {
      setIsContact(wasContact); // revert on failure
      console.error('UserProfileScreen: toggleContact error', e);
    } finally {
      setContactPending(false);
    }
  };

  // ── Derived values ─────────────────────────────────────────────────────────
  const displayName  = profileDoc?.displayName ?? (hintName || uid.slice(-6));
  const handle       = profileDoc?.username    ?? displayName;
  const showStats    = profileDoc?.statsVisibility === 'public';

  const wins      = profileDoc?.wins            ?? 0;
  const losses    = profileDoc?.losses          ?? 0;
  const total     = wins + losses;
  const winRate   = total > 0 ? Math.round((wins / total) * 100) : 0;
  const wagered   = profileDoc?.lifetimeWagered ?? 0;
  const wonTotal  = profileDoc?.lifetimeWon     ?? 0;
  const net       = wonTotal - wagered;
  const streak    = profileDoc?.currentStreak   ?? 0;

  const tint  = `${accent}22`;
  const tint2 = `${accent}55`;

  // ── Build WagerCardData ────────────────────────────────────────────────────
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

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader
        title={`@${handle}`}
        onBack={() => navigation.goBack()}
      />

      {loading ? (
        <ActivityIndicator color={accent} style={styles.loader} />
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >

          {/* ── Identity block ── */}
          <View style={styles.identityRow}>
            <Avatar
              uid={uid}
              displayName={displayName}
              size={72}
              emoji={profileDoc?.avatarEmoji}
              uri={profileDoc?.avatarUrl}
            />
            <View style={styles.identityText}>
              <Text style={styles.handle}>@{handle}</Text>
              {profileDoc?.fullName ? (
                <Text style={styles.fullName}>{profileDoc.fullName}</Text>
              ) : null}
            </View>
          </View>

          {/* ── Contact button ── */}
          <TouchableOpacity
            style={[
              styles.contactBtn,
              isContact
                ? { backgroundColor: tint, borderColor: tint2 }
                : { backgroundColor: accent, borderColor: accent },
            ]}
            onPress={handleToggleContact}
            disabled={contactPending}
            activeOpacity={0.8}
          >
            {contactPending ? (
              <ActivityIndicator size="small" color={isContact ? accent : Colors.btnText} />
            ) : (
              <Text style={[styles.contactBtnText, { color: isContact ? accent : Colors.btnText }]}>
                {isContact ? '− Remove Contact' : '+ Add Contact'}
              </Text>
            )}
          </TouchableOpacity>

          {/* ── Stats — visible only if public ── */}
          {showStats ? (
            <>
              <View style={styles.statsRow}>
                <StatPill label="WINS"     value={wins}          />
                <StatPill label="LOSSES"   value={losses}        />
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
            </>
          ) : (
            <View style={[styles.privatePill, { backgroundColor: tint, borderColor: tint2 }]}>
              <Text style={styles.privateText}>🔒  Stats are private</Text>
            </View>
          )}

          {/* ── Tab switcher ── */}
          <View style={styles.tabRow}>
            <TabSelector
              tabs={[
                { key: 'h2h',    label: 'H2H' },
                { key: 'recent', label: 'RECENT' },
              ]}
              selected={tab}
              onSelect={setTab}
            />
          </View>

          {/* ── H2H tab ── */}
          {tab === 'h2h' && (
            h2h && h2h.totalWagers > 0 ? (
              <View style={styles.h2hSection}>
                <H2HBanner
                  myWins={h2h.myWins}
                  theirWins={h2h.theirWins}
                  theirName={displayName}
                />
                {wagers.length > 0 ? (
                  <>
                    <Text style={styles.sectionLabel}>SHARED WAGERS</Text>
                    <View style={styles.wagerList}>
                      {wagers.map((w) => (
                        <WagerCard key={w.id} wager={toCardData(w)} compact />
                      ))}
                    </View>
                  </>
                ) : null}
              </View>
            ) : (
              <EmptyState
                icon="🏆"
                title="No shared history"
                subtitle={`You haven't wagered against ${displayName} yet`}
              />
            )
          )}

          {/* ── Recent tab ── */}
          {tab === 'recent' && (
            wagers.length === 0 ? (
              <EmptyState
                icon="📋"
                title="No wagers yet"
                subtitle={`${displayName} hasn't made any wagers`}
              />
            ) : (
              <View style={styles.wagerList}>
                {wagers.map((w) => (
                  <WagerCard key={w.id} wager={toCardData(w)} compact />
                ))}
              </View>
            )
          )}

          <View style={{ height: Spacing.xxxl }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: Colors.bg },
  loader:        { paddingVertical: 60 },
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
  handle: {
    fontFamily: Typography.heading,
    fontSize: 22,
    color: Colors.text,
    letterSpacing: 0.5,
  },
  fullName: {
    fontFamily: Typography.body,
    fontSize: 13,
    color: Colors.dim,
  },

  // Contact button
  contactBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 18,
    paddingVertical: 11,
    minHeight: 44,
  },
  contactBtnText: {
    fontFamily: Typography.heading,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  // Stats
  statsRow: { flexDirection: 'row', gap: Spacing.xs },
  privatePill: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
  },
  privateText: {
    fontFamily: Typography.body,
    fontSize: 12,
    fontWeight: '600',
    color: Colors.muted,
    letterSpacing: 0.3,
  },

  // Tabs
  tabRow: { marginTop: Spacing.xs },

  // H2H section
  h2hSection: { gap: Spacing.md },
  sectionLabel: {
    fontFamily: Typography.body,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: Colors.muted,
    marginTop: Spacing.xs,
  },

  // Wager list
  wagerList: { gap: Spacing.sm },
});
