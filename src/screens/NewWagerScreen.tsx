import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { Colors, Spacing, Radius, Typography } from '../theme';
import { useAuth } from '../context/AuthContext';
import {
  ScreenHeader,
  Avatar,
  AmountPicker,
  WagerCard,
  WagerCardData,
  PrimaryButton,
  SectionHeader,
} from '../components';
import { createWager, CreateWagerData } from '../lib/wagerService';
import { sendSystemMessage } from '../lib/messageService';
import { getOtherUsers } from '../lib/userService';
import { WagerCategory } from '../types';

// ── Category config ───────────────────────────────────────────────────────────
const CATEGORIES: WagerCategory[] = ['Sports', 'Awards', 'Politics', 'Custom'];
const WAGER_AMOUNTS = [5, 10, 25, 50, 100];

// ── Main screen ───────────────────────────────────────────────────────────────
export default function NewWagerScreen() {
  const navigation = useNavigation();
  const { user, userDoc, refreshUserDoc } = useAuth();

  // ── Form state ──────────────────────────────────────────────────────────────
  const [opponents, setOpponents]   = useState<{ uid: string; displayName: string }[]>([]);
  const [selectedOpp, setSelectedOpp] = useState<string | null>(null);
  const [category, setCategory]     = useState<WagerCategory>('Sports');
  const [desc, setDesc]             = useState('');
  const [amount, setAmount]         = useState(25);
  const [expiresAt, setExpiresAt]   = useState('');
  const [loadingOpps, setLoadingOpps] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const descRef = useRef<TextInput>(null);

  const currentUid = user?.uid ?? '';
  const balance    = userDoc?.walletBalance ?? 0;

  // ── Load opponents ──────────────────────────────────────────────────────────
  const loadOpponents = useCallback(async () => {
    if (!currentUid) return;
    try {
      const list = await getOtherUsers(currentUid);
      setOpponents(list);
    } catch (e) {
      console.error('NewWagerScreen: loadOpponents error', e);
    } finally {
      setLoadingOpps(false);
    }
  }, [currentUid]);

  useEffect(() => { loadOpponents(); }, [loadOpponents]);

  // ── Validation ──────────────────────────────────────────────────────────────
  const selectedOppName = opponents.find((o) => o.uid === selectedOpp)?.displayName ?? '';
  const canSubmit =
    selectedOpp !== null &&
    desc.trim().length >= 3 &&
    amount > 0 &&
    expiresAt.trim().length > 0 &&
    balance >= amount;

  // ── Live preview data ───────────────────────────────────────────────────────
  const previewData: WagerCardData = {
    id:          'preview',
    desc:        desc || 'Describe the wager...',
    amount,
    status:      'pending',
    category,
    expiresAt:   expiresAt || 'TBD',
    creatorId:   currentUid,
    creatorName: userDoc?.displayName ?? 'You',
    oppId:       selectedOpp ?? 'opp',
    oppName:     selectedOppName || 'Opponent',
    currentUid,
    winnerId:    null,
  };

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!canSubmit || !user) return;

    setSubmitting(true);
    try {
      const data: CreateWagerData = {
        creatorId: currentUid,
        opp:       selectedOpp!,
        amount,
        desc:      desc.trim(),
        category,
        expiresAt: expiresAt.trim(),
      };

      const wagerId = await createWager(data);

      // Seed the chat thread with a system message so the conversation is visible immediately
      await sendSystemMessage(
        wagerId,
        `💬 Wager created — waiting for ${selectedOppName || 'opponent'} to accept.`,
      );

      await refreshUserDoc();

      // Dismiss modal and land on the Wagers tab
      (navigation as any).navigate('Main', { screen: 'Wagers' });
    } catch (e: any) {
      Alert.alert(
        'Could not create wager',
        e?.message ?? 'Something went wrong. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="New Wager" onBack={() => navigation.goBack()} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Opponent selector ── */}
          <View style={styles.section}>
            <SectionHeader label="Challenging" />
            {loadingOpps ? (
              <ActivityIndicator color={Colors.c1} style={{ paddingVertical: 20 }} />
            ) : opponents.length === 0 ? (
              <Text style={styles.noOppsText}>
                No other users yet. Ask a friend to sign up!
              </Text>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.oppList}
              >
                {opponents.map((opp) => {
                  const isSelected = selectedOpp === opp.uid;
                  return (
                    <TouchableOpacity
                      key={opp.uid}
                      style={styles.oppItem}
                      onPress={() => setSelectedOpp(opp.uid)}
                      activeOpacity={0.8}
                    >
                      {/* Selection ring */}
                      <View style={[styles.oppRing, isSelected && styles.oppRingActive]}>
                        <Avatar uid={opp.uid} displayName={opp.displayName} size={46} />
                      </View>
                      <Text
                        style={[styles.oppName, isSelected && styles.oppNameActive]}
                        numberOfLines={1}
                      >
                        {opp.displayName}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>

          {/* ── Category ── */}
          <View style={styles.section}>
            <SectionHeader label="Category" />
            <View style={styles.categoryRow}>
              {CATEGORIES.map((cat) => {
                const isActive = category === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.catBtn, isActive && styles.catBtnActive]}
                    onPress={() => setCategory(cat)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.catLabel, isActive && styles.catLabelActive]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* ── Description ── */}
          <View style={styles.section}>
            <SectionHeader label="What's the bet?" />
            <TouchableOpacity
              activeOpacity={1}
              onPress={() => descRef.current?.focus()}
            >
              <View style={styles.textAreaWrapper}>
                <TextInput
                  ref={descRef}
                  style={styles.textArea}
                  placeholder="Describe the wager clearly..."
                  placeholderTextColor={Colors.muted}
                  value={desc}
                  onChangeText={setDesc}
                  multiline
                  textAlignVertical="top"
                  maxLength={200}
                />
                <Text style={styles.charCount}>{desc.length}/200</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* ── Amount ── */}
          <View style={styles.section}>
            <SectionHeader
              label="How much?"
              actionLabel={`Balance: $${balance.toFixed(0)}`}
            />
            <AmountPicker
              amounts={WAGER_AMOUNTS}
              selected={amount}
              onSelect={setAmount}
            />
            {balance < amount && (
              <Text style={styles.balanceWarning}>
                Insufficient balance. Use Admin to add funds.
              </Text>
            )}
          </View>

          {/* ── Settle by ── */}
          <View style={styles.section}>
            <SectionHeader label="Settle by" />
            <TextInput
              style={styles.input}
              placeholder="e.g. End of season, Super Bowl Sunday..."
              placeholderTextColor={Colors.muted}
              value={expiresAt}
              onChangeText={setExpiresAt}
              returnKeyType="done"
              maxLength={60}
            />
          </View>

          {/* ── Live preview ── */}
          {(selectedOpp !== null || desc.length > 0) && (
            <View style={styles.section}>
              <SectionHeader label="Preview" />
              <WagerCard wager={previewData} compact={false} />
            </View>
          )}

          {/* ── Submit ── */}
          <View style={styles.submitSection}>
            <PrimaryButton
              label="Send Challenge"
              onPress={handleSubmit}
              loading={submitting}
              disabled={!canSubmit}
            />
            {!canSubmit && !submitting && (
              <Text style={styles.validationHint}>
                {!selectedOpp
                  ? 'Select an opponent above'
                  : desc.trim().length < 3
                  ? 'Add a description (at least 3 characters)'
                  : !expiresAt.trim()
                  ? 'Add a settle-by date or description'
                  : balance < amount
                  ? 'Insufficient balance'
                  : ''}
              </Text>
            )}
          </View>

          <View style={{ height: Spacing.xxxl }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: Colors.bg },
  flex:   { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: Spacing.xl },

  section: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },

  // No opponents
  noOppsText: { color: Colors.muted, fontSize: 13, paddingVertical: 16 },

  // Opponent selector
  oppList: { paddingTop: Spacing.sm, paddingBottom: Spacing.xs, gap: 12 },
  oppItem: { alignItems: 'center', width: 62 },
  oppRing: {
    borderRadius: Radius.md + 4,
    borderWidth: 2,
    borderColor: 'transparent',
    padding: 2,
    marginBottom: 6,
  },
  oppRingActive: { borderColor: Colors.c1 },
  oppName: {
    fontSize: 10,
    color: Colors.muted,
    textAlign: 'center',
    width: 60,
  },
  oppNameActive: { color: Colors.c1, fontWeight: '700' },

  // Category pills
  categoryRow: { flexDirection: 'row', gap: 8, paddingTop: Spacing.sm },
  catBtn: {
    flex: 1,
    paddingVertical: 10,
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
  catBtnActive: {
    backgroundColor: Colors.bg,
    borderColor: Colors.c1,
    shadowOpacity: 0,
    elevation: 0,
  },
  catLabel:       { fontSize: 11, fontWeight: '700', color: Colors.muted },
  catLabelActive: { color: Colors.c1 },

  // Description textarea — inset style (Colors.bg background)
  textAreaWrapper: {
    backgroundColor: Colors.bg,
    borderRadius: Radius.input,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    marginTop: Spacing.sm,
    minHeight: 90,
  },
  textArea: {
    color: Colors.text,
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    lineHeight: 22,
    minHeight: 60,
  },
  charCount: {
    fontSize: 10,
    color: Colors.muted,
    textAlign: 'right',
    marginTop: 4,
  },

  // Balance warning
  balanceWarning: {
    fontSize: 11,
    color: Colors.loss,
    marginTop: 8,
    fontWeight: '600',
  },

  // Settle-by input — same inset style as description
  input: {
    backgroundColor: Colors.bg,
    borderRadius: Radius.input,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    color: Colors.text,
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    marginTop: Spacing.sm,
  },

  // Submit section
  submitSection: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
  },
  validationHint: {
    fontSize: 12,
    color: Colors.muted,
    textAlign: 'center',
    marginTop: 10,
    fontStyle: 'italic',
  },
});
