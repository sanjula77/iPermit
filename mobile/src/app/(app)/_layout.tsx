import { Redirect, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { ActivityIndicator } from 'react-native';

import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/context/auth-context';
import { useBrandHeaderOptions } from '@/hooks/use-brand-header';
import { useTheme } from '@/hooks/use-theme';
import { useRegisterPushToken } from '@/hooks/use-register-push-token';

export default function AppLayout() {
  const { user, isLoading } = useAuth();
  useRegisterPushToken(!!user);
  const brandHeader = useBrandHeaderOptions();
  const theme = useTheme();
  // The window colour shows behind the transparent status bar wherever the
  // screen doesn't draw under it (on the phone it was black); the top of every
  // screen here is brand blue, so match it.
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

  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <>
      {/* Every signed-in screen has blue at the top (hero or app bar). */}
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="apply" options={{ ...brandHeader, headerShown: true, title: 'Apply for License' }} />
        <Stack.Screen name="behaviour" options={{ ...brandHeader, headerShown: true, title: 'My behaviour' }} />
        {/* Draws its own top bar (back arrow + title) inside the blue hero. */}
        <Stack.Screen name="police-driver" options={{ headerShown: false, title: 'Driver details' }} />
      </Stack>
    </>
  );
}
