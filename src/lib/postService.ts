/**
 * postService.ts — all Firestore operations for the social feed.
 *
 * Pure async functions, no useState, no navigation.
 * Screens call these functions and handle the resulting state.
 */

import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import { PostDoc, PostType } from '../types';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PostWithId {
  id: string;
  data: PostDoc;
}

export interface CreatePostData {
  type: PostType;
  userId: string;
  imageUrl?: string | null;
  caption?: string | null;
  topText?: string | null;
  botText?: string | null;
  wagerId?: string | null;
  amount?: number | null;
  won?: boolean | null;
  opponentId?: string | null;
}

// ── createPost ────────────────────────────────────────────────────────────────
/**
 * Write a new post to the /posts collection.
 * Returns the new post's Firestore ID.
 */
export async function createPost(data: CreatePostData): Promise<string> {
  const postRef = doc(collection(db, 'posts'));

  await setDoc(postRef, {
    type:       data.type,
    userId:     data.userId,
    imageUrl:   data.imageUrl   ?? null,
    caption:    data.caption    ?? null,
    topText:    data.topText    ?? null,
    botText:    data.botText    ?? null,
    wagerId:    data.wagerId    ?? null,
    amount:     data.amount     ?? null,
    won:        data.won        ?? null,
    opponentId: data.opponentId ?? null,
    createdAt:  serverTimestamp(),
    likes:      0,
    comments:   0,
  });

  return postRef.id;
}

// ── getFeedPosts ──────────────────────────────────────────────────────────────
/**
 * Fetch the most recent posts for the social feed.
 * Ordered by createdAt desc. No per-user filter — this is a global feed.
 *
 * Firestore auto-indexes single-field orderBy queries, so no manual index needed.
 */
export async function getFeedPosts(limitCount = 50): Promise<PostWithId[]> {
  const q = query(
    collection(db, 'posts'),
    orderBy('createdAt', 'desc'),
    limit(limitCount),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, data: d.data() as PostDoc }));
}
