import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../theme';

export default function ChatScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>💬 Chat</Text>
      <Text style={styles.sub}>Phase 5</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center' },
  label: { color: Colors.text, fontSize: 20 },
  sub: { color: Colors.dim, fontSize: 13, marginTop: 4 },
});
