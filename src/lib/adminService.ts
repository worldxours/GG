import {
  collection,
  collectionGroup,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { UserDoc } from '../types';

export interface UserRow {
  uid: string;
  doc: UserDoc;
}

export interface DepositRow {
  id: string;
  uid: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  method: string;
  createdAt: any;
}

/** Fetch all users — admin only */
export async function getAllUsers(): Promise<UserRow[]> {
  const snap = await getDocs(collection(db, 'users'));
  return snap.docs.map((d) => ({ uid: d.id, doc: d.data() as UserDoc }));
}

/**
 * Atomically inject funds into a user's wallet and record the deposit.
 * NOTE: This is an admin-only operation with no server-side auth check in Phase 2.
 *       Add Firestore security rules before production.
 */
export async function injectFunds(
  uid: string,
  amount: number,
  adminUid: string,
): Promise<void> {
  await runTransaction(db, async (tx) => {
    const userRef = doc(db, 'users', uid);
    const snap = await tx.get(userRef);
    const before = (snap.data()?.walletBalance ?? 0) as number;
    const after = before + amount;

    tx.update(userRef, { walletBalance: after });

    const depRef = doc(collection(db, 'users', uid, 'deposits'));
    tx.set(depRef, {
      amount,
      currency: 'CAD',
      method: 'admin_injection',
      createdAt: serverTimestamp(),
      status: 'completed',
      addedBy: adminUid,
      balanceBefore: before,
      balanceAfter: after,
      notes: '',
    });
  });
}

/**
 * Fetch the most recent 50 deposits across all users.
 * Requires a Firestore collectionGroup index on `deposits` ordered by `createdAt`.
 * If this fails with an index error, follow the link in the Firebase console to create it.
 */
export async function getTransactionLog(): Promise<DepositRow[]> {
  const q = query(
    collectionGroup(db, 'deposits'),
    orderBy('createdAt', 'desc'),
    limit(50),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      uid: d.ref.parent.parent!.id,
      amount: data.amount ?? 0,
      balanceBefore: data.balanceBefore ?? 0,
      balanceAfter: data.balanceAfter ?? 0,
      method: data.method ?? 'admin_injection',
      createdAt: data.createdAt,
    };
  });
}
