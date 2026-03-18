import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Colors, Spacing, Radius, Typography } from '../theme';
import { useAuth } from '../context/AuthContext';

export default function ProfileScreen() {
  const { userDoc, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.name}>{userDoc?.displayName ?? 'Profile'}</Text>
      <Text style={styles.sub}>Phase 6 — Full profile coming soon</Text>

      <TouchableOpacity
        style={styles.logoutBtn}
        onPress={handleSignOut}
        disabled={signingOut}
        activeOpacity={0.8}
      >
        {signingOut
          ? <ActivityIndicator color={Colors.loss} size="small" />
          : <Text style={styles.logoutText}>Log Out</Text>
        }
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  name: {
    fontFamily: Typography.headingBold,
    fontSize: 22,
    color: Colors.text,
    marginBottom: 6,
  },
  sub: {
    fontSize: 13,
    color: Colors.dim,
    marginBottom: Spacing.xxxl,
  },
  logoutBtn: {
    borderWidth: 1,
    borderColor: Colors.loss,
    borderRadius: Radius.md,
    paddingVertical: 12,
    paddingHorizontal: 40,
    alignItems: 'center',
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.loss,
  },
});
