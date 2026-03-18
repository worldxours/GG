import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Radius } from '../theme';
import { WagerStatus } from '../types';

/**
 * Extend WagerStatus with display-only states used inside the app
 * (e.g. "live" overlays an active wager that has started).
 */
type BadgeStatus = WagerStatus | 'live' | 'win' | 'loss';

interface StatusBadgeProps {
  status: BadgeStatus;
}

// ── Colour map ────────────────────────────────────────────────────────────────
// Each status gets a background tint (rgba) + solid text colour.
const STATUS_CONFIG: Record<
  BadgeStatus,
  { label: string; color: string; bg: string; border: string }
> = {
  pending:  { label: 'PENDING',  color: Colors.pending,  bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.25)'  },
  active:   { label: 'ACTIVE',   color: Colors.live,     bg: 'rgba(34,197,94,0.12)',   border: 'rgba(34,197,94,0.25)'   },
  live:     { label: 'LIVE',     color: Colors.live,     bg: 'rgba(34,197,94,0.12)',   border: 'rgba(34,197,94,0.25)'   },
  win:      { label: 'WIN',      color: Colors.win,      bg: 'rgba(34,197,94,0.12)',   border: 'rgba(34,197,94,0.25)'   },
  settled:  { label: 'SETTLED',  color: Colors.muted,    bg: 'rgba(74,85,104,0.15)',   border: 'rgba(74,85,104,0.25)'   },
  loss:     { label: 'LOSS',     color: Colors.loss,     bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.25)'   },
  declined: { label: 'DECLINED', color: Colors.muted,    bg: 'rgba(74,85,104,0.15)',   border: 'rgba(74,85,104,0.25)'   },
  expired:  { label: 'EXPIRED',  color: Colors.muted,    bg: 'rgba(74,85,104,0.15)',   border: 'rgba(74,85,104,0.25)'   },
};

/**
 * Coloured status pill — used on wager cards, list rows, and the pinned chat card.
 *
 * Pill shape: 10px font, 700 weight, 1.2 letterSpacing, `Radius.xs (8)` corners.
 * Background is a semi-transparent tint of the status colour (not solid).
 *
 * Usage:
 *   <StatusBadge status="pending" />
 *   <StatusBadge status="active" />
 *   <StatusBadge status="win" />
 */
export default function StatusBadge({ status }: StatusBadgeProps) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.settled;

  return (
    <View style={[
      styles.pill,
      { backgroundColor: cfg.bg, borderColor: cfg.border },
    ]}>
      <Text style={[styles.label, { color: cfg.color }]}>
        {cfg.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.xs,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
});
