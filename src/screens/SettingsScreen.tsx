import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  deleteUser,
} from 'firebase/auth';
import { deleteDoc, doc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { TEAM_COLORS, TEAM_LABELS } from '../context/ThemeContext';
import { Colors, Spacing, Radius, Typography } from '../theme';
import {
  Avatar,
  BottomSheet,
  CardDivider,
  NmCard,
  PrimaryButton,
  ScreenHeader,
  SectionHeader,
} from '../components';
import {
  isUsernameAvailable,
  updateUserProfile,
  updateUsername,
} from '../lib/userService';
import { TeamTheme, StatsVisibility } from '../types';

// ── Constants ─────────────────────────────────────────────────────────────────

const TEAM_ORDER: TeamTheme[] = ['knicks', 'canucks', 'flames', 'raiders', 'eagles', '49ers'];

// ── Screen ────────────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const navigation = useNavigation();
  const { user, userDoc, signOut, refreshUserDoc } = useAuth();
  const { accent } = useTheme();

  // ── Profile form state ─────────────────────────────────────────────────────
  const [editUsername, setEditUsername]       = useState('');
  const [editFullName, setEditFullName]       = useState('');
  const [editEmoji, setEditEmoji]             = useState('');
  const [emojiInputOpen, setEmojiInputOpen]   = useState(false);
  const [selectedTheme, setSelectedTheme]     = useState<TeamTheme | null>(null);
  const [selectedVisibility, setSelectedVisibility] = useState<StatsVisibility>('private');
  const [usernameOk, setUsernameOk]           = useState(true);
  const [usernameError, setUsernameError]     = useState('');
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [saving, setSaving]                   = useState(false);

  const usernameDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Change Password sheet state ────────────────────────────────────────────
  const [pwdSheetOpen, setPwdSheetOpen]   = useState(false);
  const [currentPwd, setCurrentPwd]       = useState('');
  const [newPwd, setNewPwd]               = useState('');
  const [confirmPwd, setConfirmPwd]       = useState('');
  const [pwdError, setPwdError]           = useState('');
  const [pwdSaving, setPwdSaving]         = useState(false);

  // ── Delete Account sheet state ─────────────────────────────────────────────
  const [deleteSheetOpen, setDeleteSheetOpen] = useState(false);
  const [deletePwd, setDeletePwd]             = useState('');
  const [deleteError, setDeleteError]         = useState('');
  const [deleting, setDeleting]               = useState(false);

  // ── Sign out ───────────────────────────────────────────────────────────────
  const [signingOut, setSigningOut] = useState(false);

  // ── Sync form with userDoc ─────────────────────────────────────────────────
  useEffect(() => {
    if (!userDoc) return;
    setEditUsername(userDoc.username ?? userDoc.displayName ?? '');
    setEditFullName(userDoc.fullName ?? '');
    setEditEmoji(userDoc.avatarEmoji ?? '');
    setSelectedTheme(userDoc.teamTheme ?? null);
    setSelectedVisibility(userDoc.statsVisibility ?? 'private');
    setUsernameOk(true);
    setUsernameError('');
  }, [
    userDoc?.username,
    userDoc?.fullName,
    userDoc?.avatarEmoji,
    userDoc?.teamTheme,
    userDoc?.statsVisibility,
  ]);

  // ── Username availability check (debounced) ────────────────────────────────
  const handleUsernameChange = (val: string) => {
    const cleaned = val.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20);
    setEditUsername(cleaned);
    setUsernameOk(false);
    setUsernameError('');

    if (cleaned === (userDoc?.username ?? '')) {
      setUsernameOk(true);
      return;
    }
    if (usernameDebounceRef.current) clearTimeout(usernameDebounceRef.current);
    usernameDebounceRef.current = setTimeout(async () => {
      if (cleaned.length < 3) { setUsernameError('At least 3 characters'); return; }
      if (!/^[a-z0-9_]{3,20}$/.test(cleaned)) { setUsernameError('Letters, numbers, and _ only'); return; }
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

  // ── Save profile ───────────────────────────────────────────────────────────
  const handleSaveProfile = async () => {
    if (!user || !usernameOk) return;
    setSaving(true);
    try {
      const currentUsername = userDoc?.username ?? null;
      if (editUsername && editUsername !== currentUsername) {
        await updateUsername(user.uid, currentUsername, editUsername);
      }
      const emojiVal = editEmoji.trim() || null;
      await updateUserProfile(user.uid, {
        teamTheme:       selectedTheme,
        statsVisibility: selectedVisibility,
        fullName:        editFullName.trim(),
        avatarEmoji:     emojiVal,
      });
      await refreshUserDoc();
      Alert.alert('Saved', 'Profile updated.');
    } catch (e) {
      Alert.alert('Error', 'Could not save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // ── Change password ────────────────────────────────────────────────────────
  const handleChangePassword = async () => {
    setPwdError('');
    if (!newPwd || !confirmPwd || !currentPwd) { setPwdError('All fields are required'); return; }
    if (newPwd.length < 6) { setPwdError('New password must be at least 6 characters'); return; }
    if (newPwd !== confirmPwd) { setPwdError('Passwords do not match'); return; }
    if (!user || !user.email) return;
    setPwdSaving(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, currentPwd);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPwd);
      setPwdSheetOpen(false);
      setCurrentPwd('');
      setNewPwd('');
      setConfirmPwd('');
      Alert.alert('Done', 'Password updated.');
    } catch (e: unknown) {
      const code = (e as { code?: string }).code;
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setPwdError('Current password is incorrect');
      } else {
        setPwdError('Could not update password. Please try again.');
      }
    } finally {
      setPwdSaving(false);
    }
  };

  // ── Delete account ─────────────────────────────────────────────────────────
  const handleDeleteAccount = async () => {
    if (!deletePwd) { setDeleteError('Enter your password to confirm'); return; }
    if (!user || !user.email) return;
    setDeleting(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, deletePwd);
      await reauthenticateWithCredential(user, credential);
      // Delete Firestore user doc (subcollections require Cloud Function cleanup)
      await deleteDoc(doc(db, 'users', user.uid));
      await deleteUser(user);
      // Auth state change triggers navigation to AuthScreen automatically
    } catch (e: unknown) {
      const code = (e as { code?: string }).code;
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setDeleteError('Incorrect password');
      } else {
        setDeleteError('Could not delete account. Please try again.');
      }
      setDeleting(false);
    }
  };

  // ── Sign out ───────────────────────────────────────────────────────────────
  const handleSignOut = async () => {
    setSigningOut(true);
    try { await signOut(); } finally { setSigningOut(false); }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScreenHeader title="SETTINGS" onBack={() => navigation.goBack()} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >

        {/* ── PROFILE section ── */}
        <SectionHeader label="PROFILE" />

        <NmCard>
          {/* Avatar */}
          <View style={styles.avatarRow}>
            <TouchableOpacity
              onPress={() => setEmojiInputOpen((o) => !o)}
              activeOpacity={0.8}
              style={styles.avatarTap}
            >
              <Avatar
                uid={user?.uid ?? ''}
                displayName={userDoc?.displayName ?? '?'}
                size={72}
                emoji={editEmoji || userDoc?.avatarEmoji}
                uri={userDoc?.avatarUrl}
              />
              <Text style={styles.avatarEditLabel}>EDIT</Text>
            </TouchableOpacity>
            <View style={styles.avatarMeta}>
              <Text style={styles.avatarDisplayName}>
                @{userDoc?.username ?? userDoc?.displayName ?? '—'}
              </Text>
              {userDoc?.fullName ? (
                <Text style={styles.avatarFullName}>{userDoc.fullName}</Text>
              ) : null}
            </View>
          </View>

          {emojiInputOpen && (
            <>
              <CardDivider />
              <View style={styles.emojiRow}>
                <Text style={styles.emojiLabel}>AVATAR EMOJI</Text>
                <TextInput
                  style={styles.emojiInput}
                  value={editEmoji}
                  onChangeText={(v) => setEditEmoji(v.slice(-2))} // keep last char/emoji
                  placeholder="🐺"
                  placeholderTextColor={Colors.muted}
                  maxLength={4}
                />
                {editEmoji ? (
                  <TouchableOpacity onPress={() => setEditEmoji('')} activeOpacity={0.7}>
                    <Text style={styles.emojiClear}>✕</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </>
          )}

          <CardDivider />

          {/* Username */}
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>USERNAME</Text>
            <View style={styles.usernameInputRow}>
              <Text style={styles.atPrefix}>@</Text>
              <TextInput
                style={[
                  styles.fieldInput,
                  usernameError ? styles.fieldInputError : null,
                  usernameOk && editUsername !== (userDoc?.username ?? '') ? styles.fieldInputOk : null,
                ]}
                value={editUsername}
                onChangeText={handleUsernameChange}
                placeholder="yourhandle"
                placeholderTextColor={Colors.muted}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {checkingUsername && (
                <ActivityIndicator color={Colors.c1} size="small" style={{ marginLeft: 8 }} />
              )}
              {usernameOk && !checkingUsername && editUsername !== (userDoc?.username ?? '') && (
                <Text style={styles.checkmark}>✓</Text>
              )}
            </View>
            {!!usernameError && <Text style={styles.fieldError}>{usernameError}</Text>}
          </View>

          <CardDivider />

          {/* Full name */}
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>FULL NAME</Text>
            <TextInput
              style={styles.fieldInput}
              value={editFullName}
              onChangeText={setEditFullName}
              placeholder="Jordan King"
              placeholderTextColor={Colors.muted}
              autoCapitalize="words"
              autoCorrect={false}
            />
          </View>

          <CardDivider />

          {/* Team theme */}
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>TEAM THEME</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.themePicker}
          >
            <TouchableOpacity
              style={[styles.themeChip, selectedTheme === null && styles.themeChipActive]}
              onPress={() => setSelectedTheme(null)}
              activeOpacity={0.8}
            >
              <Text style={[styles.themeChipLabel, selectedTheme === null && styles.themeChipLabelActive]}>
                DEFAULT
              </Text>
            </TouchableOpacity>
            {TEAM_ORDER.map((theme) => {
              const color = TEAM_COLORS[theme];
              const active = selectedTheme === theme;
              return (
                <TouchableOpacity
                  key={theme}
                  style={[styles.themeChip, active && { borderColor: color, backgroundColor: `${color}18` }]}
                  onPress={() => setSelectedTheme(theme)}
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

          <CardDivider />

          {/* Stats visibility */}
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>STATS VISIBILITY</Text>
            <View style={styles.visibilityRow}>
              {(['public', 'private'] as StatsVisibility[]).map((v) => {
                const active = selectedVisibility === v;
                return (
                  <TouchableOpacity
                    key={v}
                    style={[styles.visChip, active && styles.visChipActive]}
                    onPress={() => setSelectedVisibility(v)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.visChipText, active && styles.visChipTextActive]}>
                      {v === 'public' ? '🌍  PUBLIC' : '🔒  PRIVATE'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </NmCard>

        <PrimaryButton
          label="Save Profile"
          onPress={handleSaveProfile}
          loading={saving}
          disabled={!usernameOk}
        />

        {/* ── ACCOUNT section ── */}
        <SectionHeader label="ACCOUNT" />

        <NmCard paddingHorizontal={0} style={{ paddingVertical: 0, overflow: 'hidden' }}>
          {/* Change password */}
          <TouchableOpacity
            style={styles.accountRow}
            onPress={() => { setPwdError(''); setPwdSheetOpen(true); }}
            activeOpacity={0.75}
          >
            <Text style={styles.accountRowIcon}>🔑</Text>
            <Text style={styles.accountRowLabel}>Change Password</Text>
            <Text style={styles.accountRowChevron}>›</Text>
          </TouchableOpacity>

          <CardDivider />

          {/* Log out */}
          <TouchableOpacity
            style={styles.accountRow}
            onPress={handleSignOut}
            disabled={signingOut}
            activeOpacity={0.75}
          >
            <Text style={styles.accountRowIcon}>🚪</Text>
            {signingOut ? (
              <ActivityIndicator color={Colors.loss} size="small" />
            ) : (
              <Text style={[styles.accountRowLabel, { color: Colors.loss }]}>Log Out</Text>
            )}
          </TouchableOpacity>
        </NmCard>

        {/* ── DANGER ZONE section ── */}
        <SectionHeader label="DANGER ZONE" />

        <NmCard paddingHorizontal={0} style={{ paddingVertical: 0, overflow: 'hidden' }}>
          <TouchableOpacity
            style={styles.accountRow}
            onPress={() => { setDeleteError(''); setDeleteSheetOpen(true); }}
            activeOpacity={0.75}
          >
            <Text style={styles.accountRowIcon}>🗑️</Text>
            <Text style={[styles.accountRowLabel, { color: Colors.loss }]}>Delete Account</Text>
            <Text style={styles.accountRowChevron}>›</Text>
          </TouchableOpacity>
        </NmCard>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── Change Password sheet ── */}
      <BottomSheet visible={pwdSheetOpen} onClose={() => setPwdSheetOpen(false)}>
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>CHANGE PASSWORD</Text>

          <View style={styles.sheetField}>
            <Text style={styles.fieldLabel}>CURRENT PASSWORD</Text>
            <TextInput
              style={styles.fieldInput}
              value={currentPwd}
              onChangeText={setCurrentPwd}
              placeholder="••••••••"
              placeholderTextColor={Colors.muted}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.sheetField}>
            <Text style={styles.fieldLabel}>NEW PASSWORD</Text>
            <TextInput
              style={styles.fieldInput}
              value={newPwd}
              onChangeText={setNewPwd}
              placeholder="••••••••"
              placeholderTextColor={Colors.muted}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.sheetField}>
            <Text style={styles.fieldLabel}>CONFIRM NEW PASSWORD</Text>
            <TextInput
              style={[styles.fieldInput, newPwd && confirmPwd && newPwd !== confirmPwd ? styles.fieldInputError : null]}
              value={confirmPwd}
              onChangeText={setConfirmPwd}
              placeholder="••••••••"
              placeholderTextColor={Colors.muted}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {!!pwdError && <Text style={styles.sheetError}>{pwdError}</Text>}

          <PrimaryButton
            label="Update Password"
            onPress={handleChangePassword}
            loading={pwdSaving}
            disabled={!currentPwd || !newPwd || !confirmPwd}
            style={{ marginTop: Spacing.md }}
          />
        </View>
      </BottomSheet>

      {/* ── Delete Account sheet ── */}
      <BottomSheet visible={deleteSheetOpen} onClose={() => setDeleteSheetOpen(false)}>
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>DELETE ACCOUNT</Text>
          <Text style={styles.deleteWarning}>
            This will permanently delete your account and all your data. This cannot be undone.
          </Text>

          <View style={styles.sheetField}>
            <Text style={styles.fieldLabel}>CONFIRM PASSWORD</Text>
            <TextInput
              style={styles.fieldInput}
              value={deletePwd}
              onChangeText={setDeletePwd}
              placeholder="Enter your password"
              placeholderTextColor={Colors.muted}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {!!deleteError && <Text style={styles.sheetError}>{deleteError}</Text>}

          <TouchableOpacity
            style={[styles.deleteBtn, (!deletePwd || deleting) && styles.deleteBtnDisabled]}
            onPress={handleDeleteAccount}
            disabled={!deletePwd || deleting}
            activeOpacity={0.8}
          >
            {deleting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.deleteBtnText}>Delete My Account</Text>
            )}
          </TouchableOpacity>
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.bg },
  scroll:   { flex: 1 },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: 40,
    gap: Spacing.md,
  },

  // Avatar row
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  avatarTap: { alignItems: 'center', gap: 4 },
  avatarEditLabel: {
    fontSize: 9,
    fontFamily: Typography.body,
    fontWeight: '700',
    letterSpacing: 1,
    color: Colors.muted,
  },
  avatarMeta: { flex: 1, gap: 3 },
  avatarDisplayName: {
    fontFamily: Typography.heading,
    fontSize: 20,
    color: Colors.text,
    letterSpacing: 0.5,
  },
  avatarFullName: { fontFamily: Typography.body, fontSize: 13, color: Colors.dim },

  // Emoji row
  emojiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  emojiLabel: {
    fontFamily: Typography.body,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    color: Colors.muted,
    width: 100,
  },
  emojiInput: {
    flex: 1,
    backgroundColor: Colors.bg,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    color: Colors.text,
    fontFamily: Typography.body,
    fontSize: 22,
    textAlign: 'center',
  },
  emojiClear: { fontSize: 16, color: Colors.muted, paddingHorizontal: 4 },

  // Field rows (inside NmCard)
  fieldRow: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: 6,
  },
  fieldLabel: {
    fontFamily: Typography.body,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    color: Colors.muted,
  },
  fieldInput: {
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
  fieldInputError: { borderColor: Colors.loss },
  fieldInputOk:    { borderColor: Colors.win  },
  fieldError:      { color: Colors.loss, fontSize: 12 },

  // Username row
  usernameInputRow: { flexDirection: 'row', alignItems: 'center' },
  atPrefix: {
    fontFamily: Typography.heading,
    fontSize: 18,
    color: Colors.c1,
    marginRight: 4,
    marginBottom: 2,
  },
  checkmark: { fontSize: 16, fontWeight: '700', marginLeft: 8, color: Colors.win },

  // Theme picker
  themePicker: {
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
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
  themeChipLabel:       { fontFamily: Typography.body, fontSize: 11, fontWeight: '700', letterSpacing: 0.5, color: Colors.dim },
  themeChipLabelActive: { color: Colors.text },

  // Stats visibility
  visibilityRow: { flexDirection: 'row', gap: Spacing.sm },
  visChip: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.raised,
  },
  visChipActive:     { backgroundColor: Colors.bg, borderColor: Colors.dim },
  visChipText:       { fontFamily: Typography.body, fontSize: 12, fontWeight: '700', letterSpacing: 0.5, color: Colors.muted },
  visChipTextActive: { color: Colors.text },

  // Account rows
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 16,
    gap: Spacing.sm,
  },
  accountRowIcon:    { fontSize: 18 },
  accountRowLabel:   { flex: 1, fontFamily: Typography.bodyBold, fontSize: 14, color: Colors.text },
  accountRowChevron: { fontSize: 20, color: Colors.muted },

  // Bottom sheets
  sheet: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxxl,
    gap: Spacing.sm,
  },
  sheetTitle: {
    fontFamily: Typography.heading,
    fontSize: 13,
    letterSpacing: 2,
    color: Colors.muted,
    marginBottom: Spacing.sm,
  },
  sheetField: { gap: 6 },
  sheetError: { color: Colors.loss, fontSize: 13, marginTop: 4 },

  // Delete account
  deleteWarning: {
    fontFamily: Typography.body,
    fontSize: 14,
    color: Colors.dim,
    lineHeight: 20,
    marginBottom: Spacing.sm,
  },
  deleteBtn: {
    marginTop: Spacing.md,
    backgroundColor: Colors.loss,
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: 'center',
    shadowColor: Colors.loss,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  deleteBtnDisabled: { opacity: 0.5, shadowOpacity: 0 },
  deleteBtnText: {
    fontFamily: Typography.heading,
    fontSize: 15,
    color: '#fff',
    letterSpacing: 0.5,
  },
});
