import 'react-native-gesture-handler';
import React from 'react';
import { View, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFonts, Syne_800ExtraBold, Syne_700Bold } from '@expo-google-fonts/syne';
import { Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';

import { AuthProvider } from './src/context/AuthContext';
import { ThemeProvider } from './src/context/ThemeContext';
import RootNavigator from './src/navigation';
import { Colors } from './src/theme';

export default function App() {
  const [fontsLoaded] = useFonts({
    Syne_800ExtraBold,
    Syne_700Bold,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  // Hold splash until fonts are ready — avoids FOUT on first render
  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: Colors.text, fontSize: 32, letterSpacing: 8, fontWeight: '800' }}>
          GOODGAME
        </Text>
      </View>
    );
  }

  return (
    <AuthProvider>
      <ThemeProvider>
        <StatusBar style="light" />
        <RootNavigator />
      </ThemeProvider>
    </AuthProvider>
  );
}
