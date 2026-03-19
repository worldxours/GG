import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { UserDoc } from '../types';

// ── Core CRUD ─────────────────────────────────────────────────────────────────

/**
 * Create the initial Firestore user document on sign-up.
 * username is explicitly set to null so OnboardingScreen is shown.
 */
export async function createUserDoc(uid: string, email: string): Promise<void> {
  const userRef = doc(db, 'users', uid);
  const snap = await getDoc(userRef);
  if (snap.exists()) return; // idempotent

  const displayName = email.split('@')[0];

  await setDoc(userRef, {
    username: null,       // null = pending onboarding
    displayName,
    fullName: '',
    avatarEmoji: null,
    avatarUrl: null,
    walletBalance: 0,
    lifetimeWagered: 0,
    lifetimeWon: 0,
    wins: 0,
    losses: 0,
    currentStreak: 0,
    longestStreak: 0,
    statsVisibility: 'private',
    teamTheme: null,
    createdAt: serverTimestamp(),
    avatar: null,
    isAdmin: false,
  });
}

export async function getUserDoc(uid: string): Promise<UserDoc | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? (snap.data() as UserDoc) : null;
}

/**
 * Fetch all users except the current user.
 * Returns uid + displayName + avatar fields for the user picker.
 */
export async function getOtherUsers(
  currentUid: string,
): Promise<Array<{ uid: string; displayName: string; avatarEmoji: string | null; avatarUrl: string | null }>> {
  const snap = await getDocs(collection(db, 'users'));
  return snap.docs
    .filter((d) => d.id !== currentUid)
    .map((d) => {
      const data = d.data() as UserDoc;
      return {
        uid:         d.id,
        // Prefer username (canonical @handle) over raw displayName
        displayName: data.username ?? data.displayName,
        avatarEmoji: data.avatarEmoji ?? null,
        avatarUrl:   data.avatarUrl   ?? null,
      };
    });
}

/**
 * Batch-fetch display names for a list of UIDs.
 * Returns a Map of uid → displayName for efficient lookup.
 * Falls back to the last 8 chars of the uid if the doc is missing.
 */
export async function getUserDisplayNames(
  uids: string[],
): Promise<Map<string, string>> {
  const unique = [...new Set(uids)];
  const snaps  = await Promise.all(
    unique.map((uid) => getDoc(doc(db, 'users', uid))),
  );
  const map = new Map<string, string>();
  snaps.forEach((snap, i) => {
    if (snap.exists()) {
      const data = snap.data() as UserDoc;
      // Prefer username (canonical @handle) — falls back to displayName for
      // accounts in an inconsistent state, then to a UID suffix.
      map.set(unique[i], data.username ?? data.displayName ?? unique[i].slice(-8));
    } else {
      map.set(unique[i], unique[i].slice(-8));
    }
  });
  return map;
}

/**
 * Update profile fields — team theme, stats visibility, full name, avatar.
 * For username changes use updateUsername() — it also updates /usernames/ claim.
 */
export async function updateUserProfile(
  uid: string,
  updates: Partial<Pick<UserDoc, 'teamTheme' | 'statsVisibility' | 'displayName' | 'fullName' | 'avatarEmoji' | 'avatarUrl'>>,
): Promise<void> {
  await updateDoc(doc(db, 'users', uid), updates as Record<string, unknown>);
}

/**
 * Ensure the admin user's Firestore doc has isAdmin: true.
 */
export async function ensureAdminFlag(uid: string): Promise<void> {
  const userRef = doc(db, 'users', uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) {
    await setDoc(userRef, {
      username: 'admin',
      displayName: 'admin',
      fullName: '',
      avatarEmoji: null,
      avatarUrl: null,
      walletBalance: 0,
      lifetimeWagered: 0,
      lifetimeWon: 0,
      wins: 0,
      losses: 0,
      currentStreak: 0,
      longestStreak: 0,
      statsVisibility: 'private',
      teamTheme: null,
      createdAt: serverTimestamp(),
      avatar: null,
      isAdmin: true,
    });
  } else if (!(snap.data() as UserDoc).isAdmin) {
    await updateDoc(userRef, { isAdmin: true });
  }
}

// ── Username / Onboarding ─────────────────────────────────────────────────────

/**
 * Check if a username is available.
 * Usernames are stored lowercase in /usernames/{username} → { uid }.
 */
export async function isUsernameAvailable(username: string): Promise<boolean> {
  const snap = await getDoc(doc(db, 'usernames', username.toLowerCase()));
  return !snap.exists();
}

/**
 * Finalize onboarding for a new user.
 * Claims the username in /usernames/ and updates the user doc.
 */
export async function completeOnboarding(
  uid: string,
  username: string,
  fullName: string,
  avatarEmoji: string | null,
  avatarUrl: string | null,
): Promise<void> {
  const lc = username.toLowerCase();
  await setDoc(doc(db, 'usernames', lc), { uid });
  await updateDoc(doc(db, 'users', uid), {
    username:   lc,
    displayName: lc,   // username IS the display name
    fullName:   fullName.trim(),
    avatarEmoji,
    avatarUrl,
  });
}

/**
 * Change a username — releases old /usernames/ claim, claims new one.
 * Caller must verify availability first via isUsernameAvailable().
 */
export async function updateUsername(
  uid: string,
  oldUsername: string | null,
  newUsername: string,
): Promise<void> {
  const lc = newUsername.toLowerCase();
  if (oldUsername) {
    try { await deleteDoc(doc(db, 'usernames', oldUsername.toLowerCase())); } catch {}
  }
  await setDoc(doc(db, 'usernames', lc), { uid });
  await updateDoc(doc(db, 'users', uid), { username: lc, displayName: lc });
}

/**
 * Silent migration for accounts created before the username/avatar schema (Phase 7).
 * Detects existing users by the ABSENCE of the 'username' field in their Firestore doc
 * (field doesn't exist = pre-schema user; field = null = new user awaiting onboarding).
 * Sets a safe default username so they bypass the onboarding screen.
 */
export async function migrateUserIfNeeded(uid: string, userDoc: UserDoc): Promise<void> {
  if ('username' in (userDoc as unknown as Record<string, unknown>)) return; // already migrated

  const raw = (userDoc.displayName ?? uid.slice(-8))
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 20);

  const safeUsername = raw.length >= 3 ? raw : uid.slice(-8).replace(/[^a-z0-9]/g, '').slice(0, 20);

  await updateDoc(doc(db, 'users', uid), {
    username:    safeUsername,
    displayName: safeUsername, // keep displayName in sync so legacy reads are also clean
    avatarEmoji: null,
    avatarUrl:   null,
  });

  // Claim username (best-effort — no throw if taken)
  try {
    const snap = await getDoc(doc(db, 'usernames', safeUsername));
    if (!snap.exists()) await setDoc(doc(db, 'usernames', safeUsername), { uid });
  } catch {}
}
