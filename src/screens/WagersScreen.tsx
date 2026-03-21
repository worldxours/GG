import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { Colors, Spacing, Radius, Typography } from '../theme';
import { useAuth } from '../context/AuthContext';
import {
  NmCard,
  CardDivider,
  TabSelector,
  WagerCard,
  WagerCardData,
  EmptyState,
  StatPill,
  BottomSheet,
  StatusBadge,
} from '../components';
import { getUserWagers, acceptWager, declineWager, WagerWithId } from '../lib/wagerService';
import { getUserDisplayNames } from '../lib/userService';

type WagerTab = 'pending' | 'active' | 'settled';

const TABS: { key: WagerTab; label: string }[] = [
  { key: 'pending',  label: 'Pending'  },
  { key: 'active',   label: 'Active'   },
  { key: 'settled',  label: 'History'  },
];

function winRate(wins: number, losses: number): string {
  const total = wins + losses;
  if (total === 0) return '-';
  return `${Math.round((wins / total) * 100)}%`;
}

function streakLabel(streak: number): string {
  if (streak === 0) return '-';
  return `x${streak}`;
}

export default function WagersScreen() {
  const navigation = useNavigation();
  const { user, userDoc, refreshUserDoc } = useAuth();

  const [tab, setTab]                           = useState<WagerTab>('pending');
  const [wagers, setWagers]                     = useState<WagerWithId[]>([]);
  const [nameMap, setNameMap]                   = useState<Map<string, string>>(new Map());
  const [loading, setLoading]                   = useState(true);
  const [refreshing, setRefreshing]             = useState(false);
  const [actionId, setActionId]                 = useState<string | null>(null);
  const [confirmAcceptId, setConfirmAcceptId]   = useState<string | null>(null);
  const [confirmDeclineId, setConfirmDeclineId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg]                 = useState<string | null>(null);

  const currentUid = user?.uid ?? '';

  const loadWagers = useCallback(async () => {
    if (!currentUid) return;
    try {
      const rows = await getUserWagers(currentUid);
      const uids = rows.flatMap((w) => [w.data.creatorId, w.data.opp]);
      const map  = await getUserDisplayNames(uids);
      setWagers(rows);
      setNameMap(map);
    } catch (e) {
      console.error('WagersScreen: loadWagers error', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentUid]);

  useEffect(() => { loadWagers(); }, [loadWagers]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadWagers(), refreshUserDoc()]);
  }, [loadWagers, refreshUserDoc]);

  const tabWagers = wagers.filter((w) => {
    if (tab === 'pending') return w.data.status === 'pending';
    if (tab === 'active')  return w.data.status === 'active';
    if (tab === 'settled') return true; // History = all wagers
    return false;
  });

  const handleAccept = (wagerId: string) => {
    setErrorMsg(null);
    setConfirmAcceptId(wagerId);
  };

  const confirmAccept = async () => {
    if (!confirmAcceptId) return;
    const wagerId = confirmAcceptId;
    setConfirmAcceptId(null);
    setActionId(wagerId);
    try {
      await acceptWager(wagerId, currentUid);
      await Promise.all([loadWagers(), refreshUserDoc()]);
    } catch (e: any) {
      console.error('acceptWager error:', e);
      setErrorMsg(e?.message ?? 'Could not accept wager');
    } finally {
      setActionId(null);
    }
  };

  const handleDecline = (wagerId: string) => {
    setErrorMsg(null);
    setConfirmDeclineId(wagerId);
  };

  const confirmDecline = async () => {
    if (!confirmDeclineId) return;
    const wagerId = confirmDeclineId;
    setConfirmDeclineId(null);
    setActionId(wagerId);
    try {
      await declineWager(wagerId, currentUid);
      await Promise.all([loadWagers(), refreshUserDoc()]);
    } catch (e: any) {
      console.error('declineWager error:', e);
      setErrorMsg(e?.message ?? 'Could not decline wager');
    } finally {
      setActionId(null);
    }
  };

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
    currentUid,
    winnerId:    w.data.winnerId,
  });

  const wins    = userDoc?.wins          ?? 0;
  const losses  = userDoc?.losses        ?? 0;
  const balance = userDoc?.walletBalance ?? 0;
  const streak  = userDoc?.currentStreak ?? 0;

  return (
    <SafeAreaView style={styles.safe}>
      {/* ── Accept confirmation sheet — only mounted when needed ── */}
      {confirmAcceptId !== null && (
        <BottomSheet
          visible={true}
          onClose={() => setConfirmAcceptId(null)}
        >
          <Text style={styles.sheetTitle}>Accept Wager?</Text>
          <Text style={styles.sheetBody}>
            Your funds will be locked in until the wager is settled.
          </Text>
          <TouchableOpacity
            style={styles.sheetAcceptBtn}
            onPress={confirmAccept}
            activeOpacity={0.85}
          >
            <Text style={styles.sheetAcceptText}>Yes, Accept</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.sheetCancelBtn}
            onPress={() => setConfirmAcceptId(null)}
            activeOpacity={0.85}
          >
            <Text style={styles.sheetCancelText}>Cancel</Text>
          </TouchableOpacity>
        </BottomSheet>
      )}

      {/* ── Decline confirmation sheet — only mounted when needed ── */}
      {confirmDeclineId !== null && (
        <BottomSheet
          visible={true}
          onClose={() => setConfirmDeclineId(null)}
        >
          <Text style={styles.sheetTitle}>Decline Wager?</Text>
          <Text style={styles.sheetBody}>
            The wager will be declined and the creator's funds will be refunded.
          </Text>
          <TouchableOpacity
            style={styles.sheetDeclineBtn}
            onPress={confirmDecline}
            activeOpacity={0.85}
          >
            <Text style={styles.sheetDeclineText}>Yes, Decline</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.sheetCancelBtn}
            onPress={() => setConfirmDeclineId(null)}
            activeOpacity={0.85}
          >
            <Text style={styles.sheetCancelText}>Cancel</Text>
          </TouchableOpacity>
        </BottomSheet>
      )}
      <View style={styles.header}>
        <Text style={styles.title}>Wagers</Text>
        <TouchableOpacity
          style={styles.newBtn}
          onPress={() => (navigation as any).navigate('NewWager')}
          activeOpacity={0.85}
        >
          <Text style={styles.newBtnText}>+ New</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.c1} />
        }
      >
        <View style={styles.section}>
          <NmCard style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>WALLET BALANCE</Text>
            <Text style={styles.balanceAmount}>${balance.toFixed(2)}</Text>
            <View style={styles.statsRow}>
              <StatPill label="WINS"     value={wins} />
              <StatPill label="LOSSES"   value={losses} />
              <StatPill label="WIN RATE" value={winRate(wins, losses)} />
              <StatPill label="STREAK"   value={streakLabel(streak)} accent={streak > 0} />
            </View>
          </NmCard>
        </View>

        <View style={styles.section}>
          <TabSelector tabs={TABS} selected={tab} onSelect={setTab} />
        </View>

        {errorMsg !== null && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>⚠ {errorMsg}</Text>
            <TouchableOpacity onPress={() => setErrorMsg(null)}>
              <Text style={styles.errorDismiss}>✕</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.section}>
          {loading ? (
            <ActivityIndicator color={Colors.c1} style={{ paddingVertical: 40 }} />
          ) : tabWagers.length === 0 ? (
            <EmptyState
              icon={tab === 'pending' ? '⏳' : tab === 'active' ? '⚡' : '🏆'}
              title={`No ${tab} wagers`}
              subtitle={
                tab === 'pending'  ? 'Tap + New to challenge someone' :
                tab === 'active'   ? 'Accept a pending challenge to get one going' :
                                     'Settled wagers will appear here'
              }
            />
          ) : (
            <NmCard style={styles.listCard}>
              {tabWagers.map((w, i) => {
                const cardData   = toCardData(w);
                const isIncoming = w.data.opp === currentUid && w.data.status === 'pending';
                const isBusy     = actionId === w.id;

                return (
                  <View key={w.id}>
                    {i > 0 && <CardDivider />}
                    <View style={styles.wagerRow}>
                      <WagerCard
                        wager={cardData}
                        compact
                        onPress={() => {
                          const opponentId = w.data.creatorId === currentUid ? w.data.opp : w.data.creatorId;
                          const opponentName = nameMap.get(opponentId) ?? opponentId.slice(-6);
                          if (w.data.status === 'active') {
                            (navigation as any).navigate('ChatDetail', { receiverUID: opponentId, type: 'user', name: opponentName });
                          } else {
                            (navigation as any).navigate('UserProfile', { uid: opponentId, displayName: opponentName });
                          }
                        }}
                        onAccept={isIncoming ? handleAccept : undefined}
                        onDecline={isIncoming ? handleDecline : undefined}
                        actionLoading={isBusy}
                      />

                      {tab === 'settled' && (
                        <View style={styles.resultRow}>
                          {w.data.status === 'settled' && w.data.winnerId ? (
                            w.data.winnerId === currentUid
                              ? <Text style={styles.winLabel}>You won +${w.data.amount}</Text>
                              : <Text style={styles.lossLabel}>You lost -${w.data.amount}</Text>
                          ) : (
                            <StatusBadge status={w.data.status} />
                          )}
                        </View>
                      )}

                    </View>
                  </View>
                );
              })}
            </NmCard>
          )}
        </View>

        <View style={{ height: Spacing.xxxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: Colors.bg },
  scroll:        { flex: 1 },
  scrollContent: { paddingBottom: Spacing.xl },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: 18,
    paddingBottom: 4,
  },
  title: {
    fontFamily: Typography.headingBold,
    fontSize: 22,
    letterSpacing: 1,
    color: Colors.text,
  },
  newBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: Colors.c1,
    shadowColor: Colors.c1,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
  newBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  section: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },

  balanceCard:   { paddingHorizontal: Spacing.md, paddingVertical: Spacing.md },
  balanceLabel:  {
    fontSize: 9, fontWeight: '700', letterSpacing: 1.8,
    color: Colors.muted, marginBottom: Spacing.xs, textAlign: 'center',
  },
  balanceAmount: {
    fontFamily: Typography.heading,
    fontSize: 38,
    color: Colors.c1,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  statsRow: { flexDirection: 'row', gap: 8 },

  listCard: { paddingHorizontal: 0, paddingVertical: 0, overflow: 'hidden' },
  wagerRow: { paddingHorizontal: Spacing.md },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderWidth: 1,
    borderColor: Colors.loss,
  },
  errorText:    { fontSize: 13, color: Colors.loss, flex: 1 },
  errorDismiss: { fontSize: 14, color: Colors.loss, paddingLeft: 8 },

  resultRow: { paddingBottom: 10 },
  winLabel:  { fontSize: 12, fontWeight: '700', color: Colors.win  },
  lossLabel: { fontSize: 12, fontWeight: '600', color: Colors.loss },

  // Decline confirmation sheet
  sheetTitle: {
    fontFamily: Typography.headingBold,
    fontSize: 18,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  sheetBody: {
    fontSize: 14,
    color: Colors.dim,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.sm,
  },
  sheetAcceptBtn: {
    backgroundColor: Colors.win,
    borderRadius: Radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: Spacing.sm,
    shadowColor: Colors.win,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  sheetAcceptText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  sheetDeclineBtn: {
    backgroundColor: Colors.loss,
    borderRadius: Radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  sheetDeclineText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  sheetCancelBtn: {
    backgroundColor: Colors.bg,
    borderRadius: Radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sheetCancelText: { fontSize: 15, fontWeight: '600', color: Colors.muted },
});
