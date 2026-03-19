import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, Typography } from '../theme';
import NmCard from './NmCard';

interface H2HBannerProps {
  myWins: number;
  theirWins: number;
  theirName: string;
}

export default function H2HBanner({ myWins, theirWins, theirName }: H2HBannerProps) {
  const iWin = myWins > theirWins;
  const tied = myWins === theirWins;

  return (
    <NmCard style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.label}>YOU</Text>
        <Text style={[styles.score, iWin && styles.scoreWinning, tied && styles.scoreTied]}>
          {myWins}
        </Text>
        <Text style={styles.dash}> – </Text>
        <Text style={[styles.score, !iWin && !tied && styles.scoreWinning, tied && styles.scoreTied]}>
          {theirWins}
        </Text>
        <Text style={styles.label} numberOfLines={1}>{theirName.toUpperCase()}</Text>
      </View>
    </NmCard>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingVertical: 10,
    paddingHorizontal: Spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  label: {
    fontFamily: Typography.bodyBold,
    fontSize: 11,
    color: Colors.dim,
    letterSpacing: 0.5,
    flexShrink: 1,
  },
  score: {
    fontFamily: Typography.heading,
    fontSize: 20,
    color: Colors.dim,
  },
  scoreWinning: {
    color: Colors.c1,
  },
  scoreTied: {
    color: Colors.text,
  },
  dash: {
    fontFamily: Typography.heading,
    fontSize: 16,
    color: Colors.muted,
  },
});
