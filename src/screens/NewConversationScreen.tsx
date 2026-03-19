import React, { useCallback, useEffect, useState } from 'react';
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

import { Colors, Spacing, Typography } from '../theme';
import { useAuth } from '../context/AuthContext';
import { Avatar, CardDivider, EmptyState, NmCard, ScreenHeader } from '../components';
import { getOtherUsers } from '../lib/userService';

export default function NewConversationScreen() {
  const navigation = useNavigation();
  const { user }   = useAuth();
  const currentUid = user?.uid ?? '';

  const [users, setUsers]         = useState<Array<{ uid: string; displayName: string; avatarEmoji: string | null; avatarUrl: string | null }>>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const result = await getOtherUsers(currentUid);
      setUsers(result);
    } catch (e) {
      console.warn('[NewConversation] load error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentUid]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="NEW CHAT" onBack={() => navigation.goBack()} />

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
          {users.length === 0 ? (
            <EmptyState
              icon="👥"
              title="No other users yet"
              subtitle="Invite friends to join RunIt"
            />
          ) : (
            <NmCard style={styles.listCard}>
              {users.map(({ uid, displayName, avatarEmoji, avatarUrl }, i) => (
                <View key={uid}>
                  {i > 0 && <CardDivider />}
                  <TouchableOpacity
                    style={styles.row}
                    activeOpacity={0.75}
                    onPress={() =>
                      (navigation as any).navigate('ChatDetail', {
                        receiverUID: uid,
                        type: 'user',
                        name: displayName,
                      })
                    }
                  >
                    <Avatar uid={uid} displayName={displayName} size={42} emoji={avatarEmoji} uri={avatarUrl} />
                    <Text style={styles.name}>@{displayName}</Text>
                  </TouchableOpacity>
                </View>
              ))}
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
  name: {
    fontFamily: Typography.bodyBold,
    fontSize: 15,
    color: Colors.text,
  },
});
