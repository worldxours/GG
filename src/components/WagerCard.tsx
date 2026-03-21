import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { Colors, Spacing, Radius, Typography } from '../theme';
import { WagerStatus, WagerCategory } from '../types';
import Avatar from './Avatar';
import StatusBadge from './StatusBadge';

// ── Enriched wager data ───────────────────────────────────────────────────────
// WagerDoc only stores UIDs — screens pass resolved display names + the doc id.
export interface WagerCardData {
  id: string;
  desc: string;
  amount: number;
  status: WagerStatus;
  /** Optional — defaults to Sports accent when omitted (e.g. when built from a feed post) */
  category?: WagerCategory;
  expiresAt?: string;
  creatorId: string;
  creatorName: string;
  oppId: string;
  oppName: string;
  /** The UID of the currently signed-in user — determines "You vs Them" labelling. */
  currentUid: string;
  winnerId?: string | null;
}

interface WagerCardProps {
  wager: WagerCardData;
  /**
   * compact — single-row list card (Wagers tab, Chat list row, feed challenge)
   * full    — expanded card (Chat pinned card, New Wager preview)
   * Default: false (full)
   */
  compact?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
  /**
   * Accept/Decline callbacks — when provided the card renders an action row
   * at the bottom. Intended for incoming (isIncoming) wagers only.
   */
  onAccept?: (wagerId: string) => void;
  onDecline?: (wagerId: string) => void;
  /** Shows a spinner on the Accept button while the action is in flight. */
  actionLoading?: boolean;
}

// ── Category accent colours ───────────────────────────────────────────────────
const CATEGORY_COLOR: Record<WagerCategory, string> = {
  Sports:   Colors.c1,
  Awards:   '#ec4899',   // pink
  Politics: '#f59e0b',   // amber
  Custom:   Colors.c2,
};

/**
 * WagerCard — the most-reused component in the app.
 *
 * Appears in:
 *   - Wagers tab (compact list rows, with optional accept/decline actions)
 *   - Feed wager-challenge posts (compact, with optional accept/decline actions)
 *   - Chat list (compact rows)
 *   - Chat detail (full pinned card — always at top, never scrolls away)
 *   - New Wager form (full preview card — live-updating as user types)
 *
 * Compact mode layout:
 *   [avatar] [desc + meta row] [amount + badge]
 *   [Accept] [Decline]  ← only when onAccept/onDecline are provided
 *
 * Full mode layout:
 *   [category tag]
 *   [You avatar] vs [Them avatar]  +  [amount (large)]
 *   [description]
 *   [status badge]  [settle-by]
 *
 * The left border accent colour is derived from the wager category.
 */
export default function WagerCard({
  wager,
  compact = false,
  onPress,
  style,
  onAccept,
  onDecline,
  actionLoading = false,
}: WagerCardProps) {
  const isMine = wager.currentUid === wager.creatorId;
  const myName = isMine ? 'You' : wager.creatorName;
  const theirName = isMine ? wager.oppName : wager.creatorName;
  const myId = isMine ? wager.creatorId : wager.oppId;
  const theirId = isMine ? wager.oppId : wager.creatorId;
  const theirDisplayName = isMine ? wager.oppName : wager.creatorName;

  const accentColor = wager.category ? (CATEGORY_COLOR[wager.category] ?? Colors.c1) : Colors.c1;
  const showActions = !!(onAccept || onDecline);

  const innerContent = (
    <>
      {compact
        ? <CompactCard wager={wager} theirId={theirId} theirDisplayName={theirDisplayName} accentColor={accentColor} />
        : <FullCard wager={wager} myId={myId} myName={myName} theirId={theirId} theirName={theirName} accentColor={accentColor} />
      }
      {showActions && (
        <View style={styles.actionRow}>
          {onDecline && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.declineBtn]}
              onPress={() => onDecline(wager.id)}
              disabled={actionLoading}
              activeOpacity={0.85}
            >
              <Text style={styles.declineText}>Decline</Text>
            </TouchableOpacity>
          )}
          {onAccept && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.acceptBtn]}
              onPress={() => onAccept(wager.id)}
              disabled={actionLoading}
              activeOpacity={0.85}
            >
              {actionLoading
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.acceptText}>Accept</Text>
              }
            </TouchableOpacity>
          )}
        </View>
      )}
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        style={[styles.cardBase, { borderLeftColor: accentColor }, style]}
        onPress={onPress}
        activeOpacity={0.85}
      >
        {innerContent}
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.cardBase, { borderLeftColor: accentColor }, style]}>
      {innerContent}
    </View>
  );
}

