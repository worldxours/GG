import { Timestamp } from 'firebase/firestore';

export type TeamTheme = 'knicks' | 'canucks' | 'flames' | 'raiders' | 'eagles' | '49ers';
export type StatsVisibility = 'private' | 'public';

export interface UserDoc {
  /** @handle — chosen at onboarding, lowercase, 3–20 chars. null = pending onboarding. */
  username: string | null;
  displayName: string;
  fullName: string;
  avatarEmoji: string | null;   // e.g. '⚽' — shown when no photo uploaded
  avatarUrl: string | null;     // Firebase Storage download URL
  walletBalance: number;
  lifetimeWagered: number;
  lifetimeWon: number;
  wins: number;
  losses: number;
  currentStreak: number;
  longestStreak: number;
  statsVisibility: StatsVisibility;
  teamTheme: TeamTheme | null;
  createdAt: Timestamp;
  avatar: string | null;        // legacy field — superseded by avatarEmoji / avatarUrl
  isAdmin: boolean;
  email?: string;               // Firebase Auth email — stored at createUserDoc time for search
}

export type WagerStatus = 'pending' | 'active' | 'settled' | 'declined' | 'expired';
export type WagerCategory = 'Sports' | 'Awards' | 'Politics' | 'Custom';

export interface WagerDoc {
  creatorId: string;
  opp: string;
  amount: number;
  desc: string;
  category: WagerCategory;
  status: WagerStatus;
  createdAt: Timestamp;
  expiresAt: string;
  settledAt: Timestamp | null;
  winnerId: string | null;
  result: string | null;
  lastMessageAt?: Timestamp | null;
  lastMessageText?: string | null;
}

// ── Messages ──────────────────────────────────────────────────────────────────

export type MessageType = 'text' | 'system' | 'wager_card';

export interface MessageDoc {
  text: string;
  userId: string;
  type: MessageType;
  createdAt: Timestamp;
}

export interface MessageWithId extends MessageDoc {
  id: string;
}

export type PostType = 'photo' | 'meme' | 'wager-challenge' | 'wager-result';

export interface PostDoc {
  type: PostType;
  userId: string;
  imageUrl: string | null;
  caption: string | null;
  topText: string | null;
  botText: string | null;
  wagerId: string | null;
  amount: number | null;
  won: boolean | null;
  opponentId: string | null;
  createdAt: Timestamp;
  likes: number;
  comments: number;
}
