/**
 * messageService.ts — Firestore operations for wager chat messages.
 *
 * Messages live in a subcollection: /wagers/{wagerId}/messages/{msgId}
 * Real-time updates via onSnapshot — works in development build and web.
 *
 * All functions are pure (no useState, no navigation).
 */

import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import { MessageDoc, MessageType, MessageWithId } from '../types';

// ── sendMessage ───────────────────────────────────────────────────────────────
/**
 * Send a message to a wager's chat thread.
 * Also updates the wager doc's lastMessageAt / lastMessageText for chat list ordering.
 */
export async function sendMessage(
  wagerId: string,
  userId: string,
  text: string,
  type: MessageType = 'text',
): Promise<void> {
  const messagesRef = collection(db, 'wagers', wagerId, 'messages');
  await addDoc(messagesRef, {
    text,
    userId,
    type,
    createdAt: serverTimestamp(),
  } satisfies Omit<MessageDoc, 'createdAt'> & { createdAt: ReturnType<typeof serverTimestamp> });

  // Update wager doc for chat list preview + ordering (non-atomic, informational only)
  const wagerRef = doc(db, 'wagers', wagerId);
  await updateDoc(wagerRef, {
    lastMessageAt: serverTimestamp(),
    lastMessageText: text.slice(0, 60),
  });
}

// ── sendSystemMessage ─────────────────────────────────────────────────────────
/**
 * Post an automated system message to a wager's chat thread.
 * userId is set to 'system' — ChatBubble renders these centered and muted.
 */
export async function sendSystemMessage(wagerId: string, text: string): Promise<void> {
  await sendMessage(wagerId, 'system', text, 'system');
}

// ── subscribeToMessages ───────────────────────────────────────────────────────
/**
 * Subscribe to real-time message updates for a wager's chat.
 * Messages are ordered createdAt asc (oldest → newest).
 * Returns an unsubscribe function — call it in useEffect cleanup.
 */
export function subscribeToMessages(
  wagerId: string,
  callback: (messages: MessageWithId[]) => void,
): () => void {
  const q = query(
    collection(db, 'wagers', wagerId, 'messages'),
    orderBy('createdAt', 'asc'),
  );

  return onSnapshot(q, (snap) => {
    const messages: MessageWithId[] = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as MessageDoc),
    }));
    callback(messages);
  });
}

// ── getH2H ───────────────────────────────────────────────────────────────────
/**
 * Get the head-to-head record between two users.
 * H2H doc ID = the two UIDs sorted alphabetically and joined with '_'.
 * Returns the record normalised to the caller's perspective (myWins / theirWins).
 * Returns zeros if no H2H doc exists yet (new opponent pair).
 */
export async function getH2H(
  myUid: string,
  theirUid: string,
): Promise<{ myWins: number; theirWins: number; totalWagers: number }> {
  const sortedUids = [myUid, theirUid].sort();
  const h2hRef = doc(db, 'h2h', sortedUids.join('_'));
  const snap = await getDoc(h2hRef);

  if (!snap.exists()) {
    return { myWins: 0, theirWins: 0, totalWagers: 0 };
  }

  const data = snap.data() as { aWins: number; bWins: number; totalWagers: number };
  const iAmA = sortedUids[0] === myUid;

  return {
    myWins:      iAmA ? (data.aWins ?? 0) : (data.bWins ?? 0),
    theirWins:   iAmA ? (data.bWins ?? 0) : (data.aWins ?? 0),
    totalWagers: data.totalWagers ?? 0,
  };
}
