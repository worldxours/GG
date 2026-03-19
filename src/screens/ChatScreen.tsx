// Web fallback — CometChat requires native modules and is unavailable on web.
// Metro picks ChatScreen.native.tsx for iOS/Android; this file is used for web.
import React from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Colors, Spacing, Typography } from '../theme';
import { IconButton, NmCard, ScreenHeader } from '../components';

export default function ChatScreen() {
  const navigation = useNavigation();

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
      <View style={styles.content}>
        <NmCard style={styles.card}>
          <Text style={styles.icon}>💬</Text>
          <Text style={styles.title}>Chat on mobile</Text>
          <Text style={styles.subtitle}>
            Real-time messaging is available in the RunIt mobile app.
          </Text>
        </NmCard>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    alignItems: 'center',
  },
  card: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    gap: Spacing.md,
  },
  icon: {
    fontSize: 48,
  },
  title: {
    fontFamily: Typography.headingBold,
    fontSize: 20,
    color: Colors.text,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: Typography.body,
    fontSize: 14,
    color: Colors.dim,
    textAlign: 'center',
    lineHeight: 20,
  },
});
