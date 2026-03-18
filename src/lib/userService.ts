import { collection, doc, getDoc, getDocs, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { UserDoc } from '../types';

export async function createUserDoc(uid: string, email: string): Promise<void> {
  const userRef = doc(db, 'users', uid);
  const snap = await getDoc(userRef);
  if (snap.exists()) return; // already created — don't overwrite

  const displayName = email.split('@')[0];

  await setDoc(userRef, {
    displayName,
    fullName: '',
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
  });
}

export async function getUserDoc(uid: string): Promise<UserDoc | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? (snap.data() as UserDoc) : null;
}

/**
 * Fetch all users except the current user — used in the opponent selector on
 * the New Wager screen. Returns uid + displayName only (lightweight).
 */
export async function getOtherUsers(
  currentUid: string,
): Promise<Array<{ uid: string; displayName: string }>> {
  const snap = await getDocs(collection(db, 'users'));
  return snap.docs
    .filter((d) => d.id !== currentUid)
    .map((d) => ({
      uid: d.id,
      displayName: (d.data() as UserDoc).displayName,
    }));
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
    const name = snap.exists()
      ? (snap.data() as UserDoc).displayName
      : unique[i].slice(-8);
    map.set(unique[i], name);
  });
  return map;
}
