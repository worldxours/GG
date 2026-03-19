import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import {
  createUserDoc,
  getUserDoc,
  ensureAdminFlag,
  migrateUserIfNeeded,
} from '../lib/userService';
import { initCometChat, createCometChatUser, loginCometChat, logoutCometChat } from '../lib/cometchat';
import { UserDoc } from '../types';

const ADMIN_EMAIL = process.env.EXPO_PUBLIC_ADMIN_EMAIL ?? '';

// Map Firebase error codes to user-friendly messages
export function getAuthErrorMessage(code: string): string {
  switch (code) {
    case 'auth/email-already-in-use':
      return 'An account with this email already exists';
    case 'auth/invalid-email':
      return 'Please enter a valid email address';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Incorrect email or password';
    case 'auth/too-many-requests':
      return 'Too many attempts — try again later';
    case 'auth/network-request-failed':
      return 'Network error — check your connection';
    default:
      return 'Something went wrong — please try again';
  }
}

interface AuthContextValue {
  user: User | null;
  userDoc: UserDoc | null;
  isAdmin: boolean;
  loading: boolean;
  devMode: boolean;
  /** True once CometChat init + login have completed for the current user. */
  cometChatReady: boolean;
  /**
   * True when the user is authenticated but hasn't completed onboarding yet
   * (username === null). New users land here; existing users are silently
   * migrated on sign-in and will never see this state.
   */
  needsOnboarding: boolean;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  skipAuth: () => void;
  refreshUserDoc: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]                     = useState<User | null>(null);
  const [userDoc, setUserDoc]               = useState<UserDoc | null>(null);
  const [loading, setLoading]               = useState(true);
  const [devMode, setDevMode]               = useState(false);
  const [cometChatReady, setCometChatReady] = useState(false);

  useEffect(() => {
    let unsub: (() => void) | undefined;

    const setup = async () => {
      // ── Init CometChat once (must complete before any login calls) ─────────
      // Awaited before auth listener, but does NOT block the app loading state.
      // onAuthStateChanged sets loading=false as soon as Firebase is ready.
      // Chat screens gate their fetches behind cometChatReady.
      try {
        await initCometChat();
      } catch (e) {
        console.warn('[CometChat] init error:', e);
      }

      unsub = onAuthStateChanged(auth, async (firebaseUser) => {
        setUser(firebaseUser);
        setCometChatReady(false); // reset on every auth state change

        if (firebaseUser) {
          if (ADMIN_EMAIL && firebaseUser.email === ADMIN_EMAIL) {
            await ensureAdminFlag(firebaseUser.uid);
          }

          let doc = await getUserDoc(firebaseUser.uid);

          // ── Silent migration for pre-Phase-7 accounts ────────────────────
          // Existing users lack the 'username' field entirely (undefined).
          // New users have username: null (set by createUserDoc).
          // migrateUserIfNeeded only runs for existing users, giving them a
          // safe default username so they bypass the onboarding screen.
          if (doc && !('username' in (doc as unknown as Record<string, unknown>))) {
            await migrateUserIfNeeded(firebaseUser.uid, doc);
            doc = await getUserDoc(firebaseUser.uid); // re-fetch with migrated fields
          }

          setUserDoc(doc);
          setLoading(false); // app is interactive from here

          // CometChat in background — does not block rendering
          try {
            const displayName = doc?.displayName ?? firebaseUser.uid.slice(-6);
            await createCometChatUser(firebaseUser.uid, displayName);
            await loginCometChat(firebaseUser.uid);
            setCometChatReady(true);
          } catch (e) {
            console.warn('[CometChat] session error:', e);
          }
        } else {
          setUserDoc(null);
          setLoading(false);
        }
      });
    };

    setup();
    return () => unsub?.();
  }, []);

  const signUp = async (email: string, password: string): Promise<void> => {
    const { user: newUser } = await createUserWithEmailAndPassword(auth, email, password);
    await createUserDoc(newUser.uid, email);
    const doc = await getUserDoc(newUser.uid);
    setUserDoc(doc);
    // CometChat — email prefix placeholder until onboarding sets the real username
    const displayName = email.split('@')[0];
    await createCometChatUser(newUser.uid, displayName);
    await loginCometChat(newUser.uid);
    setCometChatReady(true);
  };

  const signIn = async (email: string, password: string): Promise<void> => {
    await signInWithEmailAndPassword(auth, email, password);
    // onAuthStateChanged handles migration, setUserDoc, and CometChat login
  };

  const signOut = async (): Promise<void> => {
    setCometChatReady(false);
    await logoutCometChat();
    await firebaseSignOut(auth);
    setDevMode(false);
  };

  const skipAuth = (): void => {
    setDevMode(true);
    setLoading(false);
  };

  const refreshUserDoc = async (): Promise<void> => {
    if (!user) return;
    const doc = await getUserDoc(user.uid);
    setUserDoc(doc);
  };

  const isAdmin = userDoc?.isAdmin === true;

  // True only for new users who have username: null (pending onboarding)
  const needsOnboarding = (
    user !== null &&
    !devMode &&
    userDoc !== null &&
    userDoc.username === null
  );

  return (
    <AuthContext.Provider
      value={{
        user, userDoc, isAdmin, loading, devMode,
        cometChatReady, needsOnboarding,
        signUp, signIn, signOut, skipAuth, refreshUserDoc,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
