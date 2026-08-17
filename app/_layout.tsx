import {
  PlayfairDisplay_600SemiBold,
  PlayfairDisplay_700Bold,
  useFonts,
} from '@expo-google-fonts/playfair-display';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { LibraryProvider } from '../lib/library';
import { ProfileProvider } from '../lib/profile';
import { colors, fonts } from '../lib/theme';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    PlayfairDisplay_600SemiBold,
    PlayfairDisplay_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) void SplashScreen.hideAsync();
  }, [fontsLoaded]);

  // A talpas címbetűk nélkül a szövegek mérete megugrana, ezért inkább
  // a nyitóképernyőn maradunk, amíg a font be nem töltött.
  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <ProfileProvider>
        <LibraryProvider>
          <Stack
            screenOptions={{
              contentStyle: { backgroundColor: colors.bg },
              headerStyle: { backgroundColor: colors.bg },
              headerTintColor: colors.text,
              headerShadowVisible: false,
              headerTitleStyle: { fontFamily: fonts.displayMedium, fontSize: 19 },
            }}
          >
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen
              name="product/[code]"
              options={{ title: 'Termék', headerBackTitle: 'Vissza' }}
            />
            <Stack.Screen name="note/[code]" options={{ title: 'Saját jegyzet' }} />
            <Stack.Screen name="ingredients/[code]" options={{ title: 'Összetevők beírása' }} />
            <Stack.Screen name="manual" options={{ title: 'Kód beírása' }} />
            <Stack.Screen name="history" options={{ title: 'Listáim' }} />
            <Stack.Screen name="settings" options={{ title: 'Szűrők' }} />
          </Stack>
        </LibraryProvider>
      </ProfileProvider>
    </SafeAreaProvider>
  );
}
