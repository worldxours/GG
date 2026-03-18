import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { Colors, Spacing, Radius, Typography } from '../theme';
import Avatar from './Avatar';
import { PostWithId } from '../lib/postService';

// Re-export so callers can do: import { PostCard, PostWithId } from '../components'
export type { PostWithId };

// ── Category accent colours (mirrors WagerCard) ───────────────────────────────
const CATEGORY_COLOR: Record<string, string> = {
  Sports:   Colors.c1,
  Awards:   '#ec4899',
  Politics: '#f59e0b',
  Custom:   Colors.c2,
};

// ── Relative time ─────────────────────────────────────────────────────────────
function relativeTime(ts: any): string {
  const secs = (ts as any)?.seconds;
  if (!secs) return '';
  const diff = Math.floor(Date.now() / 1000 - secs);
  if (diff < 60)    return 'just now';
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface PostCardProps {
  post: PostWithId;
  /** Resolved display name for post.data.userId */
  authorName: string;
  /** Resolved display name for post.data.opponentId (wager posts) */
  opponentName?: string;
  style?: ViewStyle;
}

/**
 * PostCard — polymorphic feed card.
 *
 * Handles all 4 post types:
 *   photo          — image + caption
 *   meme           — image with top/bottom text overlay
 *   wager-challenge — "challenged X for $Y" + description
 *   wager-result   — win/loss banner with amount
 *
 * Shared header (avatar + name + timestamp) and footer (likes + comments)
 * across all types. Body varies by type.
 */
export default function PostCard({
  post,
  authorName,
  opponentName = 'Opponent',
  style,
}: PostCardProps) {
  const { data } = post;

  return (
    <View style={[styles.card, style]}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <Avatar uid={data.userId} displayName={authorName} size={36} />
        <View style={styles.headerMeta}>
          <Text style={styles.authorName}>{authorName}</Text>
          <Text style={styles.timestamp}>{relativeTime(data.createdAt)}</Text>
        </View>
      </View>

      {/* ── Body — varies by type ── */}
      {data.type === 'photo' && (
        <PhotoBody imageUrl={data.imageUrl} caption={data.caption} />
      )}
      {data.type === 'meme' && (
        <MemeBody
          imageUrl={data.imageUrl}
          topText={data.topText}
          botText={data.botText}
        />
      )}
      {data.type === 'wager-challenge' && (
        <WagerChallengeBody
          opponentName={opponentName}
          amount={data.amount}
          caption={data.caption}
          category={null}
        />
      )}
      {data.type === 'wager-result' && (
        <WagerResultBody
          won={data.won}
          amount={data.amount}
          opponentName={opponentName}
        />
      )}

      {/* ── Footer ── */}
      <View style={styles.footer}>
        <Text style={styles.footerStat}>❤  {data.likes}</Text>
        <Text style={styles.footerStat}>💬  {data.comments}</Text>
      </View>
    </View>
  );
}

// ── Photo body ────────────────────────────────────────────────────────────────
function PhotoBody({
  imageUrl,
  caption,
}: {
  imageUrl: string | null;
  caption: string | null;
}) {
  return (
    <View>
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={styles.postImage}
          resizeMode="cover"
        />
      ) : null}
      {caption ? (
        <Text style={styles.caption}>{caption}</Text>
      ) : null}
    </View>
  );
}

// ── Meme body ─────────────────────────────────────────────────────────────────
function MemeBody({
  imageUrl,
  topText,
  botText,
}: {
  imageUrl: string | null;
  topText: string | null;
  botText: string | null;
}) {
  if (!imageUrl) return null;
  return (
    <View style={styles.memeWrap}>
      <Image
        source={{ uri: imageUrl }}
        style={styles.memeImage}
        resizeMode="contain"
      />
      {topText ? (
        <Text style={[styles.memeText, styles.memeTextTop]}>{topText.toUpperCase()}</Text>
      ) : null}
      {botText ? (
        <Text style={[styles.memeText, styles.memeTextBot]}>{botText.toUpperCase()}</Text>
      ) : null}
    </View>
  );
}

