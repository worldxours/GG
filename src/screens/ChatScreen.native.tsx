import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { CometChat } from '@cometchat/chat-sdk-react-native';

import { Colors, Spacing, Typography } from '../theme';
import { useAuth } from '../context/AuthContext';
import {
  Avatar,
  CardDivider,
  EmptyState,
  IconButton,
  NmCard,
  ScreenHeader,
} from '../components';
import { getUserDisplayNames } from '../lib/userService';

// ── Helpers ───────────────────────────────────────────────────────────────────

function relativeTime(sentAt: number): string {
  const diff = Math.floor(Date.now() / 1000) - sentAt;
  if (diff < 60)    return 'now';
  if (diff < 3600)  return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

function conversationName(convo: CometChat.Conversation): string {
  const entity = convo.getConversationWith();
  if (entity instanceof CometChat.User) return entity.getName();
  if (entity instanceof CometChat.Group) return entity.getName();
  return '…';
}

function conversationUid(convo: CometChat.Conversation): string {
  const entity = convo.getConversationWith();
  if (entity instanceof CometChat.User) return entity.getUid();
  if (entity instanceof CometChat.Group) return entity.getGuid();
  return '';
}

function lastMessagePreview(convo: CometChat.Conversation): string {
  const msg = convo.getLastMessage();
  if (!msg) return 'No messages yet';
  if (msg instanceof CometChat.TextMessage) return msg.getText();
  return 'Message';
}

function lastMessageTime(convo: CometChat.Conversation): string {
  const msg = convo.getLastMessage();
  if (!msg) return '';
  return relativeTime(msg.getSentAt());
}

const LISTENER_ID = 'chat_screen_listener';

// ── ChatScreen ────────────────────────────────────────────────────────────────

export default function ChatScreen() {
  const navigation = useNavigation();
  const { user, cometChatReady } = useAuth();
  const currentUid: string = user?.uid ?? '';

  const [conversations, setConversations] = useState<CometChat.Conversation[]>([]);
  // Firestore display names keyed by UID — authoritative source of truth for names.
  // CometChat entity.getName() can be stale if the user updated their Firestore displayName
  // after their CometChat account was first created.
  const [nameMap, setNameMap]             = useState<Map<string, string>>(new Map());
  const [loading, setLoading]             = useState(true);
  const [refreshing, setRefreshing]       = useState(false);

  const fetchConversations = useCallback(async () => {
    try {
      const request = new CometChat.ConversationsRequestBuilder()
        .setLimit(30)
        .build();
      const convos = await request.fetchNext();
      setConversations(convos);

      // Resolve Firestore display names for all conversation partners
      const uids = convos.map((c) => conversationUid(c)).filter(Boolean);
      if (uids.length > 0) {
        const names = await getUserDisplayNames(uids);
        setNameMap(names);
      }
    } catch (e) {
      console.warn('[ChatScreen] fetchConversations error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Guard: don't call CometChat APIs until login has completed.
  useEffect(() => {
    if (!cometChatReady) return;
    fetchConversations();

    // Real-time: update conversation list when new messages arrive
    CometChat.addMessageListener(
      LISTENER_ID,
      new CometChat.MessageListener({
        onTextMessageReceived: () => fetchConversations(),
      }),
    );

    return () => CometChat.removeMessageListener(LISTENER_ID);
  }, [fetchConversations]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchConversations();
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader
        title="CHATS"
        onBack={null}
        rightElement={
          <IconButton
            icon="✏️"
            onPress={() => (navigation as any).navigate('NewConversation')}
          />
        }
      />

      {loading ? (
        <ActivityIndicator color={Colors.c1} style={styles.loader} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.c1}
            />
          }
        >
          {conversations.length === 0 ? (
            <EmptyState
              icon="💬"
              title="No conversations yet"
              subtitle="Tap the pencil icon to start chatting"
            />
          ) : (
            <NmCard style={styles.listCard}>
              {conversations.map((convo, i) => {
                const uid     = conversationUid(convo);
                // Prefer Firestore name (always current); fall back to CometChat name
                const name    = nameMap.get(uid) ?? conversationName(convo);
                const preview = lastMessagePreview(convo);
                const time    = lastMessageTime(convo);
                const unread  = convo.getUnreadMessageCount();
                const type    = convo.getConversationType() as 'user' | 'group';

                return (
                  <View key={convo.getConversationId()}>
                    {i > 0 && <CardDivider />}
                    <TouchableOpacity
                      style={styles.row}
                      activeOpacity={0.75}
                      onPress={() =>
                        (navigation as any).navigate('ChatDetail', {
                          receiverUID: uid,
                          type,
                          name,
                        })
                      }
                    >
                      <Avatar uid={uid} displayName={name} size={42} />

                      <View style={styles.rowCenter}>
                        <Text style={styles.convoName} numberOfLines={1}>
                          {name}
                        </Text>
                        <Text style={styles.preview} numberOfLines={1}>
                          {preview}
                        </Text>
                      </View>

                      <View style={styles.rowRight}>
                        <Text style={styles.time}>{time}</Text>
                        {unread > 0 && (
                          <View style={styles.unreadBadge}>
                            <Text style={styles.unreadText}>
                              {unread > 99 ? '99+' : unread}
                            </Text>
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </NmCard>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  loader: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  listCard: {
    paddingHorizontal: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    gap: Spacing.md,
  },
  rowCenter: {
    flex: 1,
    gap: 4,
  },
  convoName: {
    fontFamily: Typography.bodyBold,
    fontSize: 14,
    color: Colors.text,
  },
  preview: {
    fontFamily: Typography.body,
    fontSize: 12,
    color: Colors.dim,
  },
  rowRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  time: {
    fontFamily: Typography.body,
    fontSize: 11,
    color: Colors.muted,
  },
  unreadBadge: {
    backgroundColor: Colors.c1,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  unreadText: {
    fontFamily: Typography.bodyBold,
    fontSize: 10,
    color: '#ffffff',
  },
});
