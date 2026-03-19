/**
 * contactService.ts — manage the /users/{uid}/contacts/{contactUid} subcollection.
 *
 * Contacts are stored per-user as a flat subcollection keyed by the contact's UID.
 * Contact data is denormalised (displayName, avatar) so the list can render without
 * a second round-trip. Callers are responsible for keeping data fresh if needed.
 */

import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { getUserDoc } from './userService';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ContactEntry {
  uid:         string;
  displayName: string;
  avatarEmoji: string | null;
  avatarUrl:   string | null;
  addedAt:     any; // Firestore Timestamp
}

// ── Service functions ─────────────────────────────────────────────────────────

/**
 * Add a user to the current user's contacts.
 * Fetches the target user's display name + avatar and denormalises them.
 */
export async function addContact(uid: string, contactUid: string): Promise<void> {
  const contactDoc = await getUserDoc(contactUid);
  if (!contactDoc) throw new Error('User not found');

  await setDoc(doc(db, 'users', uid, 'contacts', contactUid), {
    displayName: contactDoc.displayName,
    avatarEmoji: contactDoc.avatarEmoji ?? null,
    avatarUrl:   contactDoc.avatarUrl   ?? null,
    addedAt:     serverTimestamp(),
  });
}

/** Remove a user from the current user's contacts. */
export async function removeContact(uid: string, contactUid: string): Promise<void> {
  await deleteDoc(doc(db, 'users', uid, 'contacts', contactUid));
}

/** Fetch all contacts for a user, sorted newest-first. */
export async function getContacts(uid: string): Promise<ContactEntry[]> {
  const snap = await getDocs(collection(db, 'users', uid, 'contacts'));
  const entries = snap.docs.map((d) => ({
    uid:         d.id,
    ...(d.data() as Omit<ContactEntry, 'uid'>),
  }));
  // Sort newest-first (addedAt may be null on the first render before server resolves)
  entries.sort((a, b) => {
    const ta = a.addedAt?.seconds ?? 0;
    const tb = b.addedAt?.seconds ?? 0;
    return tb - ta;
  });
  return entries;
}
