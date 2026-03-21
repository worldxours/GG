import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { Colors, Spacing, Radius, Typography } from '../theme';
import Avatar from './Avatar';
import WagerCard from './WagerCard';
import { PostWithId } from '../lib/postService';

// Re-export so callers can do: import { PostCard, PostWithId } from '../components'
export type { PostWithId };

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
  /** UID of the currently signed-in user — used to decide whether to show accept/decline */
  currentUid?: string;
  style?: ViewStyle;
  /** Called when the author avatar / name is tapped — navigate to their profile */
  onPressAuthor?: (uid: string) => void;
  /** Called when the opponent name is tapped on wager posts — navigate to their profile */
  onPressOpponent?: (uid: string) => void;
  /** Called when the viewer is the challenged opponent and taps Accept */
  onAccept?: (wagerId: string) => void;
  /** Called when the viewer is the challenged opponent and taps Decline */
  onDecline?: (wagerId: string) => void;
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
  currentUid,
  style,
  onPressAuthor,
  onPressOpponent,
  onAccept,
  onDecline,
}: PostCardProps) {
  const { data } = post;

  const headerInner = (
    <>
      <Avatar uid={data.userId} displayName={authorName} size={36} />
      <View style={styles.headerMeta}>
        <Text style={styles.authorName}>{authorName}</Text>
        <Text style={styles.timestamp}>{relativeTime(data.createdAt)}</Text>
      </View>
    </>
  );

  return (
    <View style={[styles.card, style]}>
      {/* ── Header ── */}
      {onPressAuthor ? (
        <TouchableOpacity
          style={styles.header}
          onPress={() => onPressAuthor(data.userId)}
          activeOpacity={0.7}
        >
          {headerInner}
        </TouchableOpacity>
      ) : (
        <View style={styles.header}>{headerInner}</View>
      )}

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
      {data.type === 'wager-challenge' && data.wagerId && (
        <View style={styles.wagerCardWrap}>
          <WagerCard
            compact
            wager={{
              id:          data.wagerId,
              desc:        data.caption ?? '',
              amount:      data.amount ?? 0,
              status:      'pending',
              creatorId:   data.userId,
              creatorName: authorName,
              oppId:       data.opponentId ?? '',
              oppName:     opponentName,
              currentUid:  currentUid ?? '',
            }}
            onAccept={onAccept}
            onDecline={onDecline}
            onPress={
              onPressOpponent && data.opponentId
                ? () => onPressOpponent!(data.opponentId!)
                : undefined
            }
          />
        </View>
      )}
      {data.type === 'wager-result' && (
        <WagerResultBody
          won={data.won}
          amount={data.amount}
          opponentName={opponentName}
          onPressOpponent={
            onPressOpponent && data.opponentId
              ? () => onPressOpponent(data.opponentId!)
              : undefined
          }
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

// ── Wager-result body ─────────────────────────────────────────────────────────
function WagerResultBody({
  won,
  amount,
  opponentName,
  onPressOpponent,
}: {
  won: boolean | null;
  amount: number | null;
  opponentName: string;
  onPressOpponent?: () => void;
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
        <Text
          style={[styles.wagerResultOpp, onPressOpponent && styles.wagerResultOppTappable]}
          onPress={onPressOpponent}
          suppressHighlighting
        >
          vs {opponentName}
        </Text>
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

  // Wager challenge — WagerCard rendered inside padding wrapper
  wagerCardWrap: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
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
  wagerResultOppTappable: {
    color: Colors.dim,
    textDecorationLine: 'underline',
  },
});
