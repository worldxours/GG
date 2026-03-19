// Web fallback — CometChat requires native modules and is unavailable on web.
// Metro picks ChatDetailScreen.native.tsx for iOS/Android; this file is used for web.
import React from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Colors, Spacing, Typography } from '../theme';
import { NmCard, ScreenHeader } from '../components';

type ChatDetailParams = {
  receiverUID: string;
  type: 'user' | 'group';
  name: string;
};

export default function ChatDetailScreen() {
  const route      = useRoute<RouteProp<{ ChatDetail: ChatDetailParams }, 'ChatDetail'>>();
  const navigation = useNavigation();
  const { name }   = route.params;

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title={name} onBack={() => navigation.goBack()} />
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
    gap: 16,
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