// ── Compact layout ────────────────────────────────────────────────────────────
function CompactCard({
  wager,
  theirId,
  theirDisplayName,
  accentColor,
}: {
  wager: WagerCardData;
  theirId: string;
  theirDisplayName: string;
  accentColor: string;
}) {
  return (
    <View style={styles.compactRow}>
      <Avatar uid={theirId} displayName={theirDisplayName} size={36} />
      <View style={styles.compactBody}>
        <Text style={styles.compactDesc} numberOfLines={1}>
          {wager.desc || 'No description'}
        </Text>
        <View style={styles.compactMeta}>
          <Text style={styles.compactOpp}>{theirDisplayName}</Text>
          {wager.expiresAt ? (
            <Text style={styles.compactExpiry} numberOfLines={1}>
              · {wager.expiresAt}
            </Text>
          ) : null}
        </View>
      </View>
      <View style={styles.compactRight}>
        <Text style={[styles.compactAmount, { color: accentColor }]}>
          ${wager.amount}
        </Text>
        <StatusBadge status={wager.status} />
      </View>
    </View>
  );
}

// ── Full layout ───────────────────────────────────────────────────────────────
function FullCard({
  wager,
  myId,
  myName,
  theirId,
  theirName,
  accentColor,
}: {
  wager: WagerCardData;
  myId: string;
  myName: string;
  theirId: string;
  theirName: string;
  accentColor: string;
}) {
  return (
    <View>
      {/* Category tag */}
      {wager.category ? (
        <Text style={[styles.categoryTag, { color: accentColor }]}>
          {wager.category.toUpperCase()}
        </Text>
      ) : null}

      {/* VS row — avatars + amount */}
      <View style={styles.fullVsRow}>
        <View style={styles.fullPlayer}>
          <Avatar uid={myId} displayName={myName} size={44} />
          <Text style={styles.fullPlayerName} numberOfLines={1}>{myName}</Text>
        </View>

        <View style={styles.fullAmountBlock}>
          <Text style={[styles.fullAmount, { color: accentColor }]}>
            ${wager.amount}
          </Text>
          <Text style={styles.fullVsLabel}>each</Text>
        </View>

        <View style={styles.fullPlayer}>
          <Avatar uid={theirId} displayName={theirName} size={44} />
          <Text style={styles.fullPlayerName} numberOfLines={1}>{theirName}</Text>
        </View>
      </View>

      {/* Description */}
      <Text style={styles.fullDesc}>{wager.desc || 'No description'}</Text>

      {/* Footer — status + settle-by */}
      <View style={styles.fullFooter}>
        <StatusBadge status={wager.status} />
        {wager.expiresAt ? (
          <Text style={styles.fullExpiry} numberOfLines={1}>
            Settles: {wager.expiresAt}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // Shared card container — raised, left accent border
  cardBase: {
    backgroundColor: Colors.raised,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderLeftWidth: 3,
    // borderLeftColor set dynamically via accentColor
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    shadowColor: Colors.shadowDark,
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 14,
    elevation: 8,
  },

  // ── Compact ──────────────────────────────────────────────────────────────
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  compactBody: {
    flex: 1,
    minWidth: 0,
  },
  compactDesc: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 3,
  },
  compactMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  compactOpp: {
    fontSize: 11,
    color: Colors.muted,
  },
  compactExpiry: {
    fontSize: 11,
    color: Colors.muted,
    flex: 1,
  },
  compactRight: {
    alignItems: 'flex-end',
    gap: 4,
    flexShrink: 0,
  },
  compactAmount: {
    fontFamily: Typography.heading,
    fontSize: 15,
    letterSpacing: 0.5,
  },

  // ── Full ──────────────────────────────────────────────────────────────────
  categoryTag: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.8,
    marginBottom: Spacing.sm,
  },
  fullVsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  fullPlayer: {
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  fullPlayerName: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.dim,
    textAlign: 'center',
  },
  fullAmountBlock: {
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
  },
  fullAmount: {
    fontFamily: Typography.heading,
    fontSize: 26,
    letterSpacing: 1,
  },
  fullVsLabel: {
    fontSize: 10,
    color: Colors.muted,
    letterSpacing: 0.5,
  },
  fullDesc: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  fullFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fullExpiry: {
    fontSize: 11,
    color: Colors.muted,
    flex: 1,
    textAlign: 'right',
  },

  // ── Action row (accept / decline) ────────────────────────────────────────
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: Spacing.sm,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  acceptBtn: {
    backgroundColor: Colors.win,
    shadowColor: Colors.win,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  acceptText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  declineBtn: {
    backgroundColor: Colors.bg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  declineText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.muted,
  },
});
