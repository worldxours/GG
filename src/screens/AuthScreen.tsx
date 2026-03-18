import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { useAuth, getAuthErrorMessage } from '../context/AuthContext';
import { Colors, Spacing, Radius } from '../theme';
import { Wordmark } from '../components';

type Mode = 'signup' | 'login';

export default function AuthScreen() {
  const { signUp, signIn, skipAuth } = useAuth();

  const [mode, setMode] = useState<Mode>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const validateLocally = (): string | null => {
    if (!email.trim()) return 'Email is required';
    if (!password.trim()) return 'Password is required';
    if (password.length < 6) return 'Password must be at least 6 characters';
    if (!/\S+@\S+\.\S+/.test(email)) return 'Please enter a valid email address';
    return null;
  };

  const handleSubmit = async () => {
    setError('');
    const localError = validateLocally();
    if (localError) { setError(localError); return; }

    setLoading(true);
    try {
      if (mode === 'signup') {
        await signUp(email.trim().toLowerCase(), password);
      } else {
        await signIn(email.trim().toLowerCase(), password);
      }
    } catch (e: any) {
      const code = (e as { code?: string }).code ?? '';
      setError(getAuthErrorMessage(code));
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (next: Mode) => { setMode(next); setError(''); };

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
          {/* Wordmark — RUN plain + IT in accent colour, matching prototype */}
          <View style={styles.wordmarkContainer}>
            <Wordmark size={40} letterSpacing={4} />
            <Text style={styles.tagline}>Wager with your friends. Settle with receipts.</Text>
          </View>

          {/* Mode toggle */}
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[styles.toggleBtn, mode === 'signup' && styles.toggleBtnActive]}
              onPress={() => switchMode('signup')}
              activeOpacity={0.8}
            >
              <Text style={[styles.toggleLabel, mode === 'signup' && styles.toggleLabelActive]}>
                Sign Up
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, mode === 'login' && styles.toggleBtnActive]}
              onPress={() => switchMode('login')}
              activeOpacity={0.8}
            >
              <Text style={[styles.toggleLabel, mode === 'login' && styles.toggleLabelActive]}>
                Log In
              </Text>
            </TouchableOpacity>
          </View>

          {/* Inputs */}
          <View style={styles.form}>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>EMAIL</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={(t) => { setEmail(t); setError(''); }}
                placeholder="your@email.com"
                placeholderTextColor={Colors.muted}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
              />
            </View>

            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>PASSWORD</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={(t) => { setPassword(t); setError(''); }}
                placeholder="6+ characters"
                placeholderTextColor={Colors.muted}
                secureTextEntry
                textContentType={mode === 'signup' ? 'newPassword' : 'password'}
              />
            </View>

            {!!error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.ctaBtn, loading && styles.ctaBtnDisabled]}
              onPress={handleSubmit}
              activeOpacity={0.85}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.ctaLabel}>
                  {mode === 'signup' ? 'Create Account' : 'Log In'}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.skipBtn} onPress={skipAuth} activeOpacity={0.7}>
            <Text style={styles.skipLabel}>Skip for now</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
    justifyContent: 'center',
    minHeight: '100%' as any,
  },

  // Wordmark
  wordmarkContainer: { alignItems: 'center', marginBottom: Spacing.xxl },
  tagline: { color: Colors.muted, fontSize: 13, marginTop: 8 },

  // Toggle
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: Colors.raised,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 4,
    marginBottom: Spacing.lg,
  },
  toggleBtn: { flex: 1, paddingVertical: 10, borderRadius: Radius.xl - 2, alignItems: 'center' },
  toggleBtnActive: {
    backgroundColor: Colors.c1,
    shadowColor: Colors.c1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 4,
  },
  toggleLabel: { color: Colors.dim, fontSize: 14, fontWeight: '600' },
  toggleLabelActive: { color: '#fff' },

  // Form
  form: { gap: Spacing.md },
  inputWrapper: { gap: 6 },
  inputLabel: { color: Colors.muted, fontSize: 10, letterSpacing: 1.5, fontWeight: '600', marginLeft: 4 },
  input: {
    backgroundColor: Colors.bg,     // inset look — darker than card surface
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,                // prototype uses 16px for auth fields
    paddingHorizontal: 18,
    paddingVertical: 14,
    color: Colors.text,
    fontSize: 16,                    // prototype: 16px
  },

  // Error
  errorBox: {
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  errorText: { color: Colors.loss, fontSize: 13, textAlign: 'center' },

  // CTA — prototype: btn-primary uses borderRadius 18px
  ctaBtn: {
    backgroundColor: Colors.c1,
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: Spacing.sm,
    shadowColor: Colors.c1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 6,
  },
  ctaBtnDisabled: { opacity: 0.6 },
  ctaLabel: { color: '#fff', fontSize: 15, fontFamily: 'Syne_800ExtraBold', letterSpacing: 0.5 },

  // Skip
  skipBtn: { alignItems: 'center', marginTop: Spacing.xl },
  skipLabel: { color: Colors.muted, fontSize: 13, textDecorationLine: 'underline' },
});
