import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { createUserDoc, getUserDoc } from '../lib/userService';
import { UserDoc } from '../types';

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
  loading: boolean;
  devMode: boolean;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  skipAuth: () => void;
  refreshUserDoc: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userDoc, setUserDoc] = useState<UserDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [devMode, setDevMode] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const doc = await getUserDoc(firebaseUser.uid);
        setUserDoc(doc);
      } else {
        setUserDoc(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const signUp = async (email: string, password: string): Promise<void> => {
    const { user: newUser } = await createUserWithEmailAndPassword(auth, email, password);
    await createUserDoc(newUser.uid, email);
    const doc = await getUserDoc(newUser.uid);
    setUserDoc(doc);
    // TODO (Phase 5): initCometChat + createCometChatUser(newUser.uid, email)
  };

  const signIn = async (email: string, password: string): Promise<void> => {
    await signInWithEmailAndPassword(auth, email, password);
    // onAuthStateChanged handles user + userDoc hydration
  };

  const signOut = async (): Promise<void> => {
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

  return (
    <AuthContext.Provider
      value={{ user, userDoc, loading, devMode, signUp, signIn, signOut, skipAuth, refreshUserDoc }}
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
