import { Redirect, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { ActivityIndicator } from 'react-native';

import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/hooks/use-theme';

export default function AuthLayout() {
  const { user, isLoading } = useAuth();
  const theme = useTheme();
  // Same window colour as the signed-in area (see app/(app)/_layout.tsx).
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(theme.brandDeep).catch(() => {});
  }, [theme.brandDeep]);

  if (isLoading) {
    return (
      <ThemedView style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" />
      </ThemedView>
    );
  }

  if (user) {
    return <Redirect href="/(app)/(tabs)/(home)" />;
  }

  return (
    <>
      {/* The auth screens open on the brand gradient too. */}
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="welcome" />
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
      </Stack>
    </>
  );
}
