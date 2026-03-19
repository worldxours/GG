import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Spacing, Radius } from '../theme';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Wordmark } from '../components';
import HomeScreen from '../screens/HomeScreen';
import WagersScreen from '../screens/WagersScreen';
import ChatScreen from '../screens/ChatScreen';
import ProfileScreen from '../screens/ProfileScreen';
import NewPostScreen from '../screens/NewPostScreen';
import AuthScreen from '../screens/AuthScreen';
import AdminScreen from '../screens/AdminScreen';
import NewWagerScreen from '../screens/NewWagerScreen';
import ChatDetailScreen from '../screens/ChatDetailScreen';
import NewConversationScreen from '../screens/NewConversationScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import UserProfileScreen from '../screens/UserProfileScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// ── Tab metadata ────────────────────────────────────────────────────────────
const TAB_CONFIG: Record<string, { icon: string; label: string }> = {
  Home:    { icon: '⚡', label: 'HOME' },
  Wagers:  { icon: '📋', label: 'WAGERS' },
  Chat:    { icon: '💬', label: 'CHAT' },
  Profile: { icon: '👤', label: 'PROFILE' },
};

// ── Custom neomorphic bottom nav pill (matches prototype .nm-nav) ────────────
function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { accent } = useTheme();

  return (
    <View style={[styles.navOuter, { paddingBottom: Math.max(insets.bottom, 16) }]}>
      <View style={styles.navPill}>
        {state.routes.map((route, index) => {
          const isActive = state.index === index;

          // FAB — replaces the NewPost tab button
          if (route.name === 'NewPost') {
            return (
              <TouchableOpacity
                key={route.key}
                style={[styles.fab, { backgroundColor: accent, shadowColor: accent }]}
                onPress={() => navigation.navigate(route.name)}
                activeOpacity={0.85}
              >
                <Text style={styles.fabText}>+</Text>
              </TouchableOpacity>
            );
          }

          const cfg = TAB_CONFIG[route.name];
          if (!cfg) return null;

          return (
            <TouchableOpacity
              key={route.key}
              style={[styles.navItem, isActive && styles.navItemActive]}
              onPress={() => navigation.navigate(route.name)}
              activeOpacity={0.7}
            >
              <Text style={[styles.navIcon, !isActive && styles.navIconInactive]}>
                {cfg.icon}
              </Text>
              <Text style={[styles.navLabel, isActive && { color: accent }]}>
                {cfg.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ── Main tab container ───────────────────────────────────────────────────────
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <CustomTabBar {...props} />}
    >
      <Tab.Screen name="Home"    component={HomeScreen} />
      <Tab.Screen name="Wagers"  component={WagersScreen} />
      <Tab.Screen name="NewPost" component={NewPostScreen} />
      <Tab.Screen name="Chat"    component={ChatScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

// ── Root navigator ───────────────────────────────────────────────────────────
export default function RootNavigator() {
  const { user, loading, devMode, needsOnboarding } = useAuth();
  const { accent } = useTheme();
  const isAuthenticated = user !== null || devMode;

  if (loading) {
    return (
      <View style={styles.splash}>
        <Wordmark size={32} letterSpacing={6} />
        <ActivityIndicator color={accent} style={{ marginTop: 24 }} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          // ── Unauthenticated ───────────────────────────────────────────────
          <Stack.Screen name="Auth" component={AuthScreen} />
        ) : needsOnboarding ? (
          // ── Authenticated but onboarding not yet complete ─────────────────
          // username === null means the user is new and hasn't set a handle yet.
          // This screen dismisses itself by calling refreshUserDoc() which flips
          // needsOnboarding to false and triggers a re-render into the main app.
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        ) : (
          // ── Fully authenticated ───────────────────────────────────────────
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen
              name="Admin"
              component={AdminScreen}
              options={{ presentation: 'modal' }}
            />
            <Stack.Screen
              name="NewWager"
              component={NewWagerScreen}
              options={{ presentation: 'modal' }}
            />
            <Stack.Screen name="ChatDetail" component={ChatDetailScreen} />
            <Stack.Screen name="NewConversation" component={NewConversationScreen} />
            <Stack.Screen name="UserProfile" component={UserProfileScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // Splash
  splash: {
    flex: 1,
    backgroundColor: Colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Nav outer wrapper — sits at screen bottom, dark bg fills safe area
  navOuter: {
    backgroundColor: Colors.bg,
    paddingHorizontal: Spacing.lg,   // 20 — matches prototype margin: 0 20px
    paddingTop: 0,
  },

  // Floating pill — matches .nm-nav
  navPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: Colors.raised,
    borderRadius: Radius.nav,        // 26
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 10,
    paddingHorizontal: Spacing.md,   // 16
    shadowColor: Colors.shadowDark,
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 14,
    elevation: 8,
  },

  // Regular nav item — matches .nm-nav-item
  navItem: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    gap: 4,
  },

  // Active nav item — matches .nm-nav-item.active (inset pressed look)
  navItemActive: {
    backgroundColor: Colors.bg,
    borderWidth: 1,
    borderColor: Colors.border,
  },

  navIcon: { fontSize: 16 },
  navIconInactive: { opacity: 0.4 },

  navLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: Colors.muted,
    marginTop: 2,
  },
  // navLabelActive — applied as inline { color: accent } to keep it dynamic

  // FAB — matches .nm-fab (square-ish, NOT a circle)
  // backgroundColor + shadowColor set dynamically via accent
  fab: {
    width: 48,
    height: 48,
    borderRadius: Radius.fab,        // 17
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  fabText: {
    color: Colors.btnText,
    fontSize: 22,
    fontWeight: '300',
    lineHeight: 26,
  },
});
