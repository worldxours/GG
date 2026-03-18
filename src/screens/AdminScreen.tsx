import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { Colors, Spacing, Typography } from '../theme';
import { useAuth } from '../context/AuthContext';
import {
  Avatar,
  NmCard,
  CardDivider,
  BottomSheet,
  SectionHeader,
  ScreenHeader,
  AmountPicker,
  PrimaryButton,
  EmptyState,
} from '../components';
import {
  getAllUsers,
  injectFunds,
  getTransactionLog,
  UserRow,
  DepositRow,
} from '../lib/adminService';

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatDate(ts: any): string {
  if (!ts) return '';
  try {
    const d: Date = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

// ── DEV ONLY badge — right slot for ScreenHeader ──────────────────────────────
function DevBadge() {
  return (
    <View style={styles.devBadge}>
      <Text style={styles.devBadgeText}>DEV ONLY</Text>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function AdminScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();

  const [users, setUsers]           = useState<UserRow[]>([]);
  const [txLog, setTxLog]           = useState<DepositRow[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingTx, setLoadingTx]   = useState(true);
  const [txError, setTxError]       = useState('');

  // Fund sheet state
  const [sheetTarget, setSheetTarget] = useState<UserRow | null>(null);
  const [selectedAmt, setSelectedAmt] = useState(50);
  const [injecting, setInjecting]     = useState(false);

  // ── Load data ──────────────────────────────────────────────────────────────
  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const rows = await getAllUsers();
      setUsers(rows.sort((a, b) =>
        (b.doc.walletBalance ?? 0) - (a.doc.walletBalance ?? 0)
      ));
    } catch (e) {
      console.error('AdminScreen: loadUsers error', e);
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  const loadTx = useCallback(async () => {
    setLoadingTx(true);
    setTxError('');
    try {
      const rows = await getTransactionLog();
      setTxLog(rows);
    } catch (e: any) {
      console.error('AdminScreen: loadTx error', e?.code, e?.message);
      setTxError(e?.message ?? 'Could not load transaction log');
    } finally {
      setLoadingTx(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
    loadTx();
  }, [loadUsers, loadTx]);

  // ── Fund injection ─────────────────────────────────────────────────────────
  const handleInject = async () => {
    if (!sheetTarget || !user) return;
    setInjecting(true);
    try {
      await injectFunds(sheetTarget.uid, selectedAmt, user.uid);
      setSheetTarget(null);
      await Promise.all([loadUsers(), loadTx()]);
    } catch (e) {
      Alert.alert('Error', 'Fund injection failed — check console');
      console.error('injectFunds error', e);
    } finally {
      setInjecting(false);
    }
  };

  const userNameForUid = (uid: string): string => {
    const found = users.find((u) => u.uid === uid);
    return found?.doc.displayName ?? uid.slice(0, 8);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>
      {/* ScreenHeader — back btn + centred title + DEV ONLY badge */}
      <ScreenHeader
        title="Admin"
        onBack={() => navigation.goBack()}
        rightElement={<DevBadge />}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Users section ── */}
        <View style={styles.section}>
          <SectionHeader label="Users" />
          <NmCard>
            {loadingUsers ? (
              <ActivityIndicator color={Colors.c1} style={{ paddingVertical: 20 }} />
            ) : users.length === 0 ? (
              <EmptyState icon="👥" title="No users found" subtitle="Sign up to create the first account" />
            ) : (
              users.map((row, i) => (
                <View key={row.uid}>
                  {i > 0 && <CardDivider />}
                  <View style={styles.userRow}>
                    <Avatar uid={row.uid} displayName={row.doc.displayName} size={32} />
                    <View style={styles.userInfo}>
                      <Text style={styles.userName}>{row.doc.displayName}</Text>
                      <Text style={styles.userMeta}>
                        ${row.doc.walletBalance ?? 0} · {row.doc.wins ?? 0}W {row.doc.losses ?? 0}L
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.fundBtn}
                      onPress={() => { setSheetTarget(row); setSelectedAmt(50); }}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.fundBtnText}>Fund</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </NmCard>
        </View>

        {/* ── Transaction log section ── */}
        <View style={styles.section}>
          <SectionHeader label="Transaction Log" />
          <NmCard>
            {loadingTx ? (
              <ActivityIndicator color={Colors.c1} style={{ paddingVertical: 20 }} />
            ) : txError ? (
              <Text style={styles.errorText}>{txError}</Text>
            ) : txLog.length === 0 ? (
              <EmptyState icon="📋" title="No transactions yet" subtitle="Inject funds above to get started" />
            ) : (
              txLog.map((row, i) => {
                const name = userNameForUid(row.uid);
                return (
                  <View key={row.id}>
                    {i > 0 && <CardDivider />}
                    <View style={styles.txRow}>
                      <Avatar uid={row.uid} displayName={name} size={32} />
                      <View style={styles.txInfo}>
                        <Text style={styles.txName}>{name}</Text>
                        <Text style={styles.txSub}>
                          {row.method} · ${row.balanceBefore} → ${row.balanceAfter}
                          {row.createdAt ? `  ·  ${formatDate(row.createdAt)}` : ''}
                        </Text>
                      </View>
                      <Text style={styles.txAmt}>+${row.amount}</Text>
                    </View>
                  </View>
                );
              })
            )}
          </NmCard>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* ── Fund injection bottom sheet ── */}
      <BottomSheet
        visible={!!sheetTarget}
        onClose={() => setSheetTarget(null)}
      >
        {/* User identity */}
        {sheetTarget && (
          <View style={styles.sheetHeader}>
            <Avatar uid={sheetTarget.uid} displayName={sheetTarget.doc.displayName} size={44} />
            <View>
              <Text style={styles.sheetName}>{sheetTarget.doc.displayName}</Text>
              <Text style={styles.sheetSub}>Inject mock funds</Text>
            </View>
          </View>
        )}

        {/* AmountPicker component */}
        <View style={styles.amtPickerWrapper}>
          <AmountPicker
            selected={selectedAmt}
            onSelect={setSelectedAmt}
          />
        </View>

        {/* PrimaryButton component */}
        <PrimaryButton
          label="💰 Inject Funds"
          onPress={handleInject}
          loading={injecting}
          style={styles.ctaBtn}
        />

        {/* Secondary cancel */}
        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={() => setSheetTarget(null)}
          activeOpacity={0.8}
        >
          <Text style={styles.cancelLabel}>Cancel</Text>
        </TouchableOpacity>
      </BottomSheet>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: Spacing.xl },

  // DEV ONLY badge — used as ScreenHeader rightElement
  devBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: 'rgba(249,120,120,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(249,120,120,0.3)',
  },
  devBadgeText: { fontSize: 9, fontWeight: '700', color: '#F97878', letterSpacing: 1 },

  // Section wrapper
  section: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg },

  // User row
  userRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12,
  },
  userInfo: { flex: 1 },
  userName: { fontSize: 14, fontWeight: '600', color: Colors.text },
  userMeta: { fontSize: 12, color: Colors.muted, marginTop: 2 },

  // Fund button — small inline accent button (not a PrimaryButton — different size)
  fundBtn: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: Colors.c1,
    shadowColor: Colors.c1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4, shadowRadius: 6, elevation: 4,
  },
  fundBtnText: { fontSize: 12, fontWeight: '700', color: '#fff' },

  // Transaction row
  txRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 11,
  },
  txInfo: { flex: 1, minWidth: 0 },
  txName: { fontSize: 13, fontWeight: '500', color: Colors.text },
  txSub: { fontSize: 11, color: Colors.muted, marginTop: 2 },
  txAmt: { fontSize: 14, fontWeight: '700', color: '#5EDDB8', flexShrink: 0 },

  // Error state (inline, no icon needed)
  errorText: { color: Colors.loss, fontSize: 12, paddingVertical: 16, textAlign: 'center' },

  // Sheet header
  sheetHeader: {
    flexDirection: 'row', alignItems: 'center',
    gap: 10, marginBottom: 16,
  },
  sheetName: {
    fontFamily: Typography.headingBold,
    fontSize: 18, color: Colors.text,
  },
  sheetSub: { fontSize: 11, color: Colors.muted, marginTop: 2 },

  // AmountPicker wrapper — adds bottom margin
  amtPickerWrapper: { marginBottom: 16 },

  // PrimaryButton override — adds bottom margin
  ctaBtn: { marginBottom: 10 },

  // Cancel secondary button
  cancelBtn: {
    backgroundColor: Colors.bg,
    borderRadius: 14,
    paddingVertical: 11,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cancelLabel: { fontSize: 13, fontWeight: '600', color: Colors.muted },
});
