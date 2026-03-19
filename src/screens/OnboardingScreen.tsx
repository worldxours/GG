/**
 * OnboardingScreen — shown once to new users after sign-up.
 *
 * 3 steps:
 *   1. Username  — @handle (unique, 3-20 chars, alphanumeric + _)
 *   2. Name      — full name (optional)
 *   3. Avatar    — emoji grid or photo upload
 *
 * On completion: writes to Firestore via completeOnboarding(), then
 * refreshUserDoc() → needsOnboarding flips false → navigator swaps to MainTabs.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

import { Colors, Radius, Spacing, Typography } from '../theme';
import { useAuth } from '../context/AuthContext';
import { Avatar, PrimaryButton, Wordmark } from '../components';
import { isUsernameAvailable, completeOnboarding } from '../lib/userService';
import { storage } from '../lib/firebase';

// ── Constants ─────────────────────────────────────────────────────────────────

const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/;

const EMOJI_OPTIONS = [
  '⚽', '🏀', '🏈', '⚾', '🎾', '🏒',
  '🥊', '🏆', '🔥', '💪', '🎯', '👑',
  '🦁', '🐯', '🦅', '⚡', '🌟', '💎',
  '🤙', '💀',
];

type Step = 1 | 2 | 3;

// ── Screen ────────────────────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const { user, refreshUserDoc } = useAuth();

  const [step, setStep] = useState<Step>(1);

  // Step 1 — username
  const [username, setUsername]             = useState('');
  const [usernameError, setUsernameError]   = useState('');
  const [usernameOk, setUsernameOk]         = useState(false);
  const [checkingUsername, setCheckingUsername] = useState(false);

  // Step 2 — name
  const [fullName, setFullName] = useState('');

  // Step 3 — avatar
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);
  const [avatarUri, setAvatarUri]         = useState<string | null>(null); // local URI
  const [saving, setSaving]               = useState(false);

  // Debounce timer ref for username availability check
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Username validation & availability check ──────────────────────────────
  const validateUsername = useCallback(async (raw: string) => {
    const val = raw.toLowerCase().replace(/\s/g, '');
    setUsernameOk(false);
    setUsernameError('');

    if (val.length === 0) return;
    if (val.length < 3) { setUsernameError('At least 3 characters'); return; }
    if (!USERNAME_REGEX.test(val)) {
      setUsernameError('Letters, numbers, and _ only');
      return;
    }

    setCheckingUsername(true);
    try {
      const available = await isUsernameAvailable(val);
      if (available) {
        setUsernameOk(true);
        setUsernameError('');
      } else {
        setUsernameError('Username already taken');
      }
    } catch {
      setUsernameError('Could not check availability');
    } finally {
      setCheckingUsername(false);
    }
  }, []);

  const handleUsernameChange = (raw: string) => {
    // Strip disallowed chars immediately
    const cleaned = raw.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20);
    setUsername(cleaned);
    setUsernameOk(false);
    setUsernameError('');

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => validateUsername(cleaned), 600);
  };

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  // ── Photo picker ─────────────────────────────────────────────────────────
  const handlePickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
      setSelectedEmoji(null); // photo overrides emoji
    }
  };

  // ── Finish ───────────────────────────────────────────────────────────────
  const handleFinish = async () => {
    if (!user) return;
    setSaving(true);
    try {
      let avatarUrl: string | null = null;

      // Upload photo to Firebase Storage if one was selected
      if (avatarUri) {
        try {
          const response = await fetch(avatarUri);
          const blob     = await response.blob();
          const storageRef = ref(storage, `avatars/${user.uid}`);
          await uploadBytes(storageRef, blob);
          avatarUrl = await getDownloadURL(storageRef);
        } catch (e) {
          console.warn('[Onboarding] photo upload error:', e);
          // Fall through — emoji or no avatar is fine
        }
      }

      await completeOnboarding(
        user.uid,
        username,
        fullName,
        avatarUrl ? null : selectedEmoji,  // emoji only when no photo
        avatarUrl,
      );
      await refreshUserDoc(); // needsOnboarding flips false → navigator shows Main
    } catch (e) {
      console.warn('[Onboarding] completeOnboarding error:', e);
    } finally {
      setSaving(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Wordmark size={28} letterSpacing={4} />
          </View>

          {/* Progress dots */}
          <View style={styles.dots}>
            {([1, 2, 3] as Step[]).map((s) => (
              <View key={s} style={[styles.dot, step >= s && styles.dotActive]} />
            ))}
          </View>

          {/* ── Step 1: Username ── */}
          {step === 1 && (
            <View style={styles.stepContainer}>
              <Text style={styles.stepEmoji}>👋</Text>
              <Text style={styles.stepTitle}>Choose your username</Text>
              <Text style={styles.stepSubtitle}>
                This is your @handle in GoodGame. You can change it later in settings.
              </Text>

              <View style={styles.usernameRow}>
                <Text style={styles.atPrefix}>@</Text>
                <TextInput
                  style={[
                    styles.input,
                    usernameError ? styles.inputError : null,
                    usernameOk   ? styles.inputOk    : null,
                  ]}
                  value={username}
                  onChangeText={handleUsernameChange}
                  placeholder="yourhandle"
                  placeholderTextColor={Colors.muted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  onSubmitEditing={() => usernameOk && setStep(2)}
                />
                {checkingUsername && (
                  <ActivityIndicator
                    color={Colors.c1}
                    size="small"
                    style={styles.usernameSpinner}
                  />
                )}
                {usernameOk && !checkingUsername && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </View>

              {!!usernameError && (
                <Text style={styles.errorText}>{usernameError}</Text>
              )}
              {usernameOk && (
                <Text style={styles.okText}>@{username} is available!</Text>
              )}

              <PrimaryButton
                label="Next →"
                onPress={() => setStep(2)}
                disabled={!usernameOk}
                style={styles.nextBtn}
              />
            </View>
          )}

          {/* ── Step 2: Full name ── */}
          {step === 2 && (
            <View style={styles.stepContainer}>
              <Text style={styles.stepEmoji}>🏷️</Text>
              <Text style={styles.stepTitle}>What's your name?</Text>
              <Text style={styles.stepSubtitle}>
                Your full name is only shown to your contacts. Totally optional.
              </Text>

              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Jordan King"
                  placeholderTextColor={Colors.muted}
                  autoCapitalize="words"
                  autoCorrect={false}
                  returnKeyType="next"
                  onSubmitEditing={() => setStep(3)}
                />
              </View>

              <PrimaryButton
                label="Next →"
                onPress={() => setStep(3)}
                style={styles.nextBtn}
              />
              <TouchableOpacity style={styles.skipLink} onPress={() => setStep(3)}>
                <Text style={styles.skipLinkText}>Skip for now</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── Step 3: Avatar ── */}
          {step === 3 && (
            <View style={styles.stepContainer}>
              <Text style={styles.stepEmoji}>🎨</Text>
              <Text style={styles.stepTitle}>Pick your vibe</Text>
              <Text style={styles.stepSubtitle}>
                Choose an emoji or upload a photo for your avatar.
              </Text>

              {/* Preview */}
              <View style={styles.avatarPreview}>
                <Avatar
                  uid={user?.uid ?? ''}
                  displayName={username}
                  size={80}
                  emoji={avatarUri ? null : selectedEmoji}
                  uri={avatarUri}
                />
              </View>

              {/* Emoji grid */}
              <View style={styles.emojiGrid}>
                {EMOJI_OPTIONS.map((em) => (
                  <TouchableOpacity
                    key={em}
                    style={[
                      styles.emojiCell,
                      selectedEmoji === em && !avatarUri && styles.emojiCellActive,
                    ]}
                    onPress={() => { setSelectedEmoji(em); setAvatarUri(null); }}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.emojiText}>{em}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Upload photo */}
              <TouchableOpacity
                style={[styles.photoBtn, avatarUri && styles.photoBtnActive]}
                onPress={handlePickPhoto}
                activeOpacity={0.8}
              >
                <Text style={styles.photoBtnText}>
                  {avatarUri ? '📷  Change Photo' : '📷  Upload Photo'}
                </Text>
              </TouchableOpacity>
              {avatarUri && (
                <TouchableOpacity onPress={() => setAvatarUri(null)} style={styles.removePhoto}>
                  <Text style={styles.removePhotoText}>Remove photo</Text>
                </TouchableOpacity>
              )}

              <PrimaryButton
                label={saving ? 'Setting up…' : "Let's Go! 🚀"}
                onPress={handleFinish}
                loading={saving}
                style={styles.nextBtn}
              />
              <TouchableOpacity
                style={styles.skipLink}
                onPress={handleFinish}
                disabled={saving}
              >
                <Text style={styles.skipLinkText}>Skip, use initials</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },

  header: {
    alignItems: 'center',
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },

  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: Spacing.xl,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.border,
  },
  dotActive: {
    backgroundColor: Colors.c1,
  },

  // Step container
  stepContainer: {
    gap: Spacing.md,
  },
  stepEmoji: {
    fontSize: 40,
    textAlign: 'center',
  },
  stepTitle: {
    fontFamily: Typography.heading,
    fontSize: 26,
    color: Colors.text,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  stepSubtitle: {
    fontFamily: Typography.body,
    fontSize: 14,
    color: Colors.dim,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Username row
  usernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  atPrefix: {
    fontFamily: Typography.heading,
    fontSize: 22,
    color: Colors.c1,
    marginBottom: 2,
  },
  usernameSpinner: {
    position: 'absolute',
    right: 14,
  },
  checkmark: {
    position: 'absolute',
    right: 14,
    color: Colors.win,
    fontSize: 18,
    fontWeight: '700',
  },

  // Generic input
  inputWrapper: {},
  input: {
    flex: 1,
    backgroundColor: Colors.bg,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 14,
    color: Colors.text,
    fontFamily: Typography.body,
    fontSize: 16,
  },
  inputError: {
    borderColor: Colors.loss,
  },
  inputOk: {
    borderColor: Colors.win,
  },

  errorText: {
    color: Colors.loss,
    fontSize: 13,
    textAlign: 'center',
    marginTop: -Spacing.xs,
  },
  okText: {
    color: Colors.win,
    fontSize: 13,
    textAlign: 'center',
    marginTop: -Spacing.xs,
  },

  // Avatar preview
  avatarPreview: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },

  // Emoji grid — 4 columns
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    justifyContent: 'center',
  },
  emojiCell: {
    width: 56,
    height: 56,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.raised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiCellActive: {
    borderColor: Colors.c1,
    backgroundColor: `${Colors.c1}18`,
  },
  emojiText: {
    fontSize: 26,
  },

  // Photo upload button
  photoBtn: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingVertical: 13,
    alignItems: 'center',
    backgroundColor: Colors.raised,
  },
  photoBtnActive: {
    borderColor: Colors.c1,
    backgroundColor: `${Colors.c1}18`,
  },
  photoBtnText: {
    fontFamily: Typography.body,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  removePhoto: {
    alignItems: 'center',
    marginTop: -Spacing.xs,
  },
  removePhotoText: {
    fontSize: 12,
    color: Colors.muted,
    textDecorationLine: 'underline',
  },

  nextBtn: {
    marginTop: Spacing.sm,
  },
  skipLink: {
    alignItems: 'center',
  },
  skipLinkText: {
    color: Colors.muted,
    fontSize: 13,
    textDecorationLine: 'underline',
  },
});
