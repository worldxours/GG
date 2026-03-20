/**
 * wagerService.ts — all Firestore operations for the wager engine.
 *
 * Every function is a pure async function (no useState, no navigation).
 * Screens call these functions and handle the resulting state updates.
 *
 * All balance mutations use runTransaction for atomicity — no partial states
 * are possible even on network failure or app crash mid-operation.
 */

import {
  collection,
  doc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from 'firebase/firestore';
// Note: postService is NOT imported here to keep service dependencies clean.
// The wager-challenge PostDoc is written inline within the createWager transaction
// so the post and balance deduction happen atomically.
import { db } from './firebase';
import { sendSystemMessage } from './messageService';
import { UserDoc, WagerDoc, WagerCategory, WagerStatus } from '../types';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface WagerWithId {
  id: string;
  data: WagerDoc;
}

export interface CreateWagerData {
  creatorId: string;
  opp: string;
  amount: number;
  desc: string;
  category: WagerCategory;
  expiresAt: string;
}

// ── createWager ───────────────────────────────────────────────────────────────
/**
 * Create a new wager and atomically deduct the creator's wallet balance.
 *
 * Throws if:
 *  - Creator user doc not found
 *  - Creator balance < amount ("Insufficient balance")
 *
 * Returns the new wagerId so the caller can navigate to the wager's chat.
 */
export async function createWager(data: CreateWagerData): Promise<string> {
  const newWagerRef = doc(collection(db, 'wagers'));

  await runTransaction(db, async (tx) => {
    // ── All reads first ──
    const creatorRef = doc(db, 'users', data.creatorId);
    const creatorSnap = await tx.get(creatorRef);
    if (!creatorSnap.exists()) throw new Error('User not found');

    const creator = creatorSnap.data() as UserDoc;
    const balance = creator.walletBalance ?? 0;
    if (balance < data.amount) throw new Error('Insufficient balance');

    // ── All writes ──
    tx.set(newWagerRef, {
      creatorId: data.creatorId,
      opp: data.opp,
      amount: data.amount,
      desc: data.desc,
      category: data.category,
      status: 'pending' as WagerStatus,
      expiresAt: data.expiresAt,
      createdAt: serverTimestamp(),
      settledAt: null,
      winnerId: null,
      result: null,
    });

    tx.update(creatorRef, {
      walletBalance: balance - data.amount,
      lifetimeWagered: (creator.lifetimeWagered ?? 0) + data.amount,
    });

    // ── Auto-post: wager-challenge feed card ──
    // Written atomically with the wager so the feed always reflects active wagers.
    // Security rule: post.userId == request.auth.uid (creator is the caller).
    const postRef = doc(collection(db, 'posts'));
    tx.set(postRef, {
      type:       'wager-challenge',
      userId:     data.creatorId,
      imageUrl:   null,
      caption:    data.desc,      // wager description doubles as the post caption
      topText:    null,
      botText:    null,
      wagerId:    newWagerRef.id,
      amount:     data.amount,
      won:        null,
      opponentId: data.opp,
      createdAt:  serverTimestamp(),
      likes:      0,
      comments:   0,
    });
  });

  return newWagerRef.id;
}

// ── acceptWager ───────────────────────────────────────────────────────────────
/**
 * Opponent accepts a pending wager.
 * Deducts opponent's balance and transitions status → "active".
 *
 * Throws if:
 *  - Wager not found
 *  - Wager is no longer pending
 *  - currentUid is not the wager's opponent
 *  - Opponent balance < wager amount
 */
export async function acceptWager(wagerId: string, currentUid: string): Promise<void> {
  await runTransaction(db, async (tx) => {
    // ── All reads first ──
    const wagerRef = doc(db, 'wagers', wagerId);
    const wagerSnap = await tx.get(wagerRef);
    if (!wagerSnap.exists()) throw new Error('Wager not found');

    const wager = wagerSnap.data() as WagerDoc;
    if (wager.status !== 'pending') throw new Error('Wager is no longer pending');
    if (wager.opp !== currentUid) throw new Error('Not authorised to accept this wager');

    const oppRef = doc(db, 'users', currentUid);
    const oppSnap = await tx.get(oppRef);
    const opp = oppSnap.data() as UserDoc;
    const balance = opp.walletBalance ?? 0;

    if (balance < wager.amount) throw new Error('Insufficient balance to accept this wager');

    // ── All writes ──
    tx.update(wagerRef, { status: 'active' as WagerStatus });
    tx.update(oppRef, {
      walletBalance: balance - wager.amount,
      lifetimeWagered: (opp.lifetimeWagered ?? 0) + wager.amount,
    });
  });

  // System message — non-atomic, informational only
  await sendSystemMessage(wagerId, '✅ Wager accepted — game on!');
}

// ── declineWager ──────────────────────────────────────────────────────────────
/**
 * Opponent declines a pending wager.
 * Refunds the creator's balance and transitions status → "declined".
 *
 * Throws if:
 *  - Wager not found / not pending
 *  - currentUid is not the wager's opponent
 */
export async function declineWager(wagerId: string, currentUid: string): Promise<void> {
  await runTransaction(db, async (tx) => {
    // ── All reads first ──
    const wagerRef = doc(db, 'wagers', wagerId);
    const wagerSnap = await tx.get(wagerRef);
    if (!wagerSnap.exists()) throw new Error('Wager not found');

    const wager = wagerSnap.data() as WagerDoc;
    if (wager.status !== 'pending') throw new Error('Wager is no longer pending');
    if (wager.opp !== currentUid) throw new Error('Not authorised to decline this wager');

    const creatorRef = doc(db, 'users', wager.creatorId);
    const creatorSnap = await tx.get(creatorRef);
    const creator = creatorSnap.data() as UserDoc;

    // ── All writes ──
    tx.update(wagerRef, { status: 'declined' as WagerStatus });
    tx.update(creatorRef, {
      walletBalance: (creator.walletBalance ?? 0) + wager.amount,
    });
  });

  // System message — non-atomic, informational only
  await sendSystemMessage(wagerId, '❌ Wager declined.');
}

// ── settleWager ───────────────────────────────────────────────────────────────
/**
 * Settle an active wager.
 *
 * In one atomic transaction:
 *  - Winner receives the full pot (amount × 2)
 *  - Winner: wins++, currentStreak++, longestStreak updated
 *  - Loser: losses++, currentStreak → 0
 *  - Wager: status → "settled", winnerId, settledAt
 *  - /h2h/{sortedUidPair}: aWins or bWins incremented, totalWagers++
 *
 * Throws if wager not found or not active.
 */
export async function settleWager(wagerId: string, winnerId: string): Promise<void> {
  await runTransaction(db, async (tx) => {
    // ── All reads first ──
    const wagerRef = doc(db, 'wagers', wagerId);
    const wagerSnap = await tx.get(wagerRef);
    if (!wagerSnap.exists()) throw new Error('Wager not found');

    const wager = wagerSnap.data() as WagerDoc;
    if (wager.status !== 'active') throw new Error('Wager is not active');

    const loserId = winnerId === wager.creatorId ? wager.opp : wager.creatorId;
    const pot = wager.amount * 2;

    const winnerRef = doc(db, 'users', winnerId);
    const loserRef  = doc(db, 'users', loserId);

    const winnerSnap = await tx.get(winnerRef);
    const loserSnap  = await tx.get(loserRef);

    const winner = winnerSnap.data() as UserDoc;
    const loser  = loserSnap.data() as UserDoc;

    // H2H doc — ID is the two UIDs sorted alphabetically and joined with '_'
    const sortedUids = [wager.creatorId, wager.opp].sort();
    const h2hRef  = doc(db, 'h2h', sortedUids.join('_'));
    const h2hSnap = await tx.get(h2hRef);
    const h2h = h2hSnap.exists()
      ? h2hSnap.data()
      : { aWins: 0, bWins: 0, totalWagers: 0 };

    // ── All writes ──
    const newStreak   = (winner.currentStreak ?? 0) + 1;
    const newLongest  = Math.max(newStreak, winner.longestStreak ?? 0);

    tx.update(winnerRef, {
      walletBalance:  (winner.walletBalance  ?? 0) + pot,
      wins:           (winner.wins           ?? 0) + 1,
      lifetimeWon:    (winner.lifetimeWon    ?? 0) + pot,
      currentStreak:  newStreak,
      longestStreak:  newLongest,
    });

    tx.update(loserRef, {
      losses:        (loser.losses        ?? 0) + 1,
      currentStreak: 0,
    });

    tx.update(wagerRef, {
      status:    'settled' as WagerStatus,
      winnerId,
      settledAt: serverTimestamp(),
    });

    const isAWinner = sortedUids[0] === winnerId;
    tx.set(h2hRef, {
      aWins:       (h2h.aWins       ?? 0) + (isAWinner ? 1 : 0),
      bWins:       (h2h.bWins       ?? 0) + (isAWinner ? 0 : 1),
      totalWagers: (h2h.totalWagers ?? 0) + 1,
    });
  });
}

// ── getUserWagers ─────────────────────────────────────────────────────────────
/**
 * Fetch all wagers for a user — as creator OR as opponent.
 *
 * Firestore doesn't support OR queries across different fields so we run two
 * queries in parallel and merge the results client-side, sorted newest first.
 */
export async function getUserWagers(uid: string): Promise<WagerWithId[]> {
  const [creatorSnap, oppSnap] = await Promise.all([
    getDocs(query(collection(db, 'wagers'), where('creatorId', '==', uid))),
    getDocs(query(collection(db, 'wagers'), where('opp', '==', uid))),
  ]);

  const seen = new Set<string>();
  const result: WagerWithId[] = [];

  for (const snap of [creatorSnap, oppSnap]) {
    for (const d of snap.docs) {
      if (!seen.has(d.id)) {
        seen.add(d.id);
        result.push({ id: d.id, data: d.data() as WagerDoc });
      }
    }
  }

  // Sort newest first — Firestore Timestamps expose .seconds
  return result.sort((a, b) => {
    const aTs = (a.data.createdAt as any)?.seconds ?? 0;
    const bTs = (b.data.createdAt as any)?.seconds ?? 0;
    return bTs - aTs;
  });
}

// ── getSharedWagers ───────────────────────────────────────────────────────────
/**
 * Fetch wagers shared between two specific users.
 *
 * Only returns wagers where myUid is a participant, so this always satisfies
 * the Firestore rule (which requires request.auth.uid == creatorId or opp).
 * Safe to call when viewing another user's profile.
 */
export async function getSharedWagers(myUid: string, theirUid: string): Promise<WagerWithId[]> {
  const [iCreatedSnap, theyCreatedSnap] = await Promise.all([
    getDocs(query(
      collection(db, 'wagers'),
      where('creatorId', '==', myUid),
      where('opp', '==', theirUid),
    )),
    getDocs(query(
      collection(db, 'wagers'),
      where('creatorId', '==', theirUid),
      where('opp', '==', myUid),
    )),
  ]);

  const result: WagerWithId[] = [
    ...iCreatedSnap.docs.map((d) => ({ id: d.id, data: d.data() as WagerDoc })),
    ...theyCreatedSnap.docs.map((d) => ({ id: d.id, data: d.data() as WagerDoc })),
  ];

  return result.sort((a, b) => {
    const aTs = (a.data.createdAt as any)?.seconds ?? 0;
    const bTs = (b.data.createdAt as any)?.seconds ?? 0;
    return bTs - aTs;
  });
}