// ── Wager-challenge body ──────────────────────────────────────────────────────
function WagerChallengeBody({
  opponentName,
  amount,
  caption,
  category,
}: {
  opponentName: string;
  amount: number | null;
  caption: string | null;
  category: string | null;
}) {
  const accent = category ? (CATEGORY_COLOR[category] ?? Colors.c1) : Colors.c1;
  return (
    <View style={styles.wagerChallengeBody}>
      <View style={styles.wagerChallengeRow}>
        <Text style={styles.wagerChallengeIcon}>🎯</Text>
        <View style={styles.wagerChallengeText}>
          <Text style={styles.wagerChallengeLabel}>
            Challenged{' '}
            <Text style={[styles.wagerChallengeName, { color: accent }]}>
              {opponentName}
            </Text>
            {amount !== null ? (
              <Text style={styles.wagerChallengeAmount}> · ${amount} each</Text>
            ) : null}
          </Text>
          {caption ? (
            <Text style={styles.wagerChallengeCaption} numberOfLines={2}>
              "{caption}"
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

// ── Wager-result body ─────────────────────────────────────────────────────────
function WagerResultBody({
  won,
  amount,
  opponentName,
}: {
  won: boolean | null;
  amount: number | null;
  opponentName: string;
}) {
  const isWin = won === true;
  return (
    <View style={[styles.wagerResultBody, isWin ? styles.winResult : styles.lossResult]}>
      <Text style={styles.wagerResultIcon}>{isWin ? '🏆' : '❌'}</Text>
      <View>
        <Text style={[styles.wagerResultLabel, { color: isWin ? Colors.win : Colors.loss }]}>
          {isWin ? 'Won' : 'Lost'}
          {amount !== null ? (
            isWin
              ? ` +$${amount * 2}`
              : ` -$${amount}`
          ) : ''}
        </Text>
        <Text style={styles.wagerResultOpp}>vs {opponentName}</Text>
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.raised,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    shadowColor: Colors.shadowDark,
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 14,
    elevation: 8,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  headerMeta: { flex: 1 },
  authorName: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
  },
  timestamp: {
    fontSize: 11,
    color: Colors.muted,
    marginTop: 1,
  },

  // Footer
  footer: {
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  footerStat: {
    fontSize: 12,
    color: Colors.dim,
    fontWeight: '600',
  },

  // Photo
  postImage: {
    width: '100%',
    aspectRatio: 4 / 3,
    backgroundColor: Colors.bg,
  },
  caption: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },

  // Meme
  memeWrap: {
    width: '100%',
    aspectRatio: 4 / 3,
    backgroundColor: '#000',
    justifyContent: 'space-between',
  },
  memeImage: {
    ...StyleSheet.absoluteFillObject,
  },
  memeText: {
    fontFamily: Typography.heading,
    fontSize: 20,
    color: '#fff',
    textAlign: 'center',
    paddingHorizontal: Spacing.sm,
    // Impact-style: white text, black stroke via text shadow
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
    zIndex: 2,
  },
  memeTextTop: {
    paddingTop: 10,
    alignSelf: 'stretch',
  },
  memeTextBot: {
    paddingBottom: 10,
    alignSelf: 'stretch',
  },

  // Wager challenge
  wagerChallengeBody: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  wagerChallengeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: Colors.bg,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.sm,
  },
  wagerChallengeIcon: { fontSize: 20, lineHeight: 28 },
  wagerChallengeText: { flex: 1 },
  wagerChallengeLabel: {
    fontSize: 13,
    color: Colors.text,
    fontWeight: '600',
    lineHeight: 20,
  },
  wagerChallengeName: { fontWeight: '700' },
  wagerChallengeAmount: {
    fontSize: 12,
    color: Colors.muted,
    fontWeight: '600',
  },
  wagerChallengeCaption: {
    fontSize: 12,
    color: Colors.dim,
    fontStyle: 'italic',
    marginTop: 4,
    lineHeight: 18,
  },

  // Wager result
  wagerResultBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: Spacing.md,
    marginVertical: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  winResult: {
    backgroundColor: 'rgba(34,197,94,0.08)',
    borderColor: Colors.win,
  },
  lossResult: {
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderColor: Colors.loss,
  },
  wagerResultIcon: { fontSize: 28 },
  wagerResultLabel: {
    fontFamily: Typography.heading,
    fontSize: 20,
    letterSpacing: 0.5,
  },
  wagerResultOpp: {
    fontSize: 12,
    color: Colors.muted,
    marginTop: 2,
  },
});
