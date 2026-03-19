import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { CometChat } from '@cometchat/chat-sdk-react-native';

import { Colors, Radius, Spacing, Typography } from '../theme';
import { useAuth } from '../context/AuthContext';
import { NormalizedMessage, ChatBubble, H2HBanner, ScreenHeader } from '../components';
import { getH2H } from '../lib/messageService';

type ChatDetailParams = {
  receiverUID: string;
  type: 'user' | 'group';
  name: string;
};

const LISTENER_ID = 'chat_detail_listener';

// ── Adapter: CometChat TextMessage → NormalizedMessage ────────────────────────
// currentUid is needed as a fallback: some SDK builds don't populate getSender()
// on history messages fetched via fetchPrevious(). When that happens we infer the
// sender from getReceiverId() — if I am NOT the receiver, I must be the sender.
function toNormalized(msg: CometChat.BaseMessage, currentUid: string): NormalizedMessage {
  const text =
    msg instanceof CometChat.TextMessage
      ? msg.getText()
      : '(unsupported message)';

  const senderFromSDK = msg.getSender()?.getUid() ?? '';
  // Fallback: receiver is always reliable — if receiver !== me, I sent this.
  const senderUid = senderFromSDK || (msg.getReceiverId() !== currentUid ? currentUid : '');

  return {
    id: String(msg.getId()),
    text,
    type: 'text',
    senderUid,
    createdAt: msg.getSentAt() * 1000,
  };
}

// ── ChatDetailScreen ──────────────────────────────────────────────────────────

export default function ChatDetailScreen() {
  const route      = useRoute<RouteProp<{ ChatDetail: ChatDetailParams }, 'ChatDetail'>>();
  const navigation = useNavigation();
  const { user, cometChatReady } = useAuth();
  const currentUid: string = user?.uid ?? '';

  const { receiverUID, type, name } = route.params;

  // ── State ──────────────────────────────────────────────────────────────────
  const [messages, setMessages]   = useState<NormalizedMessage[]>([]);
  const [loading, setLoading]     = useState(true);
  const [inputText, setInputText] = useState('');
  const [sending, setSending]     = useState(false);
  const [h2h, setH2H]             = useState<{ myWins: number; theirWins: number; totalWagers: number } | null>(null);

  const flatListRef = useRef<FlatList>(null);

  // ── Fetch message history ─────────────────────────────────────────────────
  const fetchHistory = useCallback(async () => {
    try {
      const request = new CometChat.MessagesRequestBuilder()
        .setUID(type === 'user' ? receiverUID : undefined as any)
        .setGUID(type === 'group' ? receiverUID : undefined as any)
        .setLimit(50)
        .build();
      const history = await request.fetchPrevious();
      setMessages(history.map((m) => toNormalized(m, currentUid)));
    } catch (e) {
      console.warn('[ChatDetail] fetchHistory error:', e);
    } finally {
      setLoading(false);
    }
  }, [receiverUID, type, currentUid]);

  // ── Real-time message listener (only fires once CometChat session is ready) ─
  useEffect(() => {
    // Guard: don't call CometChat APIs until login has completed.
    // cometChatReady flips to true in AuthContext after createUser + login.
    if (!cometChatReady) return;

    fetchHistory();

    CometChat.addMessageListener(
      LISTENER_ID,
      new CometChat.MessageListener({
        onTextMessageReceived: (msg: CometChat.TextMessage) => {
          const convoUid = type === 'user'
            ? msg.getSender()?.getUid()
            : msg.getReceiverId();
          if (convoUid !== receiverUID && msg.getSender()?.getUid() !== receiverUID) return;
          setMessages((prev) => [...prev, toNormalized(msg, currentUid)]);
        },
      }),
    );

    return () => CometChat.removeMessageListener(LISTENER_ID);
  }, [fetchHistory, receiverUID, type, cometChatReady]);

  // ── Load H2H (1:1 chats only) ─────────────────────────────────────────────
  useEffect(() => {
    if (type !== 'user' || !currentUid || !receiverUID) return;
    getH2H(currentUid, receiverUID).then(setH2H).catch(() => {});
  }, [type, currentUid, receiverUID]);

  // ── Auto-scroll to bottom ─────────────────────────────────────────────────
  const scrollToBottom = useCallback(() => {
    if (messages.length > 0) {
      flatListRef.current?.scrollToEnd({ animated: false });
    }
  }, [messages.length]);

  // ── Send message ──────────────────────────────────────────────────────────
  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || sending) return;
    setSending(true);
    setInputText('');
    try {
      const msg = new CometChat.TextMessage(
        receiverUID,
        text,
        type === 'user' ? CometChat.RECEIVER_TYPE.USER : CometChat.RECEIVER_TYPE.GROUP,
      );
      const sent = await CometChat.sendMessage(msg);
      setMessages((prev) => [...prev, toNormalized(sent, currentUid)]);
    } catch (e) {
      console.warn('[ChatDetail] sendMessage error:', e);
    } finally {
      setSending(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title={name} onBack={() => navigation.goBack()} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* ── H2H banner (1:1 only) ── */}
        {h2h && type === 'user' && (
          <View style={styles.h2hWrapper}>
            <H2HBanner
              myWins={h2h.myWins}
              theirWins={h2h.theirWins}
              theirName={name}
            />
          </View>
        )}

        {/* ── Message list ── */}
        {loading ? (
          <ActivityIndicator color={Colors.c1} style={styles.loader} />
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(m) => m.id}
            contentContainerStyle={styles.messageList}
            onContentSizeChange={scrollToBottom}
            onLayout={scrollToBottom}
            renderItem={({ item }) => {
              const isMine = item.senderUid === currentUid;
              return (
                <ChatBubble
                  message={item}
                  isMine={isMine}
                  senderName={isMine ? undefined : name}
                />
              );
            }}
          />
        )}

        {/* ── Input row ── */}
        <View style={styles.inputSection}>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.textInput}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Message…"
              placeholderTextColor={Colors.muted}
              multiline
              returnKeyType="send"
              onSubmitEditing={handleSend}
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!inputText.trim() || sending) && styles.sendBtnDisabled]}
              onPress={handleSend}
              disabled={!inputText.trim() || sending}
              activeOpacity={0.75}
            >
              {sending
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.sendBtnText}>↑</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  flex: {
    flex: 1,
  },
  loader: {
    flex: 1,
  },
  h2hWrapper: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
  },

  // Message list
  messageList: {
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },

  // Input section
  inputSection: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
  },
  textInput: {
    flex: 1,
    backgroundColor: Colors.raised,
    borderRadius: Radius.input,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: Colors.text,
    fontFamily: Typography.body,
    fontSize: 14,
    maxHeight: 100,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.c1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.c1,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 5,
  },
  sendBtnDisabled: {
    backgroundColor: Colors.muted,
    shadowOpacity: 0,
    elevation: 0,
  },
  sendBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 22,
  },
});
