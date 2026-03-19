import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Radius, Spacing, Typography } from '../theme';
import Avatar from './Avatar';

// Decoupled from Firestore and CometChat — callers adapt their message type to this.
export interface NormalizedMessage {
  id: string;
  text: string;
  type: 'text' | 'system' | 'wager_card';
  senderUid: string;
  createdAt: number; // unix ms
}

interface ChatBubbleProps {
  message: NormalizedMessage;
  isMine: boolean;
  senderName?: string;
}

export default function ChatBubble({ message, isMine, senderName }: ChatBubbleProps) {
  const { text, type, senderUid } = message;

  // ── System message — centred muted italic ───────────────────────────────────
  if (type === 'system') {
    return (
      <View style={styles.systemRow}>
        <Text style={styles.systemText}>{text}</Text>
      </View>
    );
  }

  // ── Own message — right-aligned, c1 bg ─────────────────────────────────────
  if (isMine) {
    return (
      <View style={styles.ownRow}>
        <View style={styles.ownBubble}>
          <Text style={styles.ownText}>{text}</Text>
        </View>
      </View>
    );
  }

  // ── Other message — left-aligned, raised neomorphic + avatar ───────────────
  return (
    <View style={styles.otherRow}>
      {senderUid ? (
        <Avatar uid={senderUid} displayName={senderName ?? '?'} size={28} />
      ) : (
        <View style={styles.avatarPlaceholder} />
      )}
      <View style={styles.otherContent}>
        {senderName ? (
          <Text style={styles.senderName}>{senderName}</Text>
        ) : null}
        <View style={styles.otherBubble}>
          <Text style={styles.otherText}>{text}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // System
  systemRow: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  systemText: {
    fontFamily: Typography.body,
    fontSize: 12,
    color: Colors.muted,
    fontStyle: 'italic',
    textAlign: 'center',
  },

  // Own message
  ownRow: {
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 3,
  },
  ownBubble: {
    backgroundColor: Colors.c1,
    borderRadius: Radius.lg,
    borderBottomRightRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 9,
    maxWidth: '75%',
  },
  ownText: {
    fontFamily: Typography.body,
    fontSize: 14,
    color: '#ffffff',
    lineHeight: 20,
  },

  // Other message
  otherRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 3,
    gap: Spacing.sm,
  },
  avatarPlaceholder: {
    width: 28,
    height: 28,
  },
  otherContent: {
    maxWidth: '72%',
    gap: 3,
  },
  senderName: {
    fontFamily: Typography.body,
    fontSize: 11,
    color: Colors.dim,
    marginLeft: 4,
  },
  otherBubble: {
    backgroundColor: Colors.raised,
    borderRadius: Radius.lg,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  otherText: {
    fontFamily: Typography.body,
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
});
