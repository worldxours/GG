import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';

import { Colors, Spacing } from '../theme';
import { useAuth } from '../context/AuthContext';
import { Wordmark, IconButton, Avatar, EmptyState, PostCard } from '../components';
import { PostWithId, getFeedPosts } from '../lib/postService';
import { getUserDisplayNames } from '../lib/userService';
import { acceptWager, declineWager } from '../lib/wagerService';

const TAP_WINDOW = 700;

export default function HomeScreen() {
  const navigation = useNavigation();
  const { user, userDoc } = useAuth();

  const [posts, setPosts]           = useState<PostWithId[]>([]);
  const [nameMap, setNameMap]       = useState<Map<string, string>>(new Map());
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const tapCount = useRef(0);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const handleWordmarkTap = () => {
    tapCount.current += 1;
    clearTimeout(tapTimer.current);
    if (tapCount.current >= 3) {
      tapCount.current = 0;
      (navigation as any).navigate('Admin');
      return;
    }
    tapTimer.current = setTimeout(() => { tapCount.current = 0; }, TAP_WINDOW);
  };

  const loadFeed = useCallback(async () => {
    try {
      const rows = await getFeedPosts(50);
      const uids = rows.flatMap((p) => [
        p.data.userId,
        ...(p.data.opponentId ? [p.data.opponentId] : []),
      ]);
      const map = await getUserDisplayNames(uids);
      setPosts(rows);
      setNameMap(map);
    } catch (e) {
      console.error('HomeScreen: loadFeed error', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadFeed(); }, [loadFeed]);

  // Reload whenever the screen comes into focus — ensures new posts and
  // wager status changes (accept/decline) are reflected immediately.
  useFocusEffect(useCallback(() => { loadFeed(); }, [loadFeed]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadFeed();
  }, [loadFeed]);

  const currentUid = user?.uid ?? '';

  // ── Wager accept / decline from feed ──────────────────────────────────────
  const handleAccept = useCallback(async (wagerId: string) => {
    if (!currentUid) return;
    try {
      await acceptWager(wagerId, currentUid);
      await loadFeed();
    } catch (e) {
      console.error('HomeScreen: acceptWager error', e);
    }
  }, [currentUid, loadFeed]);

  const handleDecline = useCallback(async (wagerId: string) => {
    if (!currentUid) return;
    try {
      await declineWager(wagerId, currentUid);
      await loadFeed();
    } catch (e) {
      console.error('HomeScreen: declineWager error', e);
    }
  }, [currentUid, loadFeed]);

  const handlePressAuthor = useCallback((uid: string) => {
    (navigation as any).navigate('UserProfile', { uid });
  }, [navigation]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleWordmarkTap} activeOpacity={0.9}>
          <Wordmark size={24} letterSpacing={2} />
        </TouchableOpacity>
        <View style={styles.headerRight}>
          <IconButton
            icon="🔍"
            showPip={false}
            onPress={() => (navigation as any).navigate('Search')}
            accessibilityLabel="Find people"
          />
          <IconButton icon="🔔" showPip={false} accessibilityLabel="Notifications" />
          {currentUid ? (
            <Avatar uid={currentUid} displayName={userDoc?.displayName ?? ''} size={38} />
          ) : (
            <View style={styles.avatarPlaceholder} />
          )}
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.c1}
          />
        }
      >
        {loading ? (
          <ActivityIndicator color={Colors.c1} style={styles.loader} />
        ) : posts.length === 0 ? (
          <View style={styles.emptyWrap}>
            <EmptyState
              icon="⚡"
              title="Feed is empty"
              subtitle="Create a wager or post something to get started"
            />
          </View>
        ) : (
          <View style={styles.feed}>
            {posts.map((post) => {
              const authorName = nameMap.get(post.data.userId)
                ?? post.data.userId.slice(-6);
              const opponentName = post.data.opponentId
                ? (nameMap.get(post.data.opponentId) ?? post.data.opponentId.slice(-6))
                : undefined;

              // Show Accept/Decline only when this is a pending challenge to the
              // current user (viewer is the opponent, not the creator).
              const isChallengeToMe =
                post.data.type === 'wager-challenge' &&
                post.data.opponentId === currentUid &&
                post.data.wagerId !== null;

              return (
                <PostCard
                  key={post.id}
                  post={post}
                  authorName={authorName}
                  opponentName={opponentName}
                  style={styles.postCard}
                  onPressAuthor={handlePressAuthor}
                  onPressOpponent={post.data.opponentId ? handlePressAuthor : undefined}
                  onAccept={isChallengeToMe ? handleAccept : undefined}
                  onDecline={isChallengeToMe ? handleDecline : undefined}
                />
              );
            })}
          </View>
        )}
        <View style={{ height: Spacing.xxxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: Colors.bg },
  scroll:        { flex: 1 },
  scrollContent: { paddingBottom: Spacing.xl },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerRight:      { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatarPlaceholder: { width: 38, height: 38 },
  loader:    { paddingVertical: 60 },
  emptyWrap: { paddingTop: 60 },
  feed:      { paddingTop: Spacing.sm },
  postCard:  { marginHorizontal: Spacing.lg, marginBottom: Spacing.md },
});
