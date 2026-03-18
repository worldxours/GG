import { Timestamp } from 'firebase/firestore';

export type TeamTheme = 'knicks' | 'canucks' | 'flames' | 'raiders' | 'eagles' | '49ers';
export type StatsVisibility = 'private' | 'public';

export interface UserDoc {
  displayName: string;
  fullName: string;
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
  avatar: string | null;
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
